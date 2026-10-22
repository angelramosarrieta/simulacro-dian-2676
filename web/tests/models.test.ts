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
