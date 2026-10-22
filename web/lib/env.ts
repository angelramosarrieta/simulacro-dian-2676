import "server-only";
import { cfg, loadRuntimeConfig } from "@/lib/config/runtime";

/**
 * Estado de las integraciones externas. Ninguna función de la app inventa
 * resultados cuando falta una credencial: la UI consulta este estado y
 * muestra el aviso correspondiente. Las llaves pueden venir del panel de
 * administración (cifradas en la BD) o de las variables de entorno.
 */
export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}

export type AiProviderName = "anthropic" | "openai";

/** Requiere loadRuntimeConfig() antes (lo hacen integrationStatus y getAiProvider). */
export function aiProvider(): AiProviderName {
  return cfg("AI_PROVIDER") === "openai" ? "openai" : "anthropic";
}

export async function integrationStatus() {
  await loadRuntimeConfig();
  const provider = aiProvider();
  const aiReady = provider === "openai" ? Boolean(cfg("OPENAI_API_KEY") && cfg("OPENAI_MODEL")) : Boolean(cfg("ANTHROPIC_API_KEY"));
  return {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
    ai: aiReady,
    aiProvider: provider,
    wompi: Boolean(cfg("WOMPI_PUBLIC_KEY") && cfg("WOMPI_INTEGRITY_SECRET") && cfg("WOMPI_EVENTS_SECRET")),
    wompiEnv: cfg("WOMPI_ENV") === "production" ? ("production" as const) : ("sandbox" as const),
    email: Boolean(cfg("RESEND_API_KEY")),
    internalSecret: Boolean(process.env.INTERNAL_JOB_SECRET && process.env.INTERNAL_JOB_SECRET.length >= 24),
  };
}

export type IntegrationStatus = Awaited<ReturnType<typeof integrationStatus>>;
