import { escapeHtml } from "@/lib/escape";
import { theme } from "./theme";

export interface LayoutOptions {
  title: string;
  preheader: string;
  logoUrl?: string | null;
  siteUrl: string;
  body: string;
  footer: string;
}

/** Squelette HTML compatible avec les principaux clients (tables + styles en ligne). */
export function renderLayout(o: LayoutOptions): string {
  const c = theme.colors;
  const logo = o.logoUrl
    ? `<img src="${escapeHtml(o.logoUrl)}" alt="${theme.brandName}" width="180" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:180px;margin:0 auto;">`
    : `<span style="font-family:${theme.fontFamily};font-size:28px;letter-spacing:1px;color:${c.primary};font-weight:bold;">${theme.brandName}</span>`;

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<title>${escapeHtml(o.title)}</title>
<style>
  body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  img { -ms-interpolation-mode:bicubic; }
  a { color:${c.primary}; }
  @media only screen and (max-width:620px) {
    .container { width:100% !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .h1 { font-size:26px !important; line-height:32px !important; }
    .fluid { width:100% !important; height:auto !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${c.background};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${c.background};">${escapeHtml(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.background};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" class="container" width="${theme.maxWidth}" cellpadding="0" cellspacing="0" border="0" style="width:${theme.maxWidth}px;max-width:${theme.maxWidth}px;">
        <tr>
          <td align="center" style="padding:8px 0 24px 0;">
            <a href="${escapeHtml(o.siteUrl)}" style="text-decoration:none;">${logo}</a>
          </td>
        </tr>
        <tr>
          <td style="background-color:${c.card};border:1px solid ${c.border};border-radius:8px;">
            ${o.body}
          </td>
        </tr>
        <tr>
          <td class="px" align="center" style="padding:24px 32px;font-family:${theme.sansFamily};font-size:12px;line-height:18px;color:${c.muted};">
            ${o.footer}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function renderButton(href: string, label: string): string {
  const c = theme.colors;
  const h = escapeHtml(href);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
  <tr>
    <td align="center" bgcolor="${c.primary}" style="border-radius:6px;">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${h}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="13%" stroke="f" fillcolor="${c.primary}"><center style="color:${c.buttonText};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${escapeHtml(label)}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!--><a href="${h}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:${theme.sansFamily};font-size:16px;font-weight:bold;color:${c.buttonText};text-decoration:none;border-radius:6px;background-color:${c.primary};">${escapeHtml(label)}</a><!--<![endif]-->
    </td>
  </tr>
</table>`;
}
