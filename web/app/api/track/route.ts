import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";
import { browserOf, cleanPath, decodeHeader, deviceOf, isBot, referrerHost } from "@/lib/analytics/visit";

const UUID = z.string().uuid();
const schema = z.object({
  vid: UUID,
  sid: UUID,
  path: z.string().min(1).max(500),
  ref: z.string().max(500).optional(),
  utm_source: z.string().max(80).optional(),
  utm_medium: z.string().max(80).optional(),
  utm_campaign: z.string().max(120).optional(),
});

/** Registra una página vista (anónima). Nunca falla hacia el navegador. */
export async function POST(request: Request) {
  const ok = new NextResponse(null, { status: 204 });
  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (isBot(ua)) return ok;
    const raw = await request.text();
    if (raw.length > 4000) return ok;
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return ok;
    const d = parsed.data;
    const path = cleanPath(d.path);
    if (path.startsWith("/admin") || path.startsWith("/api")) return ok;
    const host = new URL(request.url).hostname;
    const { user } = await getUser().catch(() => ({ user: null }));
    await createAdminClient().from("page_views").insert({
      visitor_id: d.vid,
      session_id: d.sid,
      path,
      referrer_host: referrerHost(d.ref, host),
      utm_source: d.utm_source?.toLowerCase() || null,
      utm_medium: d.utm_medium?.toLowerCase() || null,
      utm_campaign: d.utm_campaign || null,
      country: request.headers.get("x-vercel-ip-country"),
      region: decodeHeader(request.headers.get("x-vercel-ip-country-region")),
      city: decodeHeader(request.headers.get("x-vercel-ip-city")),
      device: deviceOf(ua),
      browser: browserOf(ua),
      user_id: user?.id ?? null,
    });
  } catch {
    // Las estadísticas nunca deben romper la navegación.
  }
  return ok;
}
