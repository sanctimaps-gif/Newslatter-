import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/dates";
import type { Saint } from "@/lib/types";
import { Flash, StatusBadge } from "@/components/Flash";

const PAGE_SIZE = 30;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const settings = await getSettings();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [newsletters, total] = await Promise.all([
    prisma.newsletter.findMany({
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, date: true, subject: true, saints: true, status: true, sentCount: true,
        failedCount: true, totalRecipients: true, startedAt: true, finishedAt: true, trigger: true,
      },
    }),
    prisma.newsletter.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1>Historique</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Saint</th>
              <th>Objet</th>
              <th>Destinataires</th>
              <th>Statut</th>
              <th>Heure</th>
            </tr>
          </thead>
          <tbody>
            {newsletters.map((n) => {
              const saints = (n.saints as Saint[] | null) ?? [];
              return (
                <tr key={n.id}>
                  <td><Link href={`/admin/history/${n.id}`}>{n.date}</Link></td>
                  <td>{saints.map((s) => s.name).join(", ") || "—"}</td>
                  <td>{n.subject ?? "—"}</td>
                  <td>
                    {n.sentCount.toLocaleString("fr-FR")}
                    {n.totalRecipients ? ` / ${n.totalRecipients.toLocaleString("fr-FR")}` : ""}
                    {n.failedCount ? <span className="hint"> ({n.failedCount} échec(s))</span> : null}
                  </td>
                  <td><StatusBadge status={n.status} /> {n.trigger === "manual" && <span className="hint">manuel</span>}</td>
                  <td>{formatDateTime(n.finishedAt ?? n.startedAt, settings.timezone)}</td>
                </tr>
              );
            })}
            {newsletters.length === 0 && (
              <tr><td colSpan={6} className="hint">Aucune newsletter pour l&apos;instant.</td></tr>
            )}
          </tbody>
        </table>
        <div className="pagination">
          {page > 1 && <a className="btn small secondary" href={`?page=${page - 1}`}>← Précédent</a>}
          <span className="hint">Page {page} / {pages}</span>
          {page < pages && <a className="btn small secondary" href={`?page=${page + 1}`}>Suivant →</a>}
        </div>
      </div>
    </>
  );
}
