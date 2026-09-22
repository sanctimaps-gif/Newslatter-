import "server-only";
import type { Settings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { getSettings } from "@/lib/settings";
import { addDays, localDate, newsletterKey, zonedTimeToUtc } from "@/lib/dates";
import { processSending, runNewsletter, type RunOutcome } from "./sender";

export interface TickResult {
  now: string;
  resumed: RunOutcome[];
  today: string;
  scheduled: RunOutcome | { status: "disabled" | "before-time" | "window-missed" };
}

/**
 * Point d'entrée du scheduler, appelé régulièrement (toutes les 1 à 5 minutes)
 * par cron / tâche planifiée via /api/cron/tick.
 * L'opération est idempotente : l'appeler plusieurs fois ne crée jamais de doublon.
 */
export async function tick(now = new Date()): Promise<TickResult> {
  const deadline = Date.now() + env().SEND_TIME_BUDGET_MS;
  const settings = await getSettings();
  const today = localDate(now, settings.timezone);

  // 1. Poursuite des envois progressifs interrompus (verrou expiré).
  const resumed: RunOutcome[] = [];
  const inProgress = await prisma.newsletter.findMany({
    where: { status: "sending", OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    select: { id: true },
    orderBy: { date: "asc" },
    take: 3,
  });
  for (const nl of inProgress) {
    if (Date.now() >= deadline) break;
    resumed.push(await processSending(nl.id, deadline));
  }

  // 2. RGPD : suppression des inscriptions jamais confirmées (lien expiré depuis 30 jours).
  await prisma.subscriber.deleteMany({
    where: { status: "pending", confirmedAt: null, confirmTokenExpiry: { lt: new Date(now.getTime() - 30 * 86400_000) } },
  });

  // 3. Newsletter du jour.
  if (!settings.autoSendEnabled) {
    return { now: now.toISOString(), resumed, today, scheduled: { status: "disabled" } };
  }

  const sendAt = zonedTimeToUtc(today, settings.sendTime, settings.timezone);
  if (now < sendAt) {
    return { now: now.toISOString(), resumed, today, scheduled: { status: "before-time" } };
  }

  // Évite d'envoyer « la newsletter du matin » en fin de journée (ex. serveur
  // redémarré le soir) : au-delà de la fenêtre, il faut une action manuelle.
  const windowEnd = new Date(sendAt.getTime() + env().SEND_WINDOW_HOURS * 3600_000);
  if (now > windowEnd) {
    const exists = await prisma.newsletter.findUnique({ where: { key: newsletterKey(today) } });
    if (!exists || exists.status === "scheduled") {
      return { now: now.toISOString(), resumed, today, scheduled: { status: "window-missed" } };
    }
  }

  const scheduled = await runNewsletter(today, "auto", deadline);
  return { now: now.toISOString(), resumed, today, scheduled };
}

/** Prochain envoi automatique prévu (pour le tableau de bord). */
export async function nextScheduledSend(settings: Settings, now = new Date()): Promise<Date | null> {
  if (!settings.autoSendEnabled) return null;
  const today = localDate(now, settings.timezone);
  const todayAt = zonedTimeToUtc(today, settings.sendTime, settings.timezone);
  const todayNl = await prisma.newsletter.findUnique({ where: { key: newsletterKey(today) } });
  const todayDone = todayNl && todayNl.status !== "scheduled" && todayNl.status !== "draft";
  if (now < todayAt && !todayDone) return todayAt;
  return zonedTimeToUtc(addDays(today, 1), settings.sendTime, settings.timezone);
}
