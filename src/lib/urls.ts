import "server-only";
import { env } from "./env";

export function appUrl(path: string): string {
  return new URL(path, env().APP_URL).toString();
}

export const urls = {
  unsubscribePage: (token: string) => appUrl(`/unsubscribe/${encodeURIComponent(token)}`),
  unsubscribeOneClick: (token: string) => appUrl(`/api/unsubscribe/${encodeURIComponent(token)}`),
  confirm: (token: string) => appUrl(`/confirm/${encodeURIComponent(token)}`),
  privacy: () => appUrl("/confidentialite"),
};

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}
