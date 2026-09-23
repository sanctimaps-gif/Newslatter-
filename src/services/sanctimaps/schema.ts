import { z } from "zod";
import type { DailySaints, Saint } from "@/lib/types";
import { safeUrl } from "@/lib/escape";

/**
 * Schéma de la réponse attendue de SanctiMaps (voir docs/sanctimaps-endpoint.md).
 * Quelques alias sont acceptés pour s'adapter à la structure existante du site.
 */
const rawSaint = z
  .object({
    name: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    biography: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    feast_type: z.string().optional().nullable(),
    life: z.string().optional().nullable(),
    place: z.string().optional().nullable(),
  })
  .passthrough();

/**
 * Deux formes acceptées :
 * - `date` (AAAA-MM-JJ) : réponse d'une API qui connaît l'année ;
 * - `day` (MM-JJ) : fichier statique par jour de l'année, comme ceux que
 *   SanctiMaps publie dans /api/newsletter/<MM-JJ>.json.
 */
export const rawResponse = z
  .object({
    date: z.string().optional(),
    day: z.string().optional(),
    total: z.number().int().nonnegative().optional(),
    day_url: z.string().optional().nullable(),
    saints: z.array(rawSaint),
  })
  .refine((r) => r.date || r.day, { message: "champ « date » ou « day » manquant" });

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
  const received = parsed.data.date ?? parsed.data.day;
  const matches = parsed.data.date
    ? parsed.data.date === expectedDate
    : parsed.data.day === expectedDate.slice(5);
  if (!matches) {
    throw new InvalidSaintDataError(`Date inattendue : ${received} reçue, ${expectedDate} demandée`);
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
      life: raw.life ? stripHtml(raw.life) : undefined,
      place: raw.place ? stripHtml(raw.place) : undefined,
    });
  }

  if (saints.length === 0) {
    throw new InvalidSaintDataError(`Aucun saint exploitable pour le ${expectedDate}`);
  }
  return {
    date: expectedDate,
    saints,
    total: Math.max(parsed.data.total ?? saints.length, saints.length),
    dayUrl: absolute(parsed.data.day_url, siteUrl),
  };
}
