import "server-only";
import { Prisma, type Newsletter } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { getSettings, senderFrom } from "@/lib/settings";
import { newsletterKey } from "@/lib/dates";
import { maskEmail, urls } from "@/lib/urls";
import { createEmailProvider, PermanentRecipientError, type EmailProvider } from "@/services/email";
import { personalize } from "@/templates/personalize";
import { createGenerator } from "./factory";

const PREPARE_LOCK_MS = 2 * 60_000;
const RETRY_DELAY_MS = 15 * 60_000;
/** Au-delà de ce nombre d'erreurs SMTP temporaires consécutives, l'envoi est arrêté. */
const MAX_CONSECUTIVE_TRANSIENT_ERRORS = 5;

export type Trigger = "auto" | "manual";

export type RunOutcome =
  | { status: "already-sent" | "already-running" | "not-ready" | "locked" | "needs-manual-resume" }
  | { status: "sent" | "partial" | "failed" | "retry-scheduled"; newsletterId: string };

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

/**
 * Crée (ou retrouve) la ligne unique de la newsletter d'une date.
 * La contrainte UNIQUE sur `key` garantit qu'il n'existe qu'une newsletter par jour,
 * même si deux processus s'exécutent en même temps.
 */
export async function ensureNewsletter(date: string, trigger: Trigger): Promise<Newsletter> {
  const key = newsletterKey(date);
  const existing = await prisma.newsletter.findUnique({ where: { key } });
  if (existing) return existing;
  try {
    return await prisma.newsletter.create({ data: { key, date, trigger, status: "scheduled" } });
  } catch (err) {
    if (isUniqueViolation(err)) return prisma.newsletter.findUniqueOrThrow({ where: { key } });
    throw err;
  }
}

/**
 * Processus complet pour une date : génération puis envoi.
 * Ne fait RIEN si la newsletter de cette date est déjà envoyée ou en cours.
 */
export async function runNewsletter(
  date: string,
  trigger: Trigger,
  deadline: number,
  opts: { ignoreRetryDelay?: boolean } = {},
): Promise<RunOutcome> {
  const newsletter = await ensureNewsletter(date, trigger);

  if (newsletter.status === "sent") return { status: "already-sent" };
  if (newsletter.status === "sending") return { status: "already-running" };
  if (newsletter.status === "failed") {
    // Pas de nouvel envoi automatique après un échec : reprise manuelle obligatoire.
    return { status: "needs-manual-resume" };
  }
  if (!opts.ignoreRetryDelay && newsletter.nextAttemptAt && newsletter.nextAttemptAt > new Date()) {
    return { status: "not-ready" };
  }

  const prepared = await prepare(newsletter.id, trigger);
  if (prepared.status !== "ready") return prepared.outcome;
  return processSending(newsletter.id, deadline);
}

type PrepareResult = { status: "ready" } | { status: "stop"; outcome: RunOutcome };

/** Étapes 2 à 6 : saint du jour, vérification, génération, destinataires. */
async function prepare(newsletterId: string, trigger: Trigger): Promise<PrepareResult> {
  const now = new Date();
  // Verrou de préparation : un seul processus à la fois.
  const claimed = await prisma.newsletter.updateMany({
    where: {
      id: newsletterId,
      status: { in: ["draft", "scheduled"] },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: { lockedUntil: new Date(now.getTime() + PREPARE_LOCK_MS), attempts: { increment: 1 }, trigger },
  });
  if (claimed.count === 0) return { status: "stop", outcome: { status: "locked" } };

  const nl = await prisma.newsletter.findUniqueOrThrow({ where: { id: newsletterId } });
  if (trigger === "auto") await log("info", "Scheduler démarré", { newsletterId });
  await log("info", `Préparation de ${nl.key} (tentative ${nl.attempts}, ${trigger})`, { newsletterId });

  try {
    const generated = await createGenerator().generate(nl.date);
    await log("info", `Saint récupéré : ${generated.saints.map((s) => s.name).join(", ")}`, { newsletterId });
    await log("info", "Newsletter générée", { newsletterId, context: { subject: generated.subject } });

    const recipients = await prisma.subscriber.count({ where: { status: "active" } });
    await log("info", `${recipients} destinataire(s) trouvé(s)`, { newsletterId });

    // Passage à « sending » uniquement depuis draft/scheduled : protège contre un double envoi.
    const started = await prisma.newsletter.updateMany({
      where: { id: newsletterId, status: { in: ["draft", "scheduled"] } },
      data: {
        status: "sending",
        subject: generated.subject,
        html: generated.html,
        text: generated.text,
        saints: generated.saints as unknown as Prisma.InputJsonValue,
        totalRecipients: recipients,
        startedAt: new Date(),
        nextAttemptAt: null,
        lastError: null,
        lockedUntil: null,
      },
    });
    if (started.count === 0) return { status: "stop", outcome: { status: "already-running" } };
    await log("info", "Envoi commencé", { newsletterId });
    return { status: "ready" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const giveUp = trigger === "manual" || nl.attempts >= env().MAX_AUTO_ATTEMPTS;
    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: giveUp
        ? { status: "failed", lastError: message, lockedUntil: null, finishedAt: new Date() }
        : {
            status: "scheduled",
            lastError: message,
            lockedUntil: null,
            nextAttemptAt: new Date(Date.now() + RETRY_DELAY_MS),
          },
    });
    // Aucun e-mail n'a été envoyé à ce stade : une nouvelle tentative différée est sans risque.
    await log(
      "error",
      giveUp
        ? `Échec de la préparation : ${message}. Envoi abandonné, reprise manuelle requise.`
        : `Échec de la préparation : ${message}. Nouvelle tentative dans ${RETRY_DELAY_MS / 60_000} min.`,
      { newsletterId },
    );
    return {
      status: "stop",
      outcome: { status: giveUp ? "failed" : "retry-scheduled", newsletterId },
    };
  }
}

