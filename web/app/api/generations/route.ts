import { NextResponse } from "next/server";
import { jsonError, readJson, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { generationInputSchema } from "@/lib/generation/schemas";

/** Crea un borrador de generación (todavía no consume créditos). */
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "json_invalido", "Solicitud inválida.");
  }
  const parsed = generationInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "datos_invalidos", parsed.error.issues[0]?.message ?? "Revisa los datos del empleo.");
  }

  const admin = createAdminClient();
  // Freno anti-abuso: máximo 10 borradores por usuario al día.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from("generations").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).gte("created_at", since);
  if ((count ?? 0) >= 10) return jsonError(429, "demasiados_borradores", "Creaste muchas generaciones hoy. Intenta mañana o escríbenos.");

  // Reutiliza un borrador abierto del usuario para no acumular basura.
  await admin.from("generations").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("user_id", auth.user.id).eq("status", "draft");

  const { data: setting } = await admin.from("app_settings").select("value").eq("key", "questions_per_generation").maybeSingle();
  const target = Math.min(200, Math.max(20, Number(setting?.value ?? 120) || 120));
  const { data, error } = await admin
    .from("generations")
    .insert({ user_id: auth.user.id, ...parsed.data, target_questions: target })
    .select("id")
    .single();
  if (error) return jsonError(500, "no_creada", "No pudimos crear la generación.");

  // Recuerda los datos del empleo para la próxima vez.
  await admin
    .from("profiles")
    .update({ default_cargo: parsed.data.cargo, default_nivel: parsed.data.nivel, default_modalidad: parsed.data.modalidad, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id);

  return NextResponse.json({ id: data.id });
}
