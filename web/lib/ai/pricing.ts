/**
 * Precios en USD por millón de tokens, para estimar y limitar el costo de
 * cada generación. Si el modelo no está en la tabla se usan precios altos a
 * propósito (para que los límites de costo corten antes, nunca después), o
 * los de AI_PRICE_INPUT_PER_MTOK / AI_PRICE_OUTPUT_PER_MTOK si se definen.
 * Para OpenAI, el administrador puede fijar el precio desde el panel
 * (OPENAI_PRICE_*), que tiene prioridad sobre la tabla.
 *
 * Precios de OpenAI tomados de su página pública (verificar en
 * openai.com/api/pricing; cambian con el tiempo).
 */
export type Price = { input: number; output: number; cacheRead: number; cacheWrite: number };

const TABLE: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5, cacheRead: 0.075, cacheWrite: 0 },
  "gpt-5": { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 },
  "gpt-5-mini": { input: 0.25, output: 2, cacheRead: 0.025, cacheWrite: 0 },
  "gpt-5-nano": { input: 0.05, output: 0.4, cacheRead: 0.005, cacheWrite: 0 },
  "gpt-4.1": { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6, cacheRead: 0.1, cacheWrite: 0 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4, cacheRead: 0.025, cacheWrite: 0 },
  "gpt-4o": { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6, cacheRead: 0.075, cacheWrite: 0 },
  "o4-mini": { input: 1.1, output: 4.4, cacheRead: 0.275, cacheWrite: 0 },
  "o3": { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 0 },
};

const CONSERVATIVE: Price = { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 };

/** Precio fijado por el administrador (USD por millón). Inválido o incompleto → null. */
export function parseOverride(input?: string, output?: string, cached?: string): Price | null {
  const i = Number(input), o = Number(output), c = cached ? Number(cached) : NaN;
  if (!(i > 0 && o > 0 && i < 1000 && o < 1000)) return null;
  return { input: i, output: o, cacheRead: c >= 0 && c < 1000 ? c : i * 0.1, cacheWrite: 0 };
}

export function priceFor(model: string, override?: Price | null): Price {
  if (override) return override;
  const envIn = Number(process.env.AI_PRICE_INPUT_PER_MTOK);
  const envOut = Number(process.env.AI_PRICE_OUTPUT_PER_MTOK);
  if (envIn > 0 && envOut > 0) return { input: envIn, output: envOut, cacheRead: envIn * 0.1, cacheWrite: envIn * 1.25 };
  // El más largo primero: "gpt-5-mini-2025-08-07" es gpt-5-mini, no gpt-5.
  const key = Object.keys(TABLE)
    .sort((a, b) => b.length - a.length)
    .find((k) => model === k || model.startsWith(`${k}-`));
  return key ? TABLE[key] : CONSERVATIVE;
}

export function knownModel(model: string) {
  return priceFor(model) !== CONSERVATIVE;
}

export function costUsd(model: string, u: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }, override?: Price | null) {
  const p = priceFor(model, override);
  const v =
    (u.inputTokens * p.input + u.outputTokens * p.output + (u.cacheReadTokens ?? 0) * p.cacheRead + (u.cacheWriteTokens ?? 0) * p.cacheWrite) /
    1_000_000;
  return Math.round(v * 1e6) / 1e6;
}
