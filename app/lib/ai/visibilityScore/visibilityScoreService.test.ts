import { describe, expect, it } from "vitest";

import { AIPlatform, type AIResponse } from "@/lib/aiResponse";
import { EntitySentiment } from "@/lib/ai/entityDetection/types";
import {
  toProcessedStoredResponse,
  type AIProcessedResponseRecord,
} from "@/lib/ai/storage/aiResponseRepository";
import { VisibilityScoreService } from "@/lib/ai/visibilityScore/visibilityScoreService";

function buildStoredResponse(overrides: {
  promptId: string;
  responseText: string;
  sentiment: "positive" | "neutral" | "negative";
  hallucinationDetected: boolean;
  overallSeverity?: "low" | "medium" | "high";
}) {
  const response: AIResponse = {
    promptId: overrides.promptId,
    platform: AIPlatform.ChatGPT,
    model: "gpt-4o-mini",
    prompt: "Where should I buy tools?",
    responseText: overrides.responseText,
    timestamp: new Date().toISOString(),
    sources: [],
    citations: [],
    links: [],
    rankingOrder: undefined,
  };

  const processedRecord: AIProcessedResponseRecord = {
    response,
    entityDetection: {
      responseId: `ChatGPT:${overrides.promptId}`,
      brandMentions: [],
      productMentions: [],
      retailerMentions: [],
      claims: [overrides.responseText],
      sentiment:
        overrides.sentiment === "positive"
          ? EntitySentiment.Positive
          : overrides.sentiment === "negative"
            ? EntitySentiment.Negative
            : EntitySentiment.Neutral,
      rawText: overrides.responseText,
      extractedAt: new Date().toISOString(),
    },
    accuracyAnalysis: {
      responseId: `ChatGPT:${overrides.promptId}`,
      results: [],
      claimCount: 1,
      accurateCount: overrides.hallucinationDetected ? 0 : 1,
      hallucinationCount: overrides.hallucinationDetected ? 1 : 0,
      unverifiableCount: 0,
      overallAccuracyScore: overrides.hallucinationDetected ? 0 : 1,
      hallucinationDetected: overrides.hallucinationDetected,
      overallSeverity: overrides.overallSeverity ?? "low",
      summary: overrides.hallucinationDetected ? "Hallucination detected." : "Accurate.",
      analyzedAt: new Date().toISOString(),
    },
  };

  return toProcessedStoredResponse(processedRecord);
}

describe("VisibilityScoreService", () => {
  it("scores responses higher when tracked terms are mentioned positively", () => {
    const service = new VisibilityScoreService();

    const result = service.analyze({
      trackedTerms: ["eBay"],
      responses: [
        buildStoredResponse({
          promptId: "prompt-1",
          responseText: "eBay is a great place to buy Bosch drills.",
          sentiment: "positive",
          hallucinationDetected: false,
        }),
      ],
    });

    expect(result.responseCount).toBe(1);
    expect(result.mentioningResponseCount).toBe(1);
    expect(result.mentionRate).toBe(1);
    expect(result.positiveResponseCount).toBe(1);
    expect(result.hallucinatedResponseCount).toBe(0);
    expect(result.overallScore).toBe(90);
    expect(result.responseBreakdown[0]?.matchedTerms).toEqual(["eBay"]);
  });

  it("penalizes hallucinated responses even when the tracked term is mentioned", () => {
    const service = new VisibilityScoreService();

    const result = service.analyze({
      trackedTerms: ["eBay"],
      responses: [
        buildStoredResponse({
          promptId: "prompt-1",
          responseText: "eBay sells a product with impossible battery life.",
          sentiment: "positive",
          hallucinationDetected: true,
          overallSeverity: "high",
        }),
      ],
    });

    expect(result.hallucinatedResponseCount).toBe(1);
    expect(result.overallScore).toBe(75);
    expect(result.responseBreakdown[0]?.hallucinationDetected).toBe(true);
  });

  it("tracks mention rate across multiple responses", () => {
    const service = new VisibilityScoreService();

    const result = service.analyze({
      trackedTerms: ["eBay"],
      responses: [
        buildStoredResponse({
          promptId: "prompt-1",
          responseText: "eBay is a strong option for shoppers.",
          sentiment: "neutral",
          hallucinationDetected: false,
        }),
        buildStoredResponse({
          promptId: "prompt-2",
          responseText: "Amazon is widely available.",
          sentiment: "neutral",
          hallucinationDetected: false,
        }),
      ],
    });

    expect(result.responseCount).toBe(2);
    expect(result.mentioningResponseCount).toBe(1);
    expect(result.mentionRate).toBe(0.5);
    expect(result.overallScore).toBe(40);
  });

  it("throws when tracked terms are empty", () => {
    const service = new VisibilityScoreService();

    expect(() =>
      service.analyze({
        trackedTerms: ["   "],
        responses: [],
      }),
    ).toThrow("trackedTerms must contain at least one non-empty term.");
  });
});