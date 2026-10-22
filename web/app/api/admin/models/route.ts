import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { getAdmin } from "@/lib/admin/auth";
import { cfg, loadRuntimeConfig } from "@/lib/config/runtime";
import { OPENAI_FALLBACK_MODELS, listOpenAiModels } from "@/lib/ai/models";

/** Lista de modelos de OpenAI disponibles para la llave guardada (solo administradores). */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const ctx = await getAdmin();
  if (!ctx || ctx.user.id !== auth.user.id) return jsonError(404, "no_encontrado", "No encontrado.");
  await loadRuntimeConfig(true);
  const key = cfg("OPENAI_API_KEY");
  if (!key) return NextResponse.json({ models: OPENAI_FALLBACK_MODELS, source: "base", message: "Guarda la API key de OpenAI para ver los modelos de tu cuenta." });
  try {
    const models = await listOpenAiModels(key);
    if (!models.length) return NextResponse.json({ models: OPENAI_FALLBACK_MODELS, source: "base", message: "Tu cuenta no devolvió modelos de chat; se muestra la lista base." });
    return NextResponse.json({ models, source: "cuenta" });
  } catch (e) {
    const status = (e as { status?: number }).status;
    return NextResponse.json({
      models: OPENAI_FALLBACK_MODELS,
      source: "base",
      message: status === 401 ? "La API key de OpenAI no es válida; se muestra la lista base." : "No se pudo consultar OpenAI; se muestra la lista base.",
    });
  }
}
