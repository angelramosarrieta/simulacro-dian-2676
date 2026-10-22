import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/security";

const schema = z.object({
  userId: z.string().regex(UUID_RE),
  delta: z.number().int().min(-20).max(20).refine((n) => n !== 0, "El ajuste no puede ser 0."),
  note: z.string().trim().min(3, "Escribe el motivo del ajuste.").max(300),
});

const ERRORS: Record<string, string> = {
  no_autorizado: "No autorizado.",
  saldo_negativo: "El saldo no puede quedar negativo.",
  ajuste_invalido: "Ajuste inválido.",
  nota_requerida: "Escribe el motivo del ajuste.",
};

/** Ajuste manual de créditos. La BD vuelve a verificar que quien lo pide sea administrador. */
export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const admin = createAdminClient();
  const { data: isAdmin } = await admin.from("admins").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  if (!isAdmin) return jsonError(404, "no_encontrado", "No encontrado.");

  let parsed;
  try {
    parsed = schema.safeParse(await readJson(request));
  } catch {
    return jsonError(400, "json_invalido", "Solicitud inválida.");
  }
  if (!parsed.success) return jsonError(422, "datos_invalidos", parsed.error.issues[0]?.message ?? "Datos inválidos.");

  const { data, error } = await admin.rpc("admin_adjust_credits", {
    p_admin_id: auth.user.id,
    p_user_id: parsed.data.userId,
    p_delta: parsed.data.delta,
    p_note: parsed.data.note,
  });
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return jsonError(key ? 422 : 500, key ?? "error", key ? ERRORS[key] : "No se pudo ajustar.");
  }
  return NextResponse.json({ balance: data });
}
