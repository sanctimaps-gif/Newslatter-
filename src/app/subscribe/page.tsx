import { SubscribeForm } from "@/components/SubscribeForm";
import { CONSENT_TEXT } from "@/services/subscribers";

export const metadata = { title: "S'inscrire — Newsletter SanctiMaps" };

export default function SubscribePage() {
  return (
    <main className="narrow">
      <div className="card">
        <h1>Le saint du jour, chaque matin</h1>
        <p>Recevez gratuitement chaque jour la présentation du saint du jour par SanctiMaps.</p>
        <SubscribeForm consentText={CONSENT_TEXT} />
      </div>
    </main>
  );
}
