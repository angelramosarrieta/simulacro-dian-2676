import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson, requireUser } from "@/lib/api";
import { getAdmin } from "@/lib/admin/auth";
import { CONFIG_FIELDS, hintFor } from "@/lib/config/catalog";
import { encryptSecret, encryptionAvailable } from "@/lib/config/crypto";
import { invalidateRuntimeConfig } from "@/lib/config/runtime";

const bodySchema = z.object({ key: z.string(), value: z.string().max(500).optional() });

async function guard(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return { error: auth.error } as const;
  const ctx = await getAdmin();
  if (!ctx || ctx.user.id !== auth.user.id) return { error: jsonError(404, "no_encontrado", "No encontrado.") } as const;
  let parsed;
  try {
    parsed = bodySchema.safeParse(await readJson(request, 4000));
  } catch {
    return { error: jsonError(400, "json_invalido", "Solicitud inválida.") } as const;
  }
  if (!parsed.success) return { error: jsonError(422, "datos_invalidos", "Solicitud inválida.") } as const;
  const field = CONFIG_FIELDS.find((f) => f.key === parsed.data.key);
  if (!field) return { error: jsonError(422, "llave_invalida", "Esa llave no se puede configurar desde el panel.") } as const;
  return { ctx, field, value: parsed.data.value } as const;
}

/** Guarda (cifrada) una llave de integración. Solo administradores; queda en la auditoría sin el valor. */
export async function POST(request: Request) {
  const g = await guard(request);
  if ("error" in g) return g.error;
  if (!encryptionAvailable()) return jsonError(503, "sin_cifrado", "Falta SECRETS_ENCRYPTION_KEY en Vercel; no se pueden guardar llaves.");
  const value = (g.value ?? "").trim();
  if (!value) return jsonError(422, "vacio", "Escribe el valor.");
  if (g.field.options && !g.field.options.includes(value)) return jsonError(422, "opcion_invalida", "Valor no permitido.");
  if (g.field.pattern && !g.field.pattern.test(value)) return jsonError(422, "formato", `El formato no parece válido para "${g.field.label}".`);

  const { error } = await g.ctx.admin.from("app_secrets").upsert({
    key: g.field.key,
    ciphertext: encryptSecret(value),
    hint: hintFor(g.field, value),
    updated_by: g.ctx.user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return jsonError(500, "no_guardado", "No se pudo guardar.");
  await g.ctx.admin.from("admin_audit_log").insert({ admin_id: g.ctx.user.id, action: "llave_actualizada", target_id: g.field.key, details: { hint: hintFor(g.field, value) } });
  invalidateRuntimeConfig();
  return NextResponse.json({ ok: true, hint: hintFor(g.field, value) });
}

/** Quita la llave guardada en el panel (vuelve a usarse la de Vercel, si existe). */
export async function DELETE(request: Request) {
  const g = await guard(request);
  if ("error" in g) return g.error;
  await g.ctx.admin.from("app_secrets").delete().eq("key", g.field.key);
  await g.ctx.admin.from("admin_audit_log").insert({ admin_id: g.ctx.user.id, action: "llave_eliminada", target_id: g.field.key, details: {} });
  invalidateRuntimeConfig();
  return NextResponse.json({ ok: true });
}
