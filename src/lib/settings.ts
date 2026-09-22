import "server-only";
import type { Settings } from "@prisma/client";
import { prisma } from "./prisma";
import { env } from "./env";

export async function getSettings(): Promise<Settings> {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/** Expéditeur effectif : valeur de /admin/settings, sinon variables SMTP_FROM_*. */
export function senderFrom(settings: Settings): { email: string; name: string } {
  const email = settings.fromEmail || env().SMTP_FROM_EMAIL;
  if (!email) throw new Error("Aucune adresse expéditeur configurée (SMTP_FROM_EMAIL).");
  return { email, name: settings.fromName || env().SMTP_FROM_NAME };
}
