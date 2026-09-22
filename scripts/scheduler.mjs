#!/usr/bin/env node
// Petit worker pour un hébergement sans cron : appelle /api/cron/tick chaque minute.
// Usage : APP_URL=https://newsletter.sanctimaps.fr CRON_SECRET=... npm run scheduler
const url = new URL("/api/cron/tick", process.env.APP_URL ?? "http://localhost:3000");
const secret = process.env.CRON_SECRET;
const intervalMs = Number(process.env.SCHEDULER_INTERVAL_MS ?? 60_000);

if (!secret) {
  console.error("CRON_SECRET est requis");
  process.exit(1);
}

let running = false;
async function run() {
  if (running) return; // jamais deux ticks en parallèle depuis ce worker
  running = true;
  try {
    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
    const body = await res.json().catch(() => ({}));
    console.log(new Date().toISOString(), res.status, JSON.stringify(body.scheduled ?? body));
  } catch (err) {
    console.error(new Date().toISOString(), "tick en erreur :", err.message);
  } finally {
    running = false;
  }
}

run();
setInterval(run, intervalMs);
