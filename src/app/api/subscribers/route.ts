import { NextResponse, type NextRequest } from "next/server";
import { allowedOrigins, env } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { subscribe, subscribeInput } from "@/services/subscribers";

export const dynamic = "force-dynamic";

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins().includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

const GENERIC_OK =
  "Merci ! Si cette adresse n'est pas déjà inscrite, vous allez recevoir un e-mail pour confirmer votre inscription.";

/**
 * POST /api/subscribers — inscription (double opt-in).
 * Accepte du JSON ({ email, first_name }) ou un formulaire HTML classique.
 * Pour un formulaire classique, un champ caché « redirect » (URL de SanctiMaps)
 * permet de revenir sur le site après l'envoi.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Protection CSRF / abus : seules les origines autorisées (et cette application) sont acceptées.
  const selfOrigin = new URL(env().APP_URL).origin;
  if (origin && origin !== selfOrigin && !allowedOrigins().includes(origin)) {
    return NextResponse.json({ ok: false, error: "Origine non autorisée" }, { status: 403 });
  }

  const ip = clientIp(req.headers);
  if (!rateLimit(`subscribe:ip:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Trop de tentatives, réessayez plus tard." },
      { status: 429, headers },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  const isForm = !contentType.includes("application/json");
  let body: Record<string, unknown>;
  try {
    body = isForm
      ? Object.fromEntries((await req.formData()).entries())
      : ((await req.json()) as Record<string, unknown>);
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide" }, { status: 400, headers });
  }

  const redirectTo = typeof body.redirect === "string" ? body.redirect : null;
  const respond = (ok: boolean, message: string, status: number) => {
    if (isForm && redirectTo) {
      try {
        const target = new URL(redirectTo);
        if (allowedOrigins().includes(target.origin)) {
          target.searchParams.set("newsletter", ok ? "ok" : "error");
          return NextResponse.redirect(target, 303);
        }
      } catch {
        /* URL invalide : réponse JSON classique */
      }
    }
    return NextResponse.json(ok ? { ok, message } : { ok, error: message }, { status, headers });
  };

  // Champ piège anti-robots : doit rester vide.
  if (typeof body.website === "string" && body.website.length > 0) return respond(true, GENERIC_OK, 200);

  const parsed = subscribeInput.safeParse({
    email: body.email,
    first_name: typeof body.first_name === "string" ? body.first_name : undefined,
  });
  if (!parsed.success) return respond(false, parsed.error.issues[0]?.message ?? "Données invalides", 400);

  if (!rateLimit(`subscribe:email:${parsed.data.email}`, 3, 60 * 60_000)) {
    return respond(true, GENERIC_OK, 200);
  }

  try {
    await subscribe(parsed.data, {
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
      source: origin ?? req.headers.get("referer") ?? "api",
    });
  } catch {
    return respond(false, "Le service est momentanément indisponible, réessayez plus tard.", 503);
  }
  return respond(true, GENERIC_OK, 200);
}
