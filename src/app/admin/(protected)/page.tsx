import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDateTime, localDate } from "@/lib/dates";
import { getSaintSource } from "@/services/sanctimaps/client";
import { nextScheduledSend } from "@/services/newsletter/scheduler";
import { Flash, StatusBadge } from "@/components/Flash";
import { TestSendForm } from "@/components/TestSendForm";
import { sendNowAction } from "./actions";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const flash = await searchParams;
  const settings = await getSettings();
  const today = localDate(new Date(), settings.timezone);

  const [saintsResult, next, activeCount, lastNewsletter, todayNewsletter] = await Promise.all([
    getSaintSource()
      .getSaints(today)
      .then((d) => ({ ok: true as const, saints: d.saints, total: d.total ?? d.saints.length }))
      .catch((err: Error) => ({ ok: false as const, error: err.message })),
    nextScheduledSend(settings),
    prisma.subscriber.count({ where: { status: "active" } }),
    prisma.newsletter.findFirst({
      where: { status: { in: ["sent", "failed", "sending"] } },
      orderBy: { date: "desc" },
    }),
    prisma.newsletter.findUnique({ where: { key: `newsletter-${today}` } }),
  ]);

  return (
    <>
      <h1>Tableau de bord</h1>
      <Flash {...flash} />

      <div className="grid">
        <div className="card stat">
          <div className="label">Aujourd&apos;hui</div>
          <div className="value">
            {saintsResult.ok ? saintsResult.saints.slice(0, 3).map((s) => s.name).join(", ") : "Indisponible"}
          </div>
          {saintsResult.ok && saintsResult.total > 3 && (
            <p className="hint">et {saintsResult.total - 3} autre(s) fêté(s) ce jour</p>
          )}
          {!saintsResult.ok && <p className="hint">SanctiMaps : {saintsResult.error}</p>}
        </div>
        <div className="card stat">
          <div className="label">Prochain envoi</div>
          <div className="value">{next ? formatDateTime(next, settings.timezone) : "Désactivé"}</div>
          <p className="hint">
            {settings.autoSendEnabled
              ? `Tous les jours à ${settings.sendTime} (${settings.timezone})`
              : "Envoi automatique désactivé"}
          </p>
        </div>
        <div className="card stat">
          <div className="label">Abonnés actifs</div>
          <div className="value">{activeCount.toLocaleString("fr-FR")}</div>
        </div>
        <div className="card stat">
          <div className="label">Dernier envoi</div>
          <div className="value">
            {lastNewsletter ? <StatusBadge status={lastNewsletter.status} /> : "—"}
          </div>
          {lastNewsletter && (
            <p className="hint">
              <Link href={`/admin/history/${lastNewsletter.id}`}>
                {lastNewsletter.date} — {lastNewsletter.sentCount} envoyé(s)
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Newsletter du jour ({today})</h2>
        <p>
          Statut :{" "}
          {todayNewsletter ? <StatusBadge status={todayNewsletter.status} /> : <span className="hint">pas encore créée</span>}
        </p>
        <div className="actions" style={{ marginBottom: 16 }}>
          <Link className="btn secondary" href="/admin/newsletter">Prévisualiser</Link>
        </div>
        <TestSendForm returnTo="/admin" />
      </div>

      <div className="card">
        <h2>Envoyer maintenant</h2>
        <p className="hint">
          Envoie la newsletter du jour à tous les abonnés actifs. Si elle a déjà été envoyée aujourd&apos;hui,
          rien ne se passe (protection contre les doubles envois).
        </p>
        <form action={sendNowAction} className="actions">
          <label style={{ fontWeight: 400 }}>
            <input type="checkbox" name="confirm" value="yes" required /> Je confirme l&apos;envoi à{" "}
            {activeCount.toLocaleString("fr-FR")} abonné(s)
          </label>
          <button className="btn danger" type="submit">Envoyer maintenant</button>
        </form>
      </div>
    </>
  );
}
