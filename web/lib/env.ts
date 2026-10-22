import "server-only";

/**
 * Estado de las integraciones externas. Ninguna función de la app inventa
 * resultados cuando falta una credencial: la UI consulta este estado y
 * muestra el aviso correspondiente.
 */
export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}

export type AiProviderName = "anthropic" | "openai";

export function aiProvider(): AiProviderName {
  return process.env.AI_PROVIDER === "openai" ? "openai" : "anthropic";
}

export function integrationStatus() {
  const provider = aiProvider();
  const aiKey = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
  return {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
    ai: Boolean(aiKey),
    aiProvider: provider,
    wompi: Boolean(
      process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY && process.env.WOMPI_INTEGRITY_SECRET && process.env.WOMPI_EVENTS_SECRET
    ),
    wompiEnv: process.env.WOMPI_ENV === "production" ? ("production" as const) : ("sandbox" as const),
    internalSecret: Boolean(process.env.INTERNAL_JOB_SECRET && process.env.INTERNAL_JOB_SECRET.length >= 24),
  };
}

export type IntegrationStatus = ReturnType<typeof integrationStatus>;
