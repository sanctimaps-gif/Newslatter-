/** Utilitaires de date sans dépendance, basés sur Intl et un fuseau IANA. */

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function parts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Date locale AAAA-MM-JJ dans le fuseau donné. */
export function localDate(now: Date, timeZone: string): string {
  const p = parts(now, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes écoulées depuis minuit dans le fuseau donné. */
export function localMinutes(now: Date, timeZone: string): number {
  const p = parts(now, timeZone);
  return p.hour * 60 + p.minute;
}

export function parseTime(hhmm: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) throw new Error(`Heure invalide : ${hhmm}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Décalage (ms) entre l'heure locale du fuseau et UTC à un instant donné. */
function offsetMs(at: Date, timeZone: string): number {
  const p = parts(at, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Convertit une date + heure locales (fuseau IANA) en instant UTC. */
export function zonedTimeToUtc(isoDate: string, hhmm: string, timeZone: string): Date {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const minutes = parseTime(hhmm);
  const guess = Date.UTC(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60);
  // Deux passes pour gérer correctement les changements d'heure.
  let ts = guess - offsetMs(new Date(guess), timeZone);
  ts = guess - offsetMs(new Date(ts), timeZone);
  return new Date(ts);
}

export function newsletterKey(isoDate: string): string {
  return `newsletter-${isoDate}`;
}

/** Date lisible en français, ex. « mardi 22 septembre 2026 ». */
export function formatFrenchDate(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

export function formatDateTime(date: Date | null | undefined, timeZone: string): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(date);
}
