import { redirect } from "next/navigation";
import { unsubscribe } from "@/services/subscribers";
import { requestMeta } from "@/lib/request-meta";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Désinscription — Newsletter SanctiMaps" };

const MESSAGES = {
  unsubscribed: { cls: "ok", text: "Vous êtes désinscrit(e). Vous ne recevrez plus la newsletter." },
  deleted: { cls: "ok", text: "Vous êtes désinscrit(e) et toutes vos données ont été supprimées." },
  invalid: { cls: "err", text: "Ce lien de désinscription est invalide." },
  limited: { cls: "err", text: "Trop de tentatives, réessayez dans quelques minutes." },
} as const;

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { token } = await params;
  const { result } = await searchParams;

  async function doUnsubscribe(formData: FormData) {
    "use server";
    const meta = await requestMeta();
    if (!rateLimit(`unsubscribe:${meta.ip}`, 30, 10 * 60_000)) {
      redirect(`/unsubscribe/${encodeURIComponent(token)}?result=limited`);
    }
    const r = await unsubscribe(token, { ...meta, source: "page" }, { deleteData: formData.get("delete") === "on" });
    redirect(`/unsubscribe/${encodeURIComponent(token)}?result=${r}`);
  }

  const msg = result && result in MESSAGES ? MESSAGES[result as keyof typeof MESSAGES] : null;

  return (
    <main className="narrow">
      <div className="card">
        <h1>Se désinscrire</h1>
        {msg ? (
          <div className={`alert ${msg.cls}`}>{msg.text}</div>
        ) : (
          <form action={doUnsubscribe}>
            <p>Vous ne souhaitez plus recevoir « Le saint du jour » de SanctiMaps ?</p>
            <div className="field">
              <label style={{ fontWeight: 400 }}>
                <input type="checkbox" name="delete" /> Supprimer également toutes mes données
              </label>
            </div>
            <button className="btn" type="submit">Confirmer la désinscription</button>
          </form>
        )}
        <p className="hint" style={{ marginTop: 16 }}>
          <a href="https://sanctimaps.fr">Retour sur SanctiMaps</a>
        </p>
      </div>
    </main>
  );
}
