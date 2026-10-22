import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCEPTED_MIME } from "@/lib/generation/constants";
import { loadLimits } from "@/lib/generation/limits";
import { UUID_RE } from "@/lib/security";

const bodySchema = z.object({
  kind: z.enum(["manual", "indicadores"]),
  mime: z.enum(ACCEPTED_MIME),
  size: z.number().int().positive(),
});

const EXT: Record<(typeof ACCEPTED_MIME)[number], string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Devuelve una URL firmada para subir un documento directamente al bucket
 * privado (sin pasar el archivo por la función, que tiene límite de tamaño).
 * La ruta la decide el servidor: <user_id>/<generation_id>/<tipo>.<ext>.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError(404, "no_encontrada", "Generación no encontrada.");

  let parsed;
  try {
    parsed = bodySchema.safeParse(await readJson(request));
  } catch {
    return jsonError(400, "json_invalido", "Solicitud inválida.");
  }
  if (!parsed.success) return jsonError(422, "archivo_invalido", "Sube un PDF o una imagen (PNG, JPG o WEBP).");

  const admin = createAdminClient();
  const limits = await loadLimits(admin);
  if (parsed.data.size > limits.max_upload_mb * 1024 * 1024) {
    return jsonError(413, "archivo_grande", `El archivo supera ${limits.max_upload_mb} MB.`);
  }

  const { data: gen } = await admin.from("generations").select("id, status").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!gen) return jsonError(404, "no_encontrada", "Generación no encontrada.");
  if (gen.status !== "draft") return jsonError(409, "ya_iniciada", "Esta generación ya fue iniciada.");

  const filePath = `${auth.user.id}/${id}/${parsed.data.kind}.${EXT[parsed.data.mime]}`;
  const { data: signed, error } = await admin.storage.from("documents").createSignedUploadUrl(filePath, { upsert: true });
  if (error || !signed) return jsonError(500, "url_no_creada", "No pudimos preparar la subida del archivo.");

  const column = parsed.data.kind === "manual" ? { manual_path: filePath, manual_mime: parsed.data.mime } : { indicadores_path: filePath, indicadores_mime: parsed.data.mime };
  await admin.from("generations").update({ ...column, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", auth.user.id);

  return NextResponse.json({ path: signed.path, token: signed.token, signedUrl: signed.signedUrl });
}
