import { NextResponse, after } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiProviderFactory } from "@/lib/ai";
import { dispatchContinuation } from "@/lib/generation/dispatch";
import { driveGeneration } from "@/lib/generation/worker";
import { UUID_RE } from "@/lib/security";

export const maxDuration = 300;
const ACTIVE = ["queued", "analyzing", "generating", "assembling"];

/** Estado de una generación (para el panel). Si está detenida, la reanuda. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError(404, "no_encontrada", "Generación no encontrada.");

  // Lectura con la sesión del usuario: RLS garantiza que solo vea la suya.
  const { data: gen } = await auth.supabase
    .from("generations")
    .select("id, status, progress, current_step, error_code, error_message, cargo, opec, target_questions, questions, plan, lease_until, updated_at, finished_at, credit_refunded")
    .eq("id", id)
    .maybeSingle();
  if (!gen) return jsonError(404, "no_encontrada", "Generación no encontrada.");

  const stalled =
    ACTIVE.includes(gen.status) &&
    (!gen.lease_until || new Date(gen.lease_until).getTime() < Date.now()) &&
    Date.now() - new Date(gen.updated_at).getTime() > 15_000;
  if (stalled) {
    after(async () => {
      const admin = createAdminClient();
      const last = await driveGeneration(admin, id, await aiProviderFactory(), 280_000);
      if (last.state === "advanced") await dispatchContinuation(id);
    });
  }

  const questions = Array.isArray(gen.questions) ? gen.questions : [];
  return NextResponse.json(
    {
      id: gen.id,
      status: gen.status,
      progress: gen.progress,
      currentStep: gen.current_step,
      errorCode: gen.error_code,
      errorMessage: gen.error_message,
      questionsGenerated: questions.length,
      targetQuestions: gen.target_questions,
      plan: gen.plan,
      creditRefunded: gen.credit_refunded,
      finishedAt: gen.finished_at,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Descarta un borrador (antes de iniciar; no hay crédito involucrado). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError(404, "no_encontrada", "Generación no encontrada.");
  const admin = createAdminClient();
  const { data: gen } = await admin.from("generations").select("id, status, manual_path, indicadores_path").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!gen) return jsonError(404, "no_encontrada", "Generación no encontrada.");
  if (gen.status !== "draft") return jsonError(409, "no_cancelable", "Solo se pueden descartar borradores.");
  const paths = [gen.manual_path, gen.indicadores_path].filter(Boolean) as string[];
  if (paths.length) await admin.storage.from("documents").remove(paths);
  await admin.from("generations").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
