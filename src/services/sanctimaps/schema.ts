import { z } from "zod";
import type { DailySaints, Saint } from "@/lib/types";
import { safeUrl } from "@/lib/escape";

/**
 * Schéma de la réponse attendue de SanctiMaps (voir docs/sanctimaps-endpoint.md).
 * Quelques alias sont acceptés pour s'adapter à la structure existante du site.
 */
const rawSaint = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    summary: z.string().optional(),
    biography: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    url: z.string().optional(),
    feast_type: z.string().optional().nullable(),
  })
  .passthrough();

export const rawResponse = z.object({
  date: z.string(),
  saints: z.array(rawSaint),
});

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function absolute(url: string | null | undefined, base: string): string | undefined {
  if (!url) return undefined;
  try {
    return safeUrl(new URL(url, base).toString()) ?? undefined;
  } catch {
    return undefined;
  }
}

export class InvalidSaintDataError extends Error {}

/** Convertit la réponse brute dans le format interne et vérifie les données. */
export function normalize(input: unknown, expectedDate: string, siteUrl: string): DailySaints {
  const parsed = rawResponse.safeParse(input);
  if (!parsed.success) {
    throw new InvalidSaintDataError(`Réponse SanctiMaps invalide : ${parsed.error.issues[0]?.message}`);
  }
  if (parsed.data.date !== expectedDate) {
    throw new InvalidSaintDataError(
      `Date inattendue : ${parsed.data.date} reçue, ${expectedDate} demandée`,
    );
  }

  const saints: Saint[] = [];
  for (const raw of parsed.data.saints) {
    const name = stripHtml(raw.name ?? raw.title ?? "");
    const url = absolute(raw.url, siteUrl);
    if (!name || !url) continue; // donnée incomplète : ignorée
    saints.push({
      name,
      description: stripHtml(raw.description ?? raw.summary ?? ""),
      biography: raw.biography ? stripHtml(raw.biography) : undefined,
      image: absolute(raw.image ?? raw.image_url, siteUrl),
      url,
      feastType: raw.feast_type ?? undefined,
    });
  }

  if (saints.length === 0) {
    throw new InvalidSaintDataError(`Aucun saint exploitable pour le ${expectedDate}`);
  }
  return { date: expectedDate, saints };
}
