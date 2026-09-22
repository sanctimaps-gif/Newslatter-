import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isIsoDate, localDate } from "@/lib/dates";
import { createGenerator } from "@/services/newsletter/factory";
import { personalize } from "@/templates/personalize";
import { Flash } from "@/components/Flash";
import { TestSendForm } from "@/components/TestSendForm";

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const settings = await getSettings();
  const date = sp.date && isIsoDate(sp.date) ? sp.date : localDate(new Date(), settings.timezone);
  const mobile = sp.view === "mobile";

  let generated: { subject: string; html: string; saints: string[] } | null = null;
  let error: string | null = null;
  try {
    const g = await createGenerator().generate(date);
    const recipient = { firstName: "Marie", unsubscribeUrl: "#desinscription" };
    generated = { subject: g.subject, html: personalize(g.html, recipient, "html"), saints: g.saints.map((s) => s.name) };
  } catch (err) {
    error = (err as Error).message;
  }

  const q = (params: Record<string, string>) => `?${new URLSearchParams({ date, ...params }).toString()}`;

  return (
    <>
      <h1>Newsletter</h1>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="card">
        <form className="inline-form" method="get">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" name="date" type="date" defaultValue={date} />
          </div>
          {mobile && <input type="hidden" name="view" value="mobile" />}
          <button className="btn secondary" type="submit">Générer</button>
        </form>
      </div>

      {error && <div className="alert err">Impossible de générer la newsletter : {error}</div>}

      {generated && (
        <div className="card">
          <p>
            <strong>Objet :</strong> {generated.subject}
          </p>
          <div className="actions" style={{ marginBottom: 16 }}>
            <Link className={`btn ${mobile ? "secondary" : ""}`} href={q({})}>Aperçu</Link>
            <Link className={`btn ${mobile ? "" : "secondary"}`} href={q({ view: "mobile" })}>Version mobile</Link>
            <a className="btn secondary" href={`/admin/newsletter/preview${q({})}`} target="_blank" rel="noreferrer">
              Ouvrir dans un onglet
            </a>
          </div>
          <iframe
            title="Aperçu de la newsletter"
            className={`preview-frame ${mobile ? "mobile" : ""}`}
            sandbox=""
            srcDoc={generated.html}
          />
        </div>
      )}

      <div className="card">
        <h2>Envoyer un test</h2>
        <p className="hint">L&apos;envoi test n&apos;envoie rien aux abonnés et ne compte pas comme l&apos;envoi du jour.</p>
        <TestSendForm returnTo={`/admin/newsletter${q(mobile ? { view: "mobile" } : {})}`} date={date} />
      </div>
    </>
  );
}
