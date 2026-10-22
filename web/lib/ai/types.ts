export type AiInputPart =
  | { type: "text"; text: string }
  | { type: "pdf"; base64: string; filename: string }
  | { type: "image"; base64: string; mediaType: "image/png" | "image/jpeg" | "image/webp"; filename: string };

export type AiJsonRequest = {
  /** Etapa (para el registro de consumo): "analysis", "batch:3"... */
  step: string;
  system: string;
  /** Bloque estable que conviene cachear entre llamadas (marco normativo, reglas). */
  cacheableContext?: string;
  parts: AiInputPart[];
  schemaName: string;
  /** JSON Schema estricto: todos los campos requeridos y additionalProperties:false. */
  schema: Record<string, unknown>;
  maxOutputTokens: number;
};

export type AiUsage = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  durationMs: number;
};

export type AiJsonResult = { data: unknown; usage: AiUsage };

export class AiError extends Error {
  constructor(
    public code: "not_configured" | "refusal" | "truncated" | "invalid_json" | "rate_limited" | "provider_error" | "timeout",
    message: string,
    public retryable: boolean,
    public usage?: AiUsage
  ) {
    super(message);
  }
}

export interface AiProvider {
  name: string;
  model: string;
  generateJson(req: AiJsonRequest): Promise<AiJsonResult>;
}
