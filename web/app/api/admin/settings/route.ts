import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson, requireUser } from "@/lib/api";
import { getAdmin } from "@/lib/admin/auth";

const int = (min: number, max: number) => z.number().int().min(min).max(max);

const schema = z.object({
  price_first_cop: int(1000, 1_000_000),
  price_next_cop: int(1000, 1_000_000),
  questions_per_generation: int(20, 200),
  order_pending_ttl_minutes: int(10, 1440),
  admin_emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(10),
  generation_limits: z.object({
    max_input_tokens: int(20_000, 2_000_000),
    max_output_tokens: int(10_000, 1_000_000),
    max_cost_usd: z.number().min(0.1).max(20),
    max_tokens_per_call: int(4_000, 64_000),
    max_attempts_per_step: int(1, 6),
    max_steps: int(5, 80),
    max_running_per_user: int(1, 3),
    max_generations_per_user_per_day: int(1, 50),
    max_upload_mb: int(1, 15),
  }),
});

/** Guarda la configuración del negocio (solo administradores, con auditoría por llave). */
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const ctx = await getAdmin();
  if (!ctx || ctx.user.id !== auth.user.id) return jsonError(404, "no_encontrado", "No encontrado.");

  let parsed;
  try {
    parsed = schema.safeParse(await readJson(request));
  } catch {
    return jsonError(400, "json_invalido", "Solicitud inválida.");
  }
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return jsonError(422, "datos_invalidos", `Revisa "${i?.path.join(".")}": ${i?.message}`);
  }
  if (!parsed.data.admin_emails.includes((auth.user.email ?? "").toLowerCase())) {
    return jsonError(422, "sin_autoexclusion", "No puedes quitar tu propio correo de la lista de administradores.");
  }

  const { data: current } = await ctx.admin.from("app_settings").select("key, value");
  const before = new Map((current ?? []).map((r) => [r.key, JSON.stringify(r.value)]));
  for (const [key, value] of Object.entries(parsed.data)) {
    if (before.get(key) === JSON.stringify(value)) continue;
    const { error } = await ctx.admin.rpc("admin_update_setting", { p_admin_id: auth.user.id, p_key: key, p_value: value });
    if (error) return jsonError(500, "no_guardado", `No se pudo guardar ${key}.`);
  }
  return NextResponse.json({ ok: true });
}
