import "server-only";
import OpenAI from "openai";
import { costUsd } from "@/lib/ai/pricing";
import { cfg } from "@/lib/config/runtime";
import { AiError, type AiJsonRequest, type AiJsonResult, type AiProvider } from "@/lib/ai/types";

export function createOpenAiProvider(): AiProvider {
  const apiKey = cfg("OPENAI_API_KEY");
  const model = cfg("OPENAI_MODEL");
  if (!apiKey) throw new AiError("not_configured", "Falta OPENAI_API_KEY", false);
  if (!model) throw new AiError("not_configured", "Falta OPENAI_MODEL", false);
  const client = new OpenAI({ apiKey, maxRetries: 2, timeout: 280_000 });

  return {
    name: "openai",
    model,
    async generateJson(req: AiJsonRequest): Promise<AiJsonResult> {
      const started = Date.now();
      const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
      if (req.cacheableContext) content.push({ type: "text", text: req.cacheableContext });
      for (const part of req.parts) {
        if (part.type === "text") content.push({ type: "text", text: part.text });
        else if (part.type === "pdf")
          content.push({ type: "file", file: { filename: part.filename, file_data: `data:application/pdf;base64,${part.base64}` } });
        else content.push({ type: "image_url", image_url: { url: `data:${part.mediaType};base64,${part.base64}` } });
      }

      let completion: OpenAI.Chat.Completions.ChatCompletion;
      try {
        completion = await client.chat.completions.create({
          model,
          max_completion_tokens: req.maxOutputTokens,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content },
          ],
          response_format: { type: "json_schema", json_schema: { name: req.schemaName, strict: true, schema: req.schema } },
        });
      } catch (e) {
        if (e instanceof OpenAI.RateLimitError) throw new AiError("rate_limited", "Límite de solicitudes del proveedor", true);
        if (e instanceof OpenAI.APIConnectionTimeoutError) throw new AiError("timeout", "Tiempo de espera agotado", true);
        if (e instanceof OpenAI.AuthenticationError || e instanceof OpenAI.PermissionDeniedError)
          throw new AiError("not_configured", "Credencial de OpenAI inválida", false);
        if (e instanceof OpenAI.BadRequestError) throw new AiError("provider_error", `Solicitud rechazada: ${e.message}`, false);
        if (e instanceof OpenAI.APIError) throw new AiError("provider_error", e.message, (e.status ?? 500) >= 500);
        throw e;
      }

      const u = completion.usage;
      const cached = u?.prompt_tokens_details?.cached_tokens ?? 0;
      const usage = {
        provider: "openai",
        model: completion.model || model,
        inputTokens: Math.max(0, (u?.prompt_tokens ?? 0) - cached),
        outputTokens: u?.completion_tokens ?? 0,
        cacheReadTokens: cached,
        cacheWriteTokens: 0,
        costUsd: 0,
        durationMs: Date.now() - started,
      };
      usage.costUsd = costUsd(usage.model, usage);

      const choice = completion.choices[0];
      if (choice?.message?.refusal) throw new AiError("refusal", "El modelo declinó la solicitud", false, usage);
      if (choice?.finish_reason === "length") throw new AiError("truncated", "Respuesta cortada por el límite de tokens", true, usage);
      try {
        return { data: JSON.parse(choice?.message?.content ?? ""), usage };
      } catch {
        throw new AiError("invalid_json", "La respuesta no es JSON válido", true, usage);
      }
    },
  };
}
