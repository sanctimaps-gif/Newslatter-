import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { randomToken, sha256 } from "@/lib/crypto";
import { getSettings, senderFrom } from "@/lib/settings";
import { maskEmail, urls } from "@/lib/urls";
import { createEmailProvider } from "@/services/email";
import {
  confirmationSubject,
  renderConfirmationHtml,
  renderConfirmationText,
} from "@/templates/confirmation";

const CONFIRM_TTL_MS = 7 * 24 * 3600_000;

/** Texte du consentement conservé comme preuve (RGPD). */
export const CONSENT_TEXT =
  "J'accepte de recevoir chaque jour par e-mail la newsletter « Le saint du jour » de SanctiMaps. " +
  "Je peux me désinscrire à tout moment via le lien présent dans chaque e-mail.";

export const subscribeInput = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email({ message: "Adresse e-mail invalide" })),
  first_name: z
    .string()
    .trim()
    .max(80)
    .regex(/^[^<>"\\{}\p{Cc}]*$/u, "Prénom invalide")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  source?: string;
}

/**
 * Inscription avec double opt-in.
 * La réponse est volontairement identique quel que soit l'état de l'adresse
 * (évite de révéler qui est abonné).
 */
export async function subscribe(
  input: z.infer<typeof subscribeInput>,
  meta: RequestMeta,
): Promise<void> {
  const existing = await prisma.subscriber.findUnique({ where: { email: input.email } });

  if (existing && (existing.status === "active" || existing.status === "blocked")) return;

  const token = randomToken();
  const tokenData = {
    confirmTokenHash: sha256(token),
    confirmTokenExpiry: new Date(Date.now() + CONFIRM_TTL_MS),
  };

  let subscriberId: string;
  if (existing) {
    const updated = await prisma.subscriber.update({
      where: { id: existing.id },
      data: {
        ...tokenData,
        status: "pending",
        firstName: input.first_name ?? existing.firstName,
        subscribedAt: existing.status === "unsubscribed" ? new Date() : existing.subscribedAt,
        unsubscribedAt: null,
      },
    });
    subscriberId = updated.id;
  } else {
    try {
      const created = await prisma.subscriber.create({
        data: {
          email: input.email,
          firstName: input.first_name,
          status: "pending",
          unsubscribeToken: randomToken(),
          ...tokenData,
        },
      });
      subscriberId = created.id;
    } catch (err) {
      // Deux inscriptions simultanées de la même adresse : la première l'emporte.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
      throw err;
    }
  }

  await prisma.consentEvent.create({
    data: {
      subscriberId,
      action: "subscribe_request",
      consentText: CONSENT_TEXT,
      source: meta.source?.slice(0, 200),
      ipAddress: meta.ip,
      userAgent: meta.userAgent?.slice(0, 300),
    },
  });

  await sendConfirmationEmail(input.email, input.first_name ?? existing?.firstName ?? null, token);
}

async function sendConfirmationEmail(email: string, firstName: string | null, token: string) {
  const view = {
    firstName,
    confirmUrl: urls.confirm(token),
    siteUrl: env().SANCTIMAPS_SITE_URL,
    logoUrl: env().LOGO_URL,
    privacyUrl: urls.privacy(),
  };
  const provider = createEmailProvider();
  try {
    await provider.send({
      to: email,
      from: senderFrom(await getSettings()),
      subject: confirmationSubject,
      html: renderConfirmationHtml(view),
      text: renderConfirmationText(view),
    });
  } catch (err) {
    await log("error", `Échec de l'envoi de la confirmation à ${maskEmail(email)}`, {
      context: { error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  } finally {
    await provider.close();
  }
}

export type ConfirmResult = "confirmed" | "already" | "invalid";

export async function confirmSubscription(token: string, meta: RequestMeta): Promise<ConfirmResult> {
  if (!token || token.length > 200) return "invalid";
  const sub = await prisma.subscriber.findUnique({ where: { confirmTokenHash: sha256(token) } });
  if (!sub) return "invalid";
  if (sub.status === "active") return "already";
  if (sub.status !== "pending" || !sub.confirmTokenExpiry || sub.confirmTokenExpiry < new Date()) {
    return "invalid";
  }
  await prisma.$transaction([
    prisma.subscriber.update({
      where: { id: sub.id },
      data: { status: "active", confirmedAt: new Date(), confirmTokenHash: null, confirmTokenExpiry: null },
    }),
    prisma.consentEvent.create({
      data: {
        subscriberId: sub.id,
        action: "confirm",
        consentText: CONSENT_TEXT,
        ipAddress: meta.ip,
        userAgent: meta.userAgent?.slice(0, 300),
      },
    }),
  ]);
  return "confirmed";
}

export type UnsubscribeResult = "unsubscribed" | "deleted" | "invalid";

/** Désinscription via le jeton opaque du lien. Option : suppression complète des données. */
export async function unsubscribe(
  token: string,
  meta: RequestMeta,
  opts: { deleteData?: boolean } = {},
): Promise<UnsubscribeResult> {
  if (!token || token.length > 200) return "invalid";
  const sub = await prisma.subscriber.findUnique({ where: { unsubscribeToken: token } });
  if (!sub) return "invalid";

  if (opts.deleteData) {
    await prisma.subscriber.delete({ where: { id: sub.id } });
    await log("info", "Abonné supprimé à sa demande (droit à l'effacement)");
    return "deleted";
  }

  if (sub.status !== "unsubscribed" && sub.status !== "blocked") {
    await prisma.$transaction([
      prisma.subscriber.update({
        where: { id: sub.id },
        data: { status: "unsubscribed", unsubscribedAt: new Date(), confirmTokenHash: null, confirmTokenExpiry: null },
      }),
      prisma.consentEvent.create({
        data: { subscriberId: sub.id, action: "unsubscribe", source: meta.source, ipAddress: meta.ip, userAgent: meta.userAgent?.slice(0, 300) },
      }),
    ]);
  }
  return "unsubscribed";
}
