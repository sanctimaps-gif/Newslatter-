"use client";

import { useState } from "react";

/** Formulaire d'inscription (page /subscribe, intégrable dans SanctiMaps via iframe). */
export function SubscribeForm({ consentText }: { consentText: string }) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ok" | "error"; message?: string }>({
    status: "idle",
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          first_name: data.get("first_name") || undefined,
          website: data.get("website"),
        }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string; error?: string };
      setState(json.ok ? { status: "ok", message: json.message } : { status: "error", message: json.error });
    } catch {
      setState({ status: "error", message: "Une erreur est survenue, réessayez." });
    }
  }

  if (state.status === "ok") return <div className="alert ok">{state.message}</div>;

  return (
    <form onSubmit={onSubmit}>
      {state.status === "error" && <div className="alert err">{state.message}</div>}
      <div className="field">
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="first_name">Prénom (facultatif)</label>
        <input id="first_name" name="first_name" type="text" maxLength={80} autoComplete="given-name" />
      </div>
      <div style={{ position: "absolute", left: "-10000px" }} aria-hidden="true">
        <label htmlFor="website">Ne pas remplir</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="hint">{consentText}</p>
      <button className="btn" type="submit" disabled={state.status === "loading"}>
        {state.status === "loading" ? "Envoi…" : "Je m'inscris"}
      </button>
      <p className="hint">
        <a href="/confidentialite" target="_blank">Politique de confidentialité</a>
      </p>
    </form>
  );
}
