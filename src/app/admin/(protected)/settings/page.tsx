import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Flash } from "@/components/Flash";
import { ScheduleForm } from "@/components/ScheduleForm";
import { saveSenderAction, verifySmtpAction } from "../actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const flash = await searchParams;
  const settings = await getSettings();
  const e = env();

  return (
    <>
      <h1>Paramètres</h1>
      <Flash {...flash} />

      <div className="card">
        <h2>Envoi automatique</h2>
        <ScheduleForm settings={settings} returnTo="/admin/settings" />
      </div>

      <div className="card">
        <h2>Expéditeur</h2>
        <form action={saveSenderAction}>
          <div className="grid" style={{ marginBottom: 0 }}>
            <div className="field">
              <label htmlFor="fromEmail">Adresse expéditeur</label>
              <input id="fromEmail" name="fromEmail" type="email" defaultValue={settings.fromEmail ?? ""} placeholder={e.SMTP_FROM_EMAIL ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="fromName">Nom expéditeur</label>
              <input id="fromName" name="fromName" type="text" maxLength={100} defaultValue={settings.fromName ?? ""} placeholder={e.SMTP_FROM_NAME} />
            </div>
          </div>
          <p className="hint">Laisser vide pour utiliser SMTP_FROM_EMAIL / SMTP_FROM_NAME. L&apos;adresse doit être autorisée par le serveur SMTP (SPF/DKIM).</p>
          <button className="btn" type="submit">Enregistrer</button>
        </form>
      </div>

      <div className="card">
        <h2>Serveur SMTP</h2>
        <table className="data">
          <tbody>
            <tr><th>Fournisseur</th><td>{e.EMAIL_PROVIDER.toUpperCase()}</td></tr>
            <tr><th>Serveur SMTP</th><td>{e.SMTP_HOST ?? "non configuré"}</td></tr>
            <tr><th>Port SMTP</th><td>{e.SMTP_PORT}</td></tr>
            <tr><th>Connexion sécurisée (TLS)</th><td>{e.SMTP_SECURE === "true" ? "Oui (TLS implicite)" : "STARTTLS si disponible"}</td></tr>
            <tr><th>Utilisateur</th><td>{e.SMTP_USER ? "configuré" : "aucun"}</td></tr>
            <tr><th>Mot de passe</th><td>{e.SMTP_PASSWORD ? "configuré (masqué)" : "aucun"}</td></tr>
            <tr><th>Débit</th><td>{e.SMTP_RATE_PER_SECOND} e-mail(s)/s, lots de {e.SEND_BATCH_SIZE}</td></tr>
          </tbody>
        </table>
        <p className="hint">
          Les identifiants SMTP sont définis uniquement par variables d&apos;environnement côté serveur et ne sont
          jamais affichés ni stockés en base.
        </p>
        <form action={verifySmtpAction}>
          <button className="btn secondary" type="submit">Tester la connexion SMTP</button>
        </form>
      </div>

      <div className="card">
        <h2>Connexion à SanctiMaps</h2>
        <table className="data">
          <tbody>
            <tr><th>Mode</th><td>{e.SANCTIMAPS_MOCK === "true" ? "Données fictives (développement)" : "API SanctiMaps"}</td></tr>
            <tr><th>Endpoint</th><td>{e.SANCTIMAPS_API_URL || "non configuré"}</td></tr>
            <tr><th>Clé API</th><td>{e.SANCTIMAPS_API_KEY ? "configurée (masquée)" : "aucune"}</td></tr>
            <tr><th>Site</th><td>{e.SANCTIMAPS_SITE_URL}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
