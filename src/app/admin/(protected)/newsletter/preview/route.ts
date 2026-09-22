import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isIsoDate, localDate } from "@/lib/dates";
import { createGenerator } from "@/services/newsletter/factory";
import { personalize } from "@/templates/personalize";

export const dynamic = "force-dynamic";

/** HTML brut de la newsletter (aperçu en plein écran). Réservé à l'administrateur. */
export async function GET(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const settings = await getSettings();
  const param = req.nextUrl.searchParams.get("date") ?? "";
  const date = isIsoDate(param) ? param : localDate(new Date(), settings.timezone);
  try {
    const g = await createGenerator().generate(date);
    const html = personalize(g.html, { firstName: "Marie", unsubscribeUrl: "#desinscription" }, "html");
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "script-src 'none'; frame-ancestors 'self'",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
