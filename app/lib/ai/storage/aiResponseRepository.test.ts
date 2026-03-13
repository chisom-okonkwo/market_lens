import { describe, expect, it } from "vitest";

import { AIPlatform, type AIResponse } from "@/lib/aiResponse";
import { EntitySentiment } from "@/lib/ai/entityDetection/types";
import {
  type AIProcessedResponseRecord,
  InMemoryAIResponseRepository,
  toProcessedStoredResponse,
  toStoredResponse,
} from "@/lib/ai/storage/aiResponseRepository";

describe("InMemoryAIResponseRepository", () => {
  it("saves and retrieves raw responses by promptId", async () => {
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

    await repository.saveRawResponse(response);

    const byPromptId = await repository.findByPromptId("prompt-1");
    const all = await repository.listAll();

    expect(byPromptId).toEqual(stored);
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(stored);
  });

  it("overwrites the raw row with processed analysis data for the same response", async () => {
    const repository = new InMemoryAIResponseRepository();
    const extractedAt = new Date().toISOString();
    const analyzedAt = new Date().toISOString();

    const response: AIResponse = {
      promptId: "prompt-1",
      platform: AIPlatform.ChatGPT,
      model: "gpt-4o-mini",
      prompt: "Best cordless drill for beginners",
      responseText: "The best cordless drills include the DeWalt DCD771.",
      timestamp: new Date().toISOString(),
      sources: [{ name: "Wirecutter", url: "https://example.com/wirecutter" }],
      citations: [{ title: "Top Picks", url: "https://example.com/top-picks" }],
      links: [{ label: "Amazon", url: "https://example.com/amazon" }],
      rankingOrder: ["DeWalt", "Bosch", "Ryobi"],
    };

    await repository.saveRawResponse(response);

    const processedRecord: AIProcessedResponseRecord = {
      response,
      entityDetection: {
        responseId: "ChatGPT:prompt-1",
        brandMentions: ["DeWalt"],
        productMentions: ["DeWalt DCD771"],
        retailerMentions: ["Amazon"],
        claims: ["The best cordless drills include the DeWalt DCD771"],
        sentiment: EntitySentiment.Positive,
        rawText: response.responseText,
        extractedAt,
      },
      accuracyAnalysis: {
        responseId: "ChatGPT:prompt-1",
        results: [
          {
            claim: "The best cordless drills include the DeWalt DCD771",
            isAccurate: true,
            hallucinationDetected: false,
            severity: "low",
            confidence: 0.95,
            explanation: "Claim exactly matches a known ground truth fact.",
            matchedGroundTruth: "The best cordless drills include the DeWalt DCD771",
            sourceReference: "https://example.com/reviews",
          },
        ],
        claimCount: 1,
        accurateCount: 1,
        hallucinationCount: 0,
        unverifiableCount: 0,
        overallAccuracyScore: 1,
        hallucinationDetected: false,
        overallSeverity: "low",
        summary: "All 1 claim verified against known facts.",
        analyzedAt,
      },
    };

    await repository.saveProcessedResponse(processedRecord);

    const byPromptId = await repository.findByPromptId("prompt-1");
    const processed = toProcessedStoredResponse(processedRecord);

    expect(byPromptId).toEqual(processed);
  });
});
