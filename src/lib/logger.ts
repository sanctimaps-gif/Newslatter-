import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type Level = "info" | "warn" | "error";

/** Journalise une étape importante en base (visible dans l'admin) et en console. */
export async function log(
  level: Level,
  message: string,
  opts: { newsletterId?: string; context?: Prisma.InputJsonValue } = {},
): Promise<void> {
  const line = `[newsletter] ${level.toUpperCase()} ${message}`;
  if (level === "error") console.error(line, opts.context ?? "");
  else console.log(line);
  try {
    await prisma.logEntry.create({
      data: { level, message, newsletterId: opts.newsletterId, context: opts.context },
    });
  } catch (err) {
    console.error("[newsletter] impossible d'écrire le log", err);
  }
}
