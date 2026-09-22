import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { EmailMessage, EmailProvider, SendResult } from "./provider";
import { PermanentRecipientError } from "./provider";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  maxConnections: number;
  ratePerSecond: number;
}

/** Envoi via n'importe quel serveur SMTP (aucune dépendance à un fournisseur précis). */
export class SMTPProvider implements EmailProvider {
  readonly name = "smtp";
  private readonly transporter: Transporter;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.password } : undefined,
      pool: true,
      maxConnections: config.maxConnections,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: config.ratePerSecond,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: { name: message.from.name, address: message.from.email },
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
      });
      if (info.rejected?.length) {
        throw new PermanentRecipientError(`Destinataire refusé par le serveur SMTP`);
      }
      return { messageId: info.messageId ?? null };
    } catch (err) {
      const code = (err as { responseCode?: number }).responseCode;
      // 55x : erreur permanente liée à la boîte du destinataire.
      if (code && code >= 550 && code < 560) {
        throw new PermanentRecipientError((err as Error).message);
      }
      throw err;
    }
  }

  async verify(): Promise<void> {
    await this.transporter.verify();
  }

  async close(): Promise<void> {
    this.transporter.close();
  }
}
