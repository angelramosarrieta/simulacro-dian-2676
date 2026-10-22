import "server-only";
import { aiProvider } from "@/lib/env";
import { createAnthropicProvider } from "@/lib/ai/anthropic";
import { createOpenAiProvider } from "@/lib/ai/openai";
import type { AiProvider } from "@/lib/ai/types";

/** Proveedor de IA configurado (AI_PROVIDER=anthropic|openai). Lanza AiError("not_configured") si falta la llave. */
export function getAiProvider(): AiProvider {
  return aiProvider() === "openai" ? createOpenAiProvider() : createAnthropicProvider();
}
