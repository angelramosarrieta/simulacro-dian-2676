import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Límites duros por generación. Viven en la tabla app_settings (llave
 * "generation_limits") para cambiarlos sin desplegar; estos son los valores
 * por defecto si la fila falta o viene incompleta. Ver docs/LIMITES.md.
 */
export const DEFAULT_LIMITS = {
  max_input_tokens: 400_000,
  max_output_tokens: 160_000,
  max_cost_usd: 3,
  max_tokens_per_call: 16_000,
  max_attempts_per_step: 3,
  max_steps: 30,
  max_running_per_user: 1,
  max_generations_per_user_per_day: 5,
  max_upload_mb: 15,
};
export type GenerationLimits = typeof DEFAULT_LIMITS;

export function mergeLimits(value: unknown): GenerationLimits {
  const out = { ...DEFAULT_LIMITS };
  if (value && typeof value === "object") {
    for (const k of Object.keys(out) as (keyof GenerationLimits)[]) {
      const v = Number((value as Record<string, unknown>)[k]);
      if (Number.isFinite(v) && v > 0) out[k] = v;
    }
  }
  return out;
}

export async function loadLimits(admin: SupabaseClient): Promise<GenerationLimits> {
  const { data } = await admin.from("app_settings").select("value").eq("key", "generation_limits").maybeSingle();
  return mergeLimits(data?.value);
}

export type UsageTotals = { input_tokens: number; output_tokens: number; cost_usd: number; steps_run: number };

/** Devuelve el motivo si la generación ya agotó su presupuesto; null si puede seguir. */
export function budgetExceeded(t: UsageTotals, l: GenerationLimits): string | null {
  if (t.input_tokens >= l.max_input_tokens) return "Se alcanzó el límite de tokens de entrada de la generación.";
  if (t.output_tokens >= l.max_output_tokens) return "Se alcanzó el límite de tokens de salida de la generación.";
  if (t.cost_usd >= l.max_cost_usd) return "Se alcanzó el límite de costo de la generación.";
  if (t.steps_run >= l.max_steps) return "Se alcanzó el número máximo de pasos de la generación.";
  return null;
}

/** Tokens de salida permitidos en la próxima llamada sin pasar el tope total. */
export function callOutputBudget(t: UsageTotals, l: GenerationLimits) {
  return Math.max(0, Math.min(l.max_tokens_per_call, l.max_output_tokens - t.output_tokens));
}
