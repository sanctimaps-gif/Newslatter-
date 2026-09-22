import { escapeHtml } from "@/lib/escape";
import { PLACEHOLDERS } from "./theme";

export interface Recipient {
  firstName?: string | null;
  unsubscribeUrl: string;
}

function greeting(firstName?: string | null): string {
  const name = firstName?.trim();
  return name ? `Bonjour ${name},` : "Bonjour,";
}

/** Remplace les marqueurs propres à chaque destinataire. */
export function personalize(content: string, r: Recipient, format: "html" | "text"): string {
  const enc = format === "html" ? escapeHtml : (s: string) => s;
  return content
    .split(PLACEHOLDERS.unsubscribeUrl)
    .join(enc(r.unsubscribeUrl))
    .split(PLACEHOLDERS.greeting)
    .join(enc(greeting(r.firstName)));
}
