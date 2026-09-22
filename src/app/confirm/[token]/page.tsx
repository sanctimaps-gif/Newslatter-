import { redirect } from "next/navigation";
import { confirmSubscription } from "@/services/subscribers";
import { requestMeta } from "@/lib/request-meta";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmer l'inscription — Newsletter SanctiMaps" };

const MESSAGES = {
  confirmed: { cls: "ok", text: "Votre inscription est confirmée. À demain matin pour le saint du jour !" },
  already: { cls: "ok", text: "Votre inscription était déjà confirmée." },
  invalid: { cls: "err", text: "Ce lien est invalide ou a expiré. Vous pouvez vous réinscrire depuis SanctiMaps." },
  limited: { cls: "err", text: "Trop de tentatives, réessayez dans quelques minutes." },
} as const;

/**
 * La confirmation se fait par un bouton (POST) et non à l'ouverture du lien :
 * les antivirus et aperçus de messagerie qui visitent les liens ne peuvent
 * donc pas confirmer une inscription à la place de la personne.
 */
export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { token } = await params;
  const { result } = await searchParams;

  async function confirm() {
    "use server";
    const meta = await requestMeta();
    if (!rateLimit(`confirm:${meta.ip}`, 20, 10 * 60_000)) redirect(`/confirm/${encodeURIComponent(token)}?result=limited`);
    const r = await confirmSubscription(token, meta);
    redirect(`/confirm/${encodeURIComponent(token)}?result=${r}`);
  }

  const msg = result && result in MESSAGES ? MESSAGES[result as keyof typeof MESSAGES] : null;

  return (
    <main className="narrow">
      <div className="card">
        <h1>Newsletter SanctiMaps</h1>
        {msg ? (
          <div className={`alert ${msg.cls}`}>{msg.text}</div>
        ) : (
          <form action={confirm}>
            <p>Pour recevoir chaque matin le saint du jour, confirmez votre inscription :</p>
            <button className="btn" type="submit">Confirmer mon inscription</button>
          </form>
        )}
        <p className="hint" style={{ marginTop: 16 }}>
          <a href="https://sanctimaps.fr">Retour sur SanctiMaps</a>
        </p>
      </div>
    </main>
  );
}