/**
 * Étape 7 : envoi progressif par lots.
 * - Les abonnés sont lus par lots (jamais toute la liste en mémoire).
 * - Chaque destinataire reçoit une ligne Delivery UNIQUE (newsletter, abonné) créée
 *   AVANT l'envoi : impossible d'envoyer deux fois le même e-mail, même après un crash.
 * - Si le temps imparti est écoulé, l'envoi reprend au prochain passage du scheduler.
 */
export async function processSending(newsletterId: string, deadline: number): Promise<RunOutcome> {
  const e = env();
  const now = new Date();
  const lease = () => new Date(Math.max(deadline, Date.now()) + 60_000);

  const claimed = await prisma.newsletter.updateMany({
    where: {
      id: newsletterId,
      status: "sending",
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: { lockedUntil: lease() },
  });
  if (claimed.count === 0) return { status: "locked" };

  const nl = await prisma.newsletter.findUniqueOrThrow({ where: { id: newsletterId } });
  if (!nl.html || !nl.text || !nl.subject) {
    await fail(newsletterId, "Contenu de la newsletter manquant");
    return { status: "failed", newsletterId };
  }

  let provider: EmailProvider | null = null;
  try {
    provider = createEmailProvider();
    const from = senderFrom(await getSettings());
    let consecutiveTransient = 0;

    while (Date.now() < deadline) {
      const batch = await prisma.subscriber.findMany({
        where: { status: "active", deliveries: { none: { newsletterId } } },
        orderBy: { id: "asc" },
        take: e.SEND_BATCH_SIZE,
        select: { id: true, email: true, firstName: true, unsubscribeToken: true },
      });

      if (batch.length === 0) {
        return await finish(newsletterId);
      }

      let sent = 0;
      let failed = 0;
      const results = await Promise.all(
        batch.map(async (sub) => {
          // Réservation : si la ligne existe déjà, ce destinataire est déjà traité.
          try {
            await prisma.delivery.create({ data: { newsletterId, subscriberId: sub.id, status: "sending" } });
          } catch (err) {
            if (isUniqueViolation(err)) return "skipped" as const;
            throw err;
          }
          const recipient = { firstName: sub.firstName, unsubscribeUrl: urls.unsubscribePage(sub.unsubscribeToken) };
          try {
            const res = await provider!.send({
              to: sub.email,
              from,
              subject: nl.subject!,
              html: personalize(nl.html!, recipient, "html"),
              text: personalize(nl.text!, recipient, "text"),
              headers: {
                "List-Unsubscribe": `<${urls.unsubscribeOneClick(sub.unsubscribeToken)}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                "X-Newsletter-Id": nl.key,
              },
            });
            await prisma.delivery.update({
              where: { newsletterId_subscriberId: { newsletterId, subscriberId: sub.id } },
              data: { status: "sent", messageId: res.messageId },
            });
            return "sent" as const;
          } catch (err) {
            const permanent = err instanceof PermanentRecipientError;
            await prisma.delivery.update({
              where: { newsletterId_subscriberId: { newsletterId, subscriberId: sub.id } },
              data: {
                status: "failed",
                retryable: !permanent,
                error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
              },
            });
            return permanent ? ("permanent" as const) : ("transient" as const);
          }
        }),
      );

      for (const r of results) {
        if (r === "sent") {
          sent++;
          consecutiveTransient = 0;
        } else if (r === "permanent") {
          failed++;
        } else if (r === "transient") {
          failed++;
          consecutiveTransient++;
        }
      }

      await prisma.newsletter.update({
        where: { id: newsletterId },
        data: { sentCount: { increment: sent }, failedCount: { increment: failed }, lockedUntil: lease() },
      });
      if (sent || failed) {
        await log("info", `Lot traité : ${sent} envoyé(s), ${failed} échec(s)`, { newsletterId });
      }

      if (consecutiveTransient >= MAX_CONSECUTIVE_TRANSIENT_ERRORS) {
        await fail(newsletterId, "Erreur SMTP : trop d'échecs consécutifs, envoi interrompu");
        return { status: "failed", newsletterId };
      }

      if (e.SEND_BATCH_DELAY_MS > 0) await new Promise((r) => setTimeout(r, e.SEND_BATCH_DELAY_MS));
    }

    // Temps imparti écoulé : on libère le verrou, le scheduler reprendra.
    await prisma.newsletter.update({ where: { id: newsletterId }, data: { lockedUntil: null } });
    await log("info", "Envoi en pause (temps imparti écoulé), reprise au prochain passage", { newsletterId });
    return { status: "partial", newsletterId };
  } catch (err) {
    await fail(newsletterId, `Erreur pendant l'envoi : ${err instanceof Error ? err.message : String(err)}`);
    return { status: "failed", newsletterId };
  } finally {
    await provider?.close();
  }
}

async function finish(newsletterId: string): Promise<RunOutcome> {
  const [sent, failed, uncertain] = await Promise.all([
    prisma.delivery.count({ where: { newsletterId, status: "sent" } }),
    prisma.delivery.count({ where: { newsletterId, status: "failed" } }),
    prisma.delivery.count({ where: { newsletterId, status: "sending" } }),
  ]);
  const status = sent === 0 && failed > 0 ? "failed" : "sent";
  await prisma.newsletter.update({
    where: { id: newsletterId },
    data: {
      status,
      sentCount: sent,
      failedCount: failed,
      totalRecipients: sent + failed + uncertain,
      finishedAt: new Date(),
      lockedUntil: null,
      lastError: status === "failed" ? "Aucun e-mail n'a pu être envoyé" : null,
    },
  });
  await log(
    status === "sent" ? "info" : "error",
    `Envoi terminé : ${sent} envoyé(s), ${failed} échec(s)${uncertain ? `, ${uncertain} statut inconnu (non renvoyés)` : ""}`,
    { newsletterId },
  );
  return { status, newsletterId };
}

async function fail(newsletterId: string, message: string): Promise<void> {
  await prisma.newsletter.update({
    where: { id: newsletterId },
    data: { status: "failed", lastError: message, lockedUntil: null, finishedAt: new Date() },
  });
  await log("error", `${message}. Aucun nouvel envoi automatique : reprise manuelle requise.`, { newsletterId });
}

/**
 * Reprise manuelle (administrateur) d'une newsletter en échec.
 * - Échec pendant la préparation : on relance la préparation.
 * - Échec pendant l'envoi : seuls les destinataires jamais atteints ou en échec
 *   temporaire sont traités ; ceux déjà servis ne reçoivent rien de plus.
 */
export async function resumeNewsletter(newsletterId: string, deadline: number): Promise<RunOutcome> {
  const nl = await prisma.newsletter.findUniqueOrThrow({ where: { id: newsletterId } });
  if (nl.status === "sent") return { status: "already-sent" };

  const staleSending = nl.status === "sending" && (!nl.lockedUntil || nl.lockedUntil < new Date());
  if (nl.status === "sending" && !staleSending) return { status: "already-running" };

  if (nl.status === "failed" && !nl.html) {
    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: { status: "scheduled", lastError: null, finishedAt: null, nextAttemptAt: null },
    });
    await log("warn", "Reprise manuelle : nouvelle préparation", { newsletterId });
    return runNewsletter(nl.date, "manual", deadline, { ignoreRetryDelay: true });
  }

  if (nl.status === "scheduled" || nl.status === "draft") {
    return runNewsletter(nl.date, "manual", deadline, { ignoreRetryDelay: true });
  }

  const { count } = await prisma.delivery.deleteMany({
    where: { newsletterId, status: "failed", retryable: true },
  });
  await prisma.newsletter.updateMany({
    where: { id: newsletterId, status: { in: ["failed", "sending"] } },
    data: { status: "sending", lastError: null, finishedAt: null, lockedUntil: null, failedCount: { decrement: count } },
  });
  await log("warn", `Reprise manuelle de l'envoi (${count} échec(s) temporaire(s) à réessayer)`, { newsletterId });
  return processSending(newsletterId, deadline);
}

/** Envoi test : n'utilise PAS la table des newsletters et ne déclenche aucun envoi général. */
export async function sendTest(to: string, date: string): Promise<void> {
  const generated = await createGenerator().generate(date);
  const provider = createEmailProvider();
  try {
    const recipient = { firstName: null, unsubscribeUrl: urls.unsubscribePage("test") };
    await provider.send({
      to,
      from: senderFrom(await getSettings()),
      subject: `[TEST] ${generated.subject}`,
      html: personalize(generated.html, recipient, "html"),
      text: personalize(generated.text, recipient, "text"),
    });
    await log("info", `Envoi test (${date}) à ${maskEmail(to)}`);
  } finally {
    await provider.close();
  }
}
