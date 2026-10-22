import { NextResponse, after } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { integrationStatus } from "@/lib/env";
import { getAiProvider } from "@/lib/ai";
import { dispatchContinuation } from "@/lib/generation/dispatch";
import { sniffMime } from "@/lib/generation/files";
import { loadLimits } from "@/lib/generation/limits";
import { driveGeneration } from "@/lib/generation/worker";
import { UUID_RE } from "@/lib/security";

export const maxDuration = 300;

const ERRORS: Record<string, [number, string]> = {
  sin_creditos: [402, "No tienes generaciones disponibles. Compra una para continuar."],
  generacion_en_curso: [409, "Ya tienes una generación en proceso. Espera a que termine."],
  limite_diario: [429, "Alcanzaste el límite diario de generaciones. Intenta mañana."],
  generacion_ya_iniciada: [409, "Esta generación ya fue iniciada."],
  faltan_documentos: [422, "Sube el manual de funciones y tus indicadores."],
  generacion_no_encontrada: [404, "Generación no encontrada."],
};

/** Valida los documentos, consume un crédito (atómico en la BD) e inicia el proceso. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError(404, "no_encontrada", "Generación no encontrada.");

  // Sin IA configurada no se consume ningún crédito.
  if (!integrationStatus().ai) {
    return jsonError(503, "ia_no_configurada", "El generador se está configurando. Tu crédito queda guardado; intenta más tarde.");
  }

  const admin = createAdminClient();
  const { data: gen } = await admin
    .from("generations")
    .select("id, status, manual_path, manual_mime, indicadores_path, indicadores_mime")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!gen) return jsonError(404, "no_encontrada", "Generación no encontrada.");
  if (gen.status !== "draft") return jsonError(409, "ya_iniciada", "Esta generación ya fue iniciada.");

  const limits = await loadLimits(admin);
  for (const [label, p, mime] of [
    ["El manual de funciones", gen.manual_path, gen.manual_mime],
    ["El archivo de indicadores", gen.indicadores_path, gen.indicadores_mime],
  ] as const) {
    if (!p) return jsonError(422, "faltan_documentos", `${label} no se ha subido.`);
    const { data: file, error } = await admin.storage.from("documents").download(p);
    if (error || !file) return jsonError(422, "faltan_documentos", `${label} no se ha subido completo. Vuelve a cargarlo.`);
    if (file.size > limits.max_upload_mb * 1024 * 1024) return jsonError(413, "archivo_grande", `${label} supera ${limits.max_upload_mb} MB.`);
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (sniffMime(head) !== mime) return jsonError(422, "archivo_invalido", `${label} no es un PDF o imagen válido.`);
  }

  const { error } = await admin.rpc("start_generation", { p_user_id: auth.user.id, p_generation_id: id });
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    const [status, message] = key ? ERRORS[key] : [500, "No pudimos iniciar la generación."];
    return jsonError(status, key ?? "error", message);
  }

  after(async () => {
    const last = await driveGeneration(admin, id, getAiProvider, 280_000);
    if (last.state === "advanced" || last.state === "busy") await dispatchContinuation(id);
  });
  return NextResponse.json({ ok: true });
}
