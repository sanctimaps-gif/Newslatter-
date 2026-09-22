import type { Saint } from "@/lib/types";
import { escapeHtml, safeUrl } from "@/lib/escape";
import { renderButton, renderLayout } from "./layout";
import { PLACEHOLDERS, theme } from "./theme";

/** Données injectées dans le template de la newsletter quotidienne. */
export interface DailySaintView {
  dateLabel: string; // « mardi 22 septembre 2026 »
  saints: Saint[];
  siteUrl: string;
  logoUrl?: string | null;
  privacyUrl: string;
}

const INTRO_MAX = 600;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max)}…`;
}

function saintBlock(saint: Saint, main: boolean): string {
  const c = theme.colors;
  const image = safeUrl(saint.image);
  const url = safeUrl(saint.url) ?? "#";
  const summary = truncate(saint.biography || saint.description, main ? INTRO_MAX : 320);
  const intro = saint.biography && saint.description ? saint.description : "";

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  ${
    image
      ? `<tr><td style="padding:0 0 20px 0;" align="center">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(saint.name)}" width="${main ? 536 : 400}" class="fluid" style="display:block;width:100%;max-width:${main ? 536 : 400}px;height:auto;border:0;border-radius:6px;">
    </td></tr>`
      : ""
  }
  <tr>
    <td align="center" style="font-family:${theme.fontFamily};color:${c.primary};font-size:${main ? 30 : 24}px;line-height:${main ? 38 : 30}px;font-weight:bold;padding:0 0 12px 0;" class="${main ? "h1" : ""}">
      ${escapeHtml(saint.name)}
    </td>
  </tr>
  ${
    intro
      ? `<tr><td style="font-family:${theme.fontFamily};font-size:18px;line-height:28px;color:${c.text};font-style:italic;padding:0 0 16px 0;" align="center">${escapeHtml(intro)}</td></tr>`
      : ""
  }
  ${
    summary
      ? `<tr><td style="font-family:${theme.fontFamily};font-size:17px;line-height:27px;color:${c.text};padding:0 0 24px 0;">${escapeHtml(summary)}</td></tr>`
      : ""
  }
  <tr><td align="center" style="padding:0 0 8px 0;">${renderButton(url, "Découvrir sa vie")}</td></tr>
</table>`;
}

export function renderDailySaintHtml(v: DailySaintView): string {
  const c = theme.colors;
  const plural = v.saints.length > 1;
  const blocks = v.saints
    .map((s, i) =>
      i === 0
        ? saintBlock(s, true)
        : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${c.border};padding:32px 0 0 0;margin-top:32px;">${saintBlock(s, false)}</td></tr></table>`,
    )
    .join(`<div style="height:32px;line-height:32px;font-size:1px;">&nbsp;</div>`);

  const body = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td class="px" style="padding:32px 32px 8px 32px;font-family:${theme.sansFamily};font-size:15px;color:${c.text};">
      ${PLACEHOLDERS.greeting}
    </td>
  </tr>
  <tr>
    <td class="px" align="center" style="padding:16px 32px 4px 32px;font-family:${theme.sansFamily};font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${c.accent};font-weight:bold;">
      ${plural ? "Les saints du jour" : "Le saint du jour"}
    </td>
  </tr>
  <tr>
    <td class="px" align="center" style="padding:0 32px 24px 32px;font-family:${theme.fontFamily};font-size:16px;color:${c.muted};">
      ${escapeHtml(v.dateLabel.charAt(0).toUpperCase() + v.dateLabel.slice(1))}
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:0 32px 32px 32px;">
      ${blocks}
    </td>
  </tr>
</table>`;

  const footer = `
Vous recevez cet e-mail car vous êtes inscrit(e) à la newsletter quotidienne de
<a href="${escapeHtml(v.siteUrl)}" style="color:${c.muted};">${theme.brandName}</a>.<br>
<a href="${PLACEHOLDERS.unsubscribeUrl}" style="color:${c.muted};">Se désinscrire</a>
&nbsp;·&nbsp;
<a href="${escapeHtml(v.privacyUrl)}" style="color:${c.muted};">Politique de confidentialité</a>`;

  return renderLayout({
    title: v.saints.map((s) => s.name).join(" · "),
    preheader: `${plural ? "Les saints du jour" : "Le saint du jour"} : ${v.saints.map((s) => s.name).join(", ")}`,
    logoUrl: v.logoUrl,
    siteUrl: v.siteUrl,
    body,
    footer,
  });
}

export function renderDailySaintText(v: DailySaintView): string {
  const lines: string[] = [
    PLACEHOLDERS.greeting,
    "",
    `${v.saints.length > 1 ? "LES SAINTS DU JOUR" : "LE SAINT DU JOUR"} — ${v.dateLabel}`,
    "",
  ];
  for (const s of v.saints) {
    lines.push(s.name.toUpperCase());
    if (s.description) lines.push(s.description);
    if (s.biography) lines.push("", truncate(s.biography, INTRO_MAX));
    lines.push("", `Découvrir sa vie : ${s.url}`, "", "—", "");
  }
  lines.push(
    `Vous recevez cet e-mail car vous êtes inscrit(e) à la newsletter de ${theme.brandName}.`,
    `Se désinscrire : ${PLACEHOLDERS.unsubscribeUrl}`,
    `Politique de confidentialité : ${v.privacyUrl}`,
  );
  return lines.join("\n");
}

export function buildSubject(saints: Saint[]): string {
  const names = saints.map((s) => s.name);
  if (names.length === 1) return `Le saint du jour : ${names[0]}`;
  const list = names.length === 2 ? names.join(" et ") : `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
  return `Les saints du jour : ${list}`;
}
