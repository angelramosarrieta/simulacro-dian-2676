import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/security";

const MAX_BYTES = 500_000;
const schema = z.object({
  stats: z.record(z.unknown()),
  history: z.array(z.unknown()).max(500),
});

/** Guarda el progreso del simulador (aciertos e historial) en la cuenta del dueño. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError(404, "no_encontrada", "No encontrado.");

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return jsonError(413, "muy_grande", "Progreso demasiado grande.");
  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(raw));
  } catch {
    return jsonError(400, "json_invalido", "Solicitud inválida.");
  }
  if (!parsed.success) return jsonError(422, "datos_invalidos", "Formato de progreso inválido.");

  // RLS: solo encuentra la generación si es del usuario.
  const { data: gen } = await auth.supabase.from("generations").select("id, user_id").eq("id", id).eq("status", "completed").maybeSingle();
  if (!gen || gen.user_id !== auth.user.id) return jsonError(404, "no_encontrada", "No encontrado.");

  const { error } = await createAdminClient()
    .from("simulator_progress")
    .upsert({ generation_id: id, user_id: auth.user.id, stats: parsed.data.stats, history: parsed.data.history, updated_at: new Date().toISOString() });
  if (error) return jsonError(500, "no_guardado", "No se pudo guardar.");
  return NextResponse.json({ ok: true });
}
