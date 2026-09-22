import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { tick } from "@/services/newsletter/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Déclencheur du scheduler, à appeler toutes les 1 à 5 minutes par la tâche
 * planifiée de l'hébergement : Authorization: Bearer <CRON_SECRET>.
 */
async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${env().CRON_SECRET}`)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await tick()) });
  } catch (err) {
    console.error("[newsletter] tick en erreur", err);
    return NextResponse.json({ ok: false, error: "tick failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
