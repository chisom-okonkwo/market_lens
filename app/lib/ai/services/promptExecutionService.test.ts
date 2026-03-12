import { describe, expect, it, vi } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";
import { type AIConnector } from "@/lib/ai/connectors/types";
import { PromptExecutionService } from "@/lib/ai/services/promptExecutionService";
import { type AIResponseRepository } from "@/lib/ai/storage/aiResponseRepository";

describe("PromptExecutionService", () => {
  it("returns structured AIResponse entries for all registered connectors", async () => {
    const repository: AIResponseRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findByPromptId: vi.fn(),
      listAll: vi.fn(),
    };

    const connector: AIConnector = {
      platform: AIPlatform.ChatGPT,
      executePrompt: vi.fn().mockResolvedValue({
        promptId: "test-prompt-id",
        platform: AIPlatform.ChatGPT,
        model: "gpt-4o-mini",
        prompt: "Best cordless drill for beginners",
        responseText: "DeWalt is a top beginner-friendly option.",
        timestamp: new Date().toISOString(),
        sources: [{ name: "Tech Radar", url: "https://example.com/tech-radar" }],
        citations: [{ title: "Review", url: "https://example.com/review" }],
        links: [{ label: "Home Depot", url: "https://example.com/home-depot" }],
        rankingOrder: ["DeWalt", "Bosch", "Ryobi"],
      }),
    };

    const service = new PromptExecutionService([connector], repository);
    const result = await service.execute("  Best cordless drill for beginners  ");

    expect(connector.executePrompt).toHaveBeenCalledWith("Best cordless drill for beginners");
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith({
      promptId: "test-prompt-id",
      platform: AIPlatform.ChatGPT,
      model: "gpt-4o-mini",
      prompt: "Best cordless drill for beginners",
      responseText: "DeWalt is a top beginner-friendly option.",
      timestamp: result[0].timestamp,
      sources: [{ name: "Tech Radar", url: "https://example.com/tech-radar" }],
      citations: [{ title: "Review", url: "https://example.com/review" }],
      links: [{ label: "Home Depot", url: "https://example.com/home-depot" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe(AIPlatform.ChatGPT);
    expect(result[0].model).toBe("gpt-4o-mini");
    expect(result[0].prompt).toBe("Best cordless drill for beginners");
    expect(result[0].responseText).toContain("DeWalt");
    expect(result[0].sources).toHaveLength(1);
    expect(result[0].citations).toHaveLength(1);
    expect(result[0].links).toHaveLength(1);
    expect(result[0].rankingOrder).toEqual(["DeWalt", "Bosch", "Ryobi"]);
    expect(result[0].promptId).toBe("test-prompt-id");
    expect(Number.isNaN(Date.parse(result[0].timestamp))).toBe(false);
  });

  it("throws when prompt is empty", async () => {
    const repository: AIResponseRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findByPromptId: vi.fn(),
      listAll: vi.fn(),
    };

    const service = new PromptExecutionService([], repository);

    await expect(service.execute("   ")).rejects.toThrow(
      "Prompt is required and cannot be empty.",
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("throws when no connectors are configured", async () => {
    const repository: AIResponseRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findByPromptId: vi.fn(),
      listAll: vi.fn(),
    };

    const service = new PromptExecutionService([], repository);

    await expect(service.execute("Best cordless drill")).rejects.toThrow(
      "No AI connectors are configured.",
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
