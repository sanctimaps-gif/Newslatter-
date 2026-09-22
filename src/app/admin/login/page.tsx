import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { verifyPassword, safeEqual } from "@/lib/crypto";
import { createSession, getSession } from "@/lib/auth";
import { requestMeta } from "@/lib/request-meta";
import { rateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connexion — Administration newsletter" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/admin");
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const { ip } = await requestMeta();
    if (!rateLimit(`login:${ip}`, 5, 15 * 60_000)) redirect("/admin/login?error=limited");

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const e = env();
    const emailOk = safeEqual(email, e.ADMIN_EMAIL.toLowerCase());
    const passwordOk = await verifyPassword(password, e.ADMIN_PASSWORD_HASH);
    if (!emailOk || !passwordOk) {
      await log("warn", "Échec de connexion à l'administration", { context: { ip } });
      redirect("/admin/login?error=invalid");
    }
    await createSession(email);
    redirect("/admin");
  }

  return (
    <main className="narrow">
      <div className="card">
        <h1>Administration de la newsletter</h1>
        {error === "invalid" && <div className="alert err">Identifiants incorrects.</div>}
        {error === "limited" && <div className="alert err">Trop de tentatives. Réessayez dans 15 minutes.</div>}
        <form action={login}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button className="btn" type="submit">Se connecter</button>
        </form>
      </div>
    </main>
  );
}
