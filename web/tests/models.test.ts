import { describe, expect, it } from "vitest";
import { isOpenAiChatModel, sortModels } from "@/lib/ai/models";

describe("lista de modelos de OpenAI", () => {
  it("deja solo modelos de chat", () => {
    const ids = ["gpt-4.1", "gpt-4o-mini", "o4-mini", "o3", "text-embedding-3-large", "whisper-1", "tts-1", "dall-e-3", "gpt-4o-realtime-preview", "gpt-image-1", "omni-moderation-latest", "gpt-4o-mini-transcribe", "davinci-002"];
    expect(ids.filter(isOpenAiChatModel)).toEqual(["gpt-4.1", "gpt-4o-mini", "o4-mini", "o3"]);
  });

  it("muestra primero los modelos base y luego las versiones fechadas, sin repetir", () => {
    expect(sortModels(["gpt-4o-2024-08-06", "gpt-4.1", "gpt-4o", "gpt-4.1", "gpt-5"])).toEqual(["gpt-5", "gpt-4o", "gpt-4.1", "gpt-4o-2024-08-06"]);
  });
});

import { costUsd, knownModel, parseOverride, priceFor } from "@/lib/ai/pricing";

describe("precios de OpenAI", () => {
  it("reconoce las versiones fechadas por su modelo base (el más específico gana)", () => {
    expect(priceFor("gpt-5-mini-2025-08-07").output).toBe(2);
    expect(priceFor("gpt-5-2025-08-07").output).toBe(10);
    expect(priceFor("gpt-4o-mini").input).toBe(0.15);
    expect(knownModel("gpt-5-mini-2025-08-07")).toBe(true);
    expect(knownModel("gpt-9-turbo")).toBe(false);
  });

  it("la generación de prueba con gpt-5-mini costó centavos, no 3,43 USD", () => {
    const c = costUsd("gpt-5-mini-2025-08-07", { inputTokens: 28838, outputTokens: 63158, cacheReadTokens: 2176 });
    expect(c).toBeGreaterThan(0.13);
    expect(c).toBeLessThan(0.14);
  });

  it("el precio fijado en el panel tiene prioridad y se valida", () => {
    expect(priceFor("gpt-5-mini", parseOverride("1", "4"))).toMatchObject({ input: 1, output: 4, cacheRead: 0.1 });
    expect(parseOverride("", "4")).toBeNull();
    expect(parseOverride("abc", "4")).toBeNull();
  });
});

describe("gpt-5.4-mini", () => {
  it("tiene precio y no se confunde con gpt-5", () => {
    expect(priceFor("gpt-5.4-mini-2026-03-17")).toMatchObject({ input: 0.75, output: 4.5 });
    expect(knownModel("gpt-5.4-mini")).toBe(true);
  });
});
