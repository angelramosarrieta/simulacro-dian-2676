import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { costUsd } from "@/lib/ai/pricing";
import { AiError, type AiJsonRequest, type AiJsonResult, type AiProvider } from "@/lib/ai/types";

// Modelo por defecto: Claude Opus 5.5. Para bajar costos se puede usar
// AI_MODEL=claude-sonnet-5-5 (ver docs/INTEGRACIONES.md).
const DEFAULT_MODEL = "claude-opus-5-5";

export function createAnthropicProvider(): AiProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError("not_configured", "Falta ANTHROPIC_API_KEY", false);
  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  // Reintentos propios del SDK para 429/5xx/errores de red; el worker reintenta además por etapa.
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 280_000 });
  const effort = (process.env.AI_EFFORT as "low" | "medium" | "high" | undefined) || "medium";

  return {
    name: "anthropic",
    model,
    async generateJson(req: AiJsonRequest): Promise<AiJsonResult> {
      const started = Date.now();
      const content: Anthropic.Beta.Messages.BetaContentBlockParam[] = [];
      for (const part of req.parts) {
        if (part.type === "text") content.push({ type: "text", text: part.text });
        else if (part.type === "pdf")
          content.push({ type: "document", title: part.filename, source: { type: "base64", media_type: "application/pdf", data: part.base64 } });
        else content.push({ type: "image", source: { type: "base64", media_type: part.mediaType, data: part.base64 } });
      }

      const system: Anthropic.Beta.Messages.BetaTextBlockParam[] = [{ type: "text", text: req.system }];
      if (req.cacheableContext) system.push({ type: "text", text: req.cacheableContext, cache_control: { type: "ephemeral" } });

      let message: Anthropic.Beta.Messages.BetaMessage;
      try {
        const stream = client.beta.messages.stream({
          model,
          max_tokens: req.maxOutputTokens,
          system,
          messages: [{ role: "user", content }],
          output_config: { effort, format: { type: "json_schema", schema: req.schema } },
          // Si el modelo declina por política, el servidor reintenta con su modelo de respaldo.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
        message = await stream.finalMessage();
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) throw new AiError("rate_limited", "Límite de solicitudes del proveedor", true);
        if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AiError("timeout", "Tiempo de espera agotado", true);
        if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
          throw new AiError("not_configured", "Credencial de Anthropic inválida", false);
        if (e instanceof Anthropic.BadRequestError) throw new AiError("provider_error", `Solicitud rechazada: ${e.message}`, false);
        if (e instanceof Anthropic.APIError) throw new AiError("provider_error", e.message, (e.status ?? 500) >= 500);
        if (e instanceof Anthropic.APIConnectionError) throw new AiError("provider_error", "Sin conexión con el proveedor", true);
        throw e;
      }

      const u = message.usage;
      const usedModel = message.model || model;
      const usage = {
        provider: "anthropic",
        model: usedModel,
        inputTokens: u.input_tokens ?? 0,
        outputTokens: u.output_tokens ?? 0,
        cacheReadTokens: u.cache_read_input_tokens ?? 0,
        cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
        costUsd: 0,
        durationMs: Date.now() - started,
      };
      usage.costUsd = costUsd(usedModel, usage);

      if (message.stop_reason === "refusal") throw new AiError("refusal", "El modelo declinó la solicitud", false, usage);
      if (message.stop_reason === "max_tokens") throw new AiError("truncated", "Respuesta cortada por el límite de tokens", true, usage);

      const text = message.content
        .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      try {
        return { data: JSON.parse(text), usage };
      } catch {
        throw new AiError("invalid_json", "La respuesta no es JSON válido", true, usage);
      }
    },
  };
}
