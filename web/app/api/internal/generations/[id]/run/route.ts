import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiProviderFactory } from "@/lib/ai";
import { dispatchContinuation } from "@/lib/generation/dispatch";
import { driveGeneration } from "@/lib/generation/worker";
import { safeEqual, UUID_RE } from "@/lib/security";

export const maxDuration = 300;

/** Continuación interna del worker. Solo con INTERNAL_JOB_SECRET. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret || !safeEqual(request.headers.get("x-internal-secret"), secret)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const admin = createAdminClient();
  const last = await driveGeneration(admin, id, await aiProviderFactory(), 280_000);
  if (last.state === "advanced") await dispatchContinuation(id);
  return NextResponse.json({ state: last.state });
}
