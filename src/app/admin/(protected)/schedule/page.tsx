import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/dates";
import { nextScheduledSend } from "@/services/newsletter/scheduler";
import { Flash } from "@/components/Flash";
import { ScheduleForm } from "@/components/ScheduleForm";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const flash = await searchParams;
  const settings = await getSettings();
  const [next, logs] = await Promise.all([
    nextScheduledSend(settings),
    prisma.logEntry.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return (
    <>
      <h1>Programmation</h1>
      <Flash {...flash} />
      <div className="card">
        <p>
          Prochain envoi : <strong>{next ? formatDateTime(next, settings.timezone) : "désactivé"}</strong>
        </p>
        <ScheduleForm settings={settings} returnTo="/admin/schedule" />
      </div>

      <div className="card">
        <h2>Fonctionnement</h2>
        <ul className="hint">
          <li>
            La tâche planifiée de l&apos;hébergement appelle <code>/api/cron/tick</code> toutes les 1 à 5 minutes.
            L&apos;envoi part dès que l&apos;heure programmée est atteinte.
          </li>
          <li>Une seule newsletter par date : si elle a déjà été envoyée, rien ne se passe.</li>
          <li>
            Si SanctiMaps est indisponible, jusqu&apos;à {env().MAX_AUTO_ATTEMPTS} tentatives espacées de 15 minutes
            (aucun e-mail n&apos;est encore parti). Au-delà, ou en cas d&apos;erreur SMTP pendant l&apos;envoi,
            une reprise manuelle est nécessaire.
          </li>
          <li>
            Passé {env().SEND_WINDOW_HOURS} h après l&apos;heure prévue, l&apos;envoi automatique du jour
            n&apos;est plus déclenché.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Journal</h2>
        <div className="table-wrap log">
          <table className="data">
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(l.createdAt, settings.timezone)}</td>
                  <td className={l.level}>{l.message}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td className="hint">Aucun événement.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
