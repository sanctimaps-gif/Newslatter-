import { NextResponse, type NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { unsubscribe } from "@/services/subscribers";

export const dynamic = "force-dynamic";

/**
 * Désinscription « en un clic » (RFC 8058) utilisée par les clients de messagerie
 * via l'en-tête List-Unsubscribe-Post.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`unsubscribe:${ip}`, 30, 10 * 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const { token } = await params;
  const result = await unsubscribe(token, { ip, userAgent: req.headers.get("user-agent") ?? undefined, source: "one-click" });
  return NextResponse.json({ ok: result !== "invalid" }, { status: result === "invalid" ? 404 : 200 });
}
