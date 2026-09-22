import type { Prisma, SubscriberStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/dates";
import { Flash, StatusBadge } from "@/components/Flash";
import { subscriberAdminAction } from "../actions";

const PAGE_SIZE = 50;
const STATUSES: SubscriberStatus[] = ["active", "pending", "unsubscribed", "blocked"];

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const settings = await getSettings();
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = STATUSES.includes(sp.status as SubscriberStatus) ? (sp.status as SubscriberStatus) : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.SubscriberWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { email: { contains: q.toLowerCase() } } : {}),
  };

  const [subscribers, total, counts] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.subscriber.count({ where }),
    prisma.subscriber.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (s: SubscriberStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(p) })}`;
  const returnTo = `/admin/subscribers${qs(page)}`;

  return (
    <>
      <h1>Abonnés</h1>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid">
        {STATUSES.map((s) => (
          <div className="card stat" key={s}>
            <div className="label"><StatusBadge status={s} /></div>
            <div className="value">{countOf(s).toLocaleString("fr-FR")}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <form className="inline-form" method="get" style={{ marginBottom: 16 }}>
          <div className="field">
            <label htmlFor="q">Recherche par e-mail</label>
            <input id="q" name="q" type="text" defaultValue={q} />
          </div>
          <div className="field">
            <label htmlFor="status">Statut</label>
            <select id="status" name="status" defaultValue={status ?? ""}>
              <option value="">Tous</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button className="btn secondary" type="submit">Filtrer</button>
        </form>

        <p className="hint">
          Les inscriptions se font uniquement via le formulaire public (double opt-in), afin de conserver la
          preuve du consentement.
        </p>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Prénom</th>
                <th>Statut</th>
                <th>Inscription</th>
                <th>Confirmation</th>
                <th>Désinscription</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td>{s.firstName ?? "—"}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>{formatDateTime(s.subscribedAt, settings.timezone)}</td>
                  <td>{formatDateTime(s.confirmedAt, settings.timezone)}</td>
                  <td>{formatDateTime(s.unsubscribedAt, settings.timezone)}</td>
                  <td>
                    <div className="actions">
                      <form action={subscriberAdminAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        {s.status === "blocked" ? (
                          <button className="btn small secondary" name="op" value="unblock">Débloquer</button>
                        ) : (
                          <button className="btn small secondary" name="op" value="block">Bloquer</button>
                        )}
                      </form>
                      <form action={subscriberAdminAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button className="btn small danger" name="op" value="delete" title="Suppression définitive (RGPD)">
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && (
                <tr><td colSpan={7} className="hint">Aucun abonné.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          {page > 1 && <a className="btn small secondary" href={qs(page - 1)}>← Précédent</a>}
          <span className="hint">Page {page} / {pages} — {total.toLocaleString("fr-FR")} résultat(s)</span>
          {page < pages && <a className="btn small secondary" href={qs(page + 1)}>Suivant →</a>}
        </div>
      </div>
    </>
  );
}
