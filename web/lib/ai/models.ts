import OpenAI from "openai";

/**
 * Modelos de OpenAI para la lista desplegable de /admin/configuracion. Se leen
 * en vivo de la cuenta (GET /v1/models) para mostrar solo los que la llave
 * puede usar; sin llave o si OpenAI no responde, se usa una lista base.
 */
export const OPENAI_FALLBACK_MODELS = ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "o4-mini"];

// La generación usa chat con texto, PDF/imagen y salida JSON: se descartan los
// modelos que no son de chat (audio, imagen, embeddings, moderación…).
const EXCLUDE = /(embedding|tts|whisper|transcribe|dall-e|image|audio|realtime|moderation|search|davinci|babbage|instruct|codex|computer-use|sora)/i;

export function isOpenAiChatModel(id: string) {
  return /^(gpt-|o\d|chatgpt-)/i.test(id) && !EXCLUDE.test(id);
}

/** Ordena primero los modelos "base" (sin fecha) y luego las versiones fechadas, de más nuevo a más viejo. */
export function sortModels(ids: string[]) {
  const dated = (s: string) => /-\d{4}-\d{2}-\d{2}$|-\d{4}$/.test(s);
  return [...new Set(ids)].sort((a, b) => Number(dated(a)) - Number(dated(b)) || b.localeCompare(a, "en", { numeric: true }));
}

export async function listOpenAiModels(apiKey: string): Promise<string[]> {
  const client = new OpenAI({ apiKey, maxRetries: 0, timeout: 10_000 });
  const ids: string[] = [];
  for await (const m of client.models.list()) ids.push(m.id);
  return sortModels(ids.filter(isOpenAiChatModel));
}
