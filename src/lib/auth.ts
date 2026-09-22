import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import { hmac, safeEqual } from "./crypto";

export const SESSION_COOKIE = "nl_admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

interface SessionPayload {
  sub: string;
  exp: number;
}

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(env().SESSION_SECRET, body)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!safeEqual(signature, hmac(env().SESSION_SECRET, body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    if (payload.sub !== env().ADMIN_EMAIL.toLowerCase()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(email: string): Promise<void> {
  const token = sign({ sub: email.toLowerCase(), exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** À appeler dans chaque page, action serveur et route d'administration. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
