import { describe, expect, it } from "vitest";

import { AIPlatform, type AIResponse } from "@/lib/aiResponse";
import {
  InMemoryAIResponseRepository,
  toStoredResponse,
} from "@/lib/ai/storage/aiResponseRepository";

describe("InMemoryAIResponseRepository", () => {
  it("saves and retrieves responses by promptId", async () => {
    const repository = new InMemoryAIResponseRepository();

    const response: AIResponse = {
      promptId: "prompt-1",
      platform: AIPlatform.ChatGPT,
      model: "gpt-4o-mini",
      prompt: "Best cordless drill for beginners",
      responseText: "1. DeWalt 2. Bosch 3. Ryobi",
      timestamp: new Date().toISOString(),
      sources: [{ name: "Wirecutter", url: "https://example.com/wirecutter" }],
      citations: [{ title: "Top Picks", url: "https://example.com/top-picks" }],
      links: [{ label: "Amazon", url: "https://example.com/amazon" }],
      rankingOrder: ["DeWalt", "Bosch", "Ryobi"],
    };

    const stored = toStoredResponse(response);

    await repository.save(stored);

    const byPromptId = await repository.findByPromptId("prompt-1");
    const all = await repository.listAll();

    expect(byPromptId).toEqual(stored);
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(stored);
  });
});
