import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson, requireUser } from "@/lib/api";
import { getAdmin } from "@/lib/admin/auth";

const schema = z.object({ opec: z.string().regex(/^[0-9]{3,10}$/), enabled: z.boolean() });

/** Activa o retira un banco de la biblioteca (solo administradores, con auditoría). */
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
  if (!parsed.success) return jsonError(422, "datos_invalidos", "Solicitud inválida.");
  const { error } = await ctx.admin.from("job_banks").update({ enabled: parsed.data.enabled, updated_at: new Date().toISOString() }).eq("opec", parsed.data.opec);
  if (error) return jsonError(500, "no_guardado", "No se pudo actualizar.");
  await ctx.admin.from("admin_audit_log").insert({ admin_id: ctx.user.id, action: parsed.data.enabled ? "biblioteca_activada" : "biblioteca_retirada", target_id: parsed.data.opec, details: {} });
  return NextResponse.json({ ok: true });
}
