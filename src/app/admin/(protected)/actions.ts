"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { destroySession, requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isIsoDate, isValidTimezone, localDate } from "@/lib/dates";
import { log } from "@/lib/logger";
import { maskEmail } from "@/lib/urls";
import { createEmailProvider } from "@/services/email";
import { resumeNewsletter, runNewsletter, sendTest } from "@/services/newsletter/sender";

/** Toutes les actions vérifient la session : la protection ne repose pas que sur l'interface. */

function back(path: string, key: "ok" | "error", code: string): never {
  const url = new URL(path, "http://x");
  url.searchParams.set(key, code);
  redirect(`${url.pathname}${url.search}`);
}

function safeReturn(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/admin") && !v.startsWith("//") ? v : fallback;
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export async function sendTestAction(formData: FormData) {
  await requireAdmin();
  const returnTo = safeReturn(formData.get("returnTo"), "/admin/newsletter");
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) back(returnTo, "error", "invalid-email");

  const settings = await getSettings();
  const rawDate = String(formData.get("date") ?? "");
  const date = isIsoDate(rawDate) ? rawDate : localDate(new Date(), settings.timezone);

  try {
    await sendTest(email.data, date);
  } catch (err) {
    await log("error", `Échec de l'envoi test à ${maskEmail(email.data)} : ${(err as Error).message}`);
    back(returnTo, "error", "test-failed");
  }
  back(returnTo, "ok", "test-sent");
}

/** « Envoyer maintenant » : même protection anti-doublon que l'envoi automatique. */
export async function sendNowAction(formData: FormData) {
  await requireAdmin();
  if (formData.get("confirm") !== "yes") back("/admin", "error", "confirm-required");
  const settings = await getSettings();
  const today = localDate(new Date(), settings.timezone);
  const outcome = await runNewsletter(today, "manual", Date.now() + env().SEND_TIME_BUDGET_MS, {
    ignoreRetryDelay: true,
  });
  revalidatePath("/admin");
  back("/admin", outcome.status === "failed" ? "error" : "ok", `send-${outcome.status}`);
}

export async function resumeAction(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) back("/admin/history", "error", "invalid");
  if (formData.get("confirm") !== "yes") back(`/admin/history/${id.data}`, "error", "confirm-required");
  const outcome = await resumeNewsletter(id.data, Date.now() + env().SEND_TIME_BUDGET_MS);
  back(`/admin/history/${id.data}`, outcome.status === "failed" ? "error" : "ok", `send-${outcome.status}`);
}

const scheduleSchema = z.object({
  autoSendEnabled: z.boolean(),
  sendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().refine(isValidTimezone),
  frequency: z.literal("daily"),
});

export async function saveScheduleAction(formData: FormData) {
  await requireAdmin();
  const returnTo = safeReturn(formData.get("returnTo"), "/admin/schedule");
  const parsed = scheduleSchema.safeParse({
    autoSendEnabled: formData.get("autoSendEnabled") === "on",
    sendTime: formData.get("sendTime"),
    timezone: formData.get("timezone"),
    frequency: formData.get("frequency") ?? "daily",
  });
  if (!parsed.success) back(returnTo, "error", "invalid-schedule");
  await prisma.settings.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } });
  await log(
    "info",
    `Programmation modifiée : ${parsed.data.autoSendEnabled ? "activée" : "désactivée"}, ${parsed.data.sendTime} (${parsed.data.timezone})`,
  );
  back(returnTo, "ok", "saved");
}

const senderSchema = z.object({
  fromEmail: z.union([z.literal(""), z.string().trim().toLowerCase().pipe(z.email())]),
  fromName: z.string().trim().max(100),
});

export async function saveSenderAction(formData: FormData) {
  await requireAdmin();
  const parsed = senderSchema.safeParse({
    fromEmail: formData.get("fromEmail") ?? "",
    fromName: formData.get("fromName") ?? "",
  });
  if (!parsed.success) back("/admin/settings", "error", "invalid-sender");
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { fromEmail: parsed.data.fromEmail || null, fromName: parsed.data.fromName || null },
    create: { id: 1, fromEmail: parsed.data.fromEmail || null, fromName: parsed.data.fromName || null },
  });
  back("/admin/settings", "ok", "saved");
}

export async function verifySmtpAction() {
  await requireAdmin();
  let ok = true;
  try {
    const provider = createEmailProvider();
    try {
      await provider.verify();
    } finally {
      await provider.close();
    }
  } catch (err) {
    ok = false;
    await log("error", `Test de connexion SMTP échoué : ${(err as Error).message}`);
  }
  back("/admin/settings", ok ? "ok" : "error", ok ? "smtp-ok" : "smtp-failed");
}

const subscriberAction = z.object({
  id: z.uuid(),
  op: z.enum(["block", "unblock", "delete"]),
});

export async function subscriberAdminAction(formData: FormData) {
  await requireAdmin();
  const returnTo = safeReturn(formData.get("returnTo"), "/admin/subscribers");
  const parsed = subscriberAction.safeParse({ id: formData.get("id"), op: formData.get("op") });
  if (!parsed.success) back(returnTo, "error", "invalid");
  const { id, op } = parsed.data;

  if (op === "delete") {
    await prisma.subscriber.delete({ where: { id } }).catch(() => null);
    await log("info", "Abonné supprimé par l'administrateur (effacement des données)");
    back(returnTo, "ok", "deleted");
  }

  const sub = await prisma.subscriber.findUnique({ where: { id } });
  if (!sub) back(returnTo, "error", "invalid");

  if (op === "block") {
    await prisma.$transaction([
      prisma.subscriber.update({ where: { id }, data: { status: "blocked" } }),
      prisma.consentEvent.create({ data: { subscriberId: id, action: "admin_block" } }),
    ]);
  } else if (sub.status === "blocked") {
    // Un abonné débloqué ne redevient actif que s'il avait confirmé son inscription.
    const status = sub.unsubscribedAt ? "unsubscribed" : sub.confirmedAt ? "active" : "pending";
    await prisma.$transaction([
      prisma.subscriber.update({ where: { id }, data: { status } }),
      prisma.consentEvent.create({ data: { subscriberId: id, action: "admin_unblock" } }),
    ]);
  }
  back(returnTo, "ok", "saved");
}
