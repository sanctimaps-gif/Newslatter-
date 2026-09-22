/**
 * Abstraction d'envoi d'e-mails. Le reste de l'application ne connaît que
 * cette interface : SMTP aujourd'hui, un autre fournisseur demain
 * (BrevoProvider, ResendProvider…) sans toucher à la logique métier.
 */
export interface EmailMessage {
  to: string;
  from: { email: string; name: string };
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  messageId: string | null;
}

/** Erreur définitive liée au destinataire (adresse refusée…) : ne pas réessayer. */
export class PermanentRecipientError extends Error {}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<SendResult>;
  /** Vérifie la connexion au fournisseur (utilisé par /admin/settings). */
  verify(): Promise<void>;
  close(): Promise<void>;
}
