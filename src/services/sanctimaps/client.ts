import "server-only";
import type { DailySaints } from "@/lib/types";
import { env } from "@/lib/env";
import { InvalidSaintDataError, normalize } from "./schema";
import { mockSaints } from "./mock";

/** Source des données « saint du jour ». SanctiMaps reste la source de vérité. */
export interface SaintSource {
  getSaints(date: string): Promise<DailySaints>;
}

/**
 * Connecteur HTTP vers SanctiMaps. Aucun accès direct à ses données.
 *
 * Deux formes d'URL :
 * - avec un marqueur, ex. https://sanctimaps.fr/api/newsletter/{MM-DD}.json
 *   (fichiers statiques par jour ; marqueurs acceptés : {MM-DD}, {date}) ;
 * - sans marqueur : GET {SANCTIMAPS_API_URL}?date=AAAA-MM-JJ.
 * La clé, si elle est définie, est envoyée en Authorization: Bearer.
 */
export function buildRequestUrl(apiUrl: string, date: string): URL {
  if (apiUrl.includes("{MM-DD}") || apiUrl.includes("{date}")) {
    return new URL(apiUrl.replace("{MM-DD}", date.slice(5)).replace("{date}", date));
  }
  const url = new URL(apiUrl);
  url.searchParams.set("date", date);
  return url;
}

export class SanctiMapsHttpSource implements SaintSource {
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string | undefined,
    private readonly siteUrl: string,
    private readonly timeoutMs = 10_000,
    private readonly retries = 2,
  ) {}

  async getSaints(date: string): Promise<DailySaints> {
    const url = buildRequestUrl(this.apiUrl, date);

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "SanctiMaps-Newsletter/1.0",
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          },
          cache: "no-store",
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) {
          lastError = new Error(`SanctiMaps a répondu HTTP ${res.status}`);
          if (res.status >= 400 && res.status < 500) break; // inutile de réessayer
          continue;
        }
        return normalize(await res.json(), date, this.siteUrl);
      } catch (err) {
        lastError = err;
        if (err instanceof InvalidSaintDataError) break;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

export class MockSaintSource implements SaintSource {
  async getSaints(date: string): Promise<DailySaints> {
    return mockSaints(date, env().SANCTIMAPS_SITE_URL);
  }
}

export function getSaintSource(): SaintSource {
  const e = env();
  if (e.SANCTIMAPS_MOCK === "true") return new MockSaintSource();
  if (!e.SANCTIMAPS_API_URL) {
    throw new Error("SANCTIMAPS_API_URL n'est pas configurée (ou activez SANCTIMAPS_MOCK=true en développement).");
  }
  return new SanctiMapsHttpSource(e.SANCTIMAPS_API_URL, e.SANCTIMAPS_API_KEY, e.SANCTIMAPS_SITE_URL);
}
