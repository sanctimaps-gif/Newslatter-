import { sendTestAction } from "@/app/admin/(protected)/actions";

export function TestSendForm({ returnTo, date }: { returnTo: string; date?: string }) {
  return (
    <form action={sendTestAction} className="inline-form">
      <input type="hidden" name="returnTo" value={returnTo} />
      {date && <input type="hidden" name="date" value={date} />}
      <div className="field">
        <label htmlFor="test-email">Adresse de test</label>
        <input id="test-email" name="email" type="email" required placeholder="test@example.com" />
      </div>
      <button className="btn secondary" type="submit">Envoyer un test</button>
    </form>
  );
}
