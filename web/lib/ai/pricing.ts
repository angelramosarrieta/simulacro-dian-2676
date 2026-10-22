/**
 * Precios en USD por millón de tokens, para estimar y limitar el costo de
 * cada generación. Si el modelo no está en la tabla se usan precios altos a
 * propósito (para que los límites de costo corten antes, nunca después), o
 * los de AI_PRICE_INPUT_PER_MTOK / AI_PRICE_OUTPUT_PER_MTOK si se definen.
 */
type Price = { input: number; output: number; cacheRead: number; cacheWrite: number };

const TABLE: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

const CONSERVATIVE: Price = { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 };

export function priceFor(model: string): Price {
  const envIn = Number(process.env.AI_PRICE_INPUT_PER_MTOK);
  const envOut = Number(process.env.AI_PRICE_OUTPUT_PER_MTOK);
  if (envIn > 0 && envOut > 0) return { input: envIn, output: envOut, cacheRead: envIn * 0.1, cacheWrite: envIn * 1.25 };
  const key = Object.keys(TABLE).find((k) => model === k || model.startsWith(k));
  return key ? TABLE[key] : CONSERVATIVE;
}

export function costUsd(model: string, u: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }) {
  const p = priceFor(model);
  const v =
    (u.inputTokens * p.input + u.outputTokens * p.output + (u.cacheReadTokens ?? 0) * p.cacheRead + (u.cacheWriteTokens ?? 0) * p.cacheWrite) /
    1_000_000;
  return Math.round(v * 1e6) / 1e6;
}
