import "server-only";
import { aiProvider } from "@/lib/env";
import { loadRuntimeConfig } from "@/lib/config/runtime";
import { createAnthropicProvider } from "@/lib/ai/anthropic";
import { createOpenAiProvider } from "@/lib/ai/openai";
import type { AiProvider } from "@/lib/ai/types";

/** Proveedor de IA configurado (panel o AI_PROVIDER). Lanza AiError("not_configured") si falta la llave. */
export async function getAiProvider(): Promise<AiProvider> {
  await loadRuntimeConfig();
  return aiProvider() === "openai" ? createOpenAiProvider() : createAnthropicProvider();
}

/**
 * Para el worker (que pide el proveedor de forma síncrona): resuelve la
 * configuración una vez y devuelve una función que entrega el proveedor o
 * relanza el error de configuración dentro del paso (que lo maneja sin cobrar).
 */
export async function aiProviderFactory(): Promise<() => AiProvider> {
  try {
    const provider = await getAiProvider();
    return () => provider;
  } catch (e) {
    return () => {
      throw e;
    };
  }
}
