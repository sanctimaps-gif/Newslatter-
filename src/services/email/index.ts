import "server-only";
import { env } from "@/lib/env";
import type { EmailProvider } from "./provider";
import { SMTPProvider } from "./smtp-provider";

export type { EmailMessage, EmailProvider, SendResult } from "./provider";
export { PermanentRecipientError } from "./provider";

/**
 * Fabrique du fournisseur d'envoi. Pour ajouter un fournisseur :
 * 1. créer une classe qui implémente EmailProvider ;
 * 2. l'ajouter ici et à EMAIL_PROVIDER dans src/lib/env.ts.
 */
export function createEmailProvider(): EmailProvider {
  const e = env();
  switch (e.EMAIL_PROVIDER) {
    case "smtp": {
      if (!e.SMTP_HOST) throw new Error("SMTP_HOST n'est pas configuré.");
      return new SMTPProvider({
        host: e.SMTP_HOST,
        port: e.SMTP_PORT,
        secure: e.SMTP_SECURE === "true",
        user: e.SMTP_USER,
        password: e.SMTP_PASSWORD,
        maxConnections: e.SMTP_MAX_CONNECTIONS,
        ratePerSecond: e.SMTP_RATE_PER_SECOND,
      });
    }
  }
}
