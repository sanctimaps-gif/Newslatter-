import { escapeHtml } from "@/lib/escape";
import { renderButton, renderLayout } from "./layout";
import { theme } from "./theme";

export interface ConfirmationView {
  firstName?: string | null;
  confirmUrl: string;
  siteUrl: string;
  logoUrl?: string | null;
  privacyUrl: string;
}

export const confirmationSubject = "Confirmez votre inscription à la newsletter SanctiMaps";

export function renderConfirmationHtml(v: ConfirmationView): string {
  const c = theme.colors;
  const hello = v.firstName ? `Bonjour ${escapeHtml(v.firstName)},` : "Bonjour,";
  const body = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td class="px" style="padding:32px;font-family:${theme.fontFamily};font-size:17px;line-height:27px;color:${c.text};">
    <p style="margin:0 0 16px 0;">${hello}</p>
    <p style="margin:0 0 16px 0;">Merci pour votre inscription à la newsletter quotidienne de ${theme.brandName}. Chaque matin, vous recevrez le saint du jour.</p>
    <p style="margin:0 0 24px 0;">Pour confirmer votre adresse e-mail, cliquez sur le bouton ci-dessous :</p>
    ${renderButton(v.confirmUrl, "Confirmer mon inscription")}
    <p style="margin:24px 0 0 0;font-size:14px;line-height:22px;color:${c.muted};">Ce lien est valable 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail : vous ne recevrez rien.</p>
  </td></tr>
</table>`;
  const footer = `<a href="${escapeHtml(v.privacyUrl)}" style="color:${c.muted};">Politique de confidentialité</a>`;
  return renderLayout({
    title: confirmationSubject,
    preheader: "Un dernier clic pour recevoir le saint du jour.",
    logoUrl: v.logoUrl,
    siteUrl: v.siteUrl,
    body,
    footer,
  });
}

export function renderConfirmationText(v: ConfirmationView): string {
  return [
    v.firstName ? `Bonjour ${v.firstName},` : "Bonjour,",
    "",
    `Merci pour votre inscription à la newsletter quotidienne de ${theme.brandName}.`,
    "Pour confirmer votre adresse e-mail, ouvrez ce lien :",
    v.confirmUrl,
    "",
    "Ce lien est valable 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    "",
    `Politique de confidentialité : ${v.privacyUrl}`,
  ].join("\n");
}
