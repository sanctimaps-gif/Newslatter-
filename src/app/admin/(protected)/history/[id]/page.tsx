import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/dates";
import type { Saint } from "@/lib/types";
import { personalize } from "@/templates/personalize";
import { Flash, StatusBadge } from "@/components/Flash";
import { resumeAction } from "../../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewsletterDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flash = await searchParams;
  if (!UUID.test(id)) notFound();
  const settings = await getSettings();
  const nl = await prisma.newsletter.findUnique({
    where: { id },
    include: { logs: { orderBy: { createdAt: "asc" }, take: 500 } },
  });
  if (!nl) notFound();

  const deliveries = await prisma.delivery.groupBy({
    by: ["status"],
    where: { newsletterId: id },
    _count: { _all: true },
  });
  const count = (s: string) => deliveries.find((d) => d.status === s)?._count._all ?? 0;
  const saints = (nl.saints as Saint[] | null) ?? [];
  const stale = nl.status === "sending" && (!nl.lockedUntil || nl.lockedUntil < new Date());
  const canResume = nl.status === "failed" || stale;

  return (
    <>
      <p><Link href="/admin/history">← Historique</Link></p>
      <h1>{nl.key}</h1>
      <Flash {...flash} />

      <div className="grid">
        <div className="card stat"><div className="label">Statut</div><div className="value"><StatusBadge status={nl.status} /></div></div>
        <div className="card stat"><div className="label">Envoyés</div><div className="value">{count("sent")}</div></div>
        <div className="card stat"><div className="label">Échecs</div><div className="value">{count("failed")}</div></div>
        <div className="card stat"><div className="label">Statut inconnu</div><div className="value">{count("sending")}</div></div>
      </div>

      <div className="card">
        <table className="data">
          <tbody>
            <tr><th>Saint(s)</th><td>{saints.map((s) => s.name).join(", ") || "—"}</td></tr>
            <tr><th>Objet</th><td>{nl.subject ?? "—"}</td></tr>
            <tr><th>Déclenchement</th><td>{nl.trigger === "manual" ? "Manuel" : "Automatique"}</td></tr>
            <tr><th>Tentatives de préparation</th><td>{nl.attempts}</td></tr>
            <tr><th>Début</th><td>{formatDateTime(nl.startedAt, settings.timezone)}</td></tr>
            <tr><th>Fin</th><td>{formatDateTime(nl.finishedAt, settings.timezone)}</td></tr>
            {nl.lastError && <tr><th>Dernière erreur</th><td className="log error">{nl.lastError}</td></tr>}
          </tbody>
        </table>
      </div>

      {canResume && (
        <div className="card">
          <h2>Reprise manuelle</h2>
          <p className="hint">
            Seuls les abonnés qui n&apos;ont pas encore reçu cette newsletter (ou en échec temporaire) seront traités.
            Les destinataires déjà servis ou au statut inconnu ne recevront rien de plus.
          </p>
          <form action={resumeAction} className="actions">
            <input type="hidden" name="id" value={nl.id} />
            <label style={{ fontWeight: 400 }}>
              <input type="checkbox" name="confirm" value="yes" required /> Je confirme la reprise
            </label>
            <button className="btn danger" type="submit">Reprendre l&apos;envoi</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Logs</h2>
        <div className="table-wrap log">
          <table className="data">
            <tbody>
              {nl.logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(l.createdAt, settings.timezone)}</td>
                  <td className={l.level}>{l.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {nl.html && (
        <div className="card">
          <h2>Contenu envoyé</h2>
          <iframe
            title="Newsletter envoyée"
            className="preview-frame"
            sandbox=""
            srcDoc={personalize(nl.html, { firstName: null, unsubscribeUrl: "#desinscription" }, "html")}
          />
        </div>
      )}
    </>
  );
}
