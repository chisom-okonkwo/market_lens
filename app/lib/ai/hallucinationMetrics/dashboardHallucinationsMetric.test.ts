import { describe, expect, it } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";
import { buildDashboardHallucinationsMetric } from "@/lib/ai/hallucinationMetrics/dashboardHallucinationsMetric";
import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";

function createStoredResponse(
  overrides: Partial<AIStoredResponse> = {},
): AIStoredResponse {
  return {
    promptId: overrides.promptId ?? "prompt-1",
    responseId: overrides.responseId ?? "ChatGPT:prompt-1",
    platform: overrides.platform ?? AIPlatform.ChatGPT,
    model: overrides.model ?? "gpt-4o-mini",
    prompt: overrides.prompt ?? "Where should I shop?",
    responseText: overrides.responseText ?? "eBay is a good option.",
    timestamp: overrides.timestamp ?? "2026-03-10T00:00:00.000Z",
    sources: overrides.sources ?? [],
    citations: overrides.citations ?? [],
    links: overrides.links ?? [],
    rankingOrder: overrides.rankingOrder,
    hallucinationDetected: overrides.hallucinationDetected ?? false,
    overallAccuracyScore: overrides.overallAccuracyScore ?? 1,
    overallSeverity: overrides.overallSeverity ?? "low",
    analysisPayload: overrides.analysisPayload ?? {
      sources: [],
      citations: [],
      links: [],
    },
  };
}

describe("buildDashboardHallucinationsMetric", () => {
  it("summarizes current-month hallucination counts and high severity claims", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");

    const metric = buildDashboardHallucinationsMetric([
      createStoredResponse({
        responseId: "ChatGPT:prompt-current",
        timestamp: "2026-03-05T10:00:00.000Z",
        hallucinationDetected: true,
        overallSeverity: "high",
        analysisPayload: {
          sources: [],
          citations: [],
          links: [],
          accuracyAnalysis: {
            responseId: "ChatGPT:prompt-current",
            results: [
              {
                claim: "eBay guarantees same-day delivery for every listing.",
                hallucinationDetected: true,
                matchedGroundTruth: "Shipping speed depends on the seller and shipping option.",
                explanation: "The statement introduces a guarantee not supported by the source facts.",
                confidence: 0.94,
                severity: "high",
                sourceReference: "shipping-policy",
              },
              {
                claim: "All eBay sellers pay a flat 20% fee.",
                hallucinationDetected: true,
                matchedGroundTruth: "Fees vary by category and seller plan.",
                explanation: "The fixed percentage is unsupported and conflicts with the policy.",
                confidence: 0.87,
                severity: "medium",
                sourceReference: "seller-fees",
              },
            ],
            claimCount: 2,
            accurateCount: 0,
            hallucinationCount: 2,
            unverifiableCount: 0,
            overallAccuracyScore: 0,
            hallucinationDetected: true,
            overallSeverity: "high",
            summary: "Two hallucinated claims detected.",
            analyzedAt: "2026-03-05T10:00:00.000Z",
          },
        },
      }),
      createStoredResponse({
        responseId: "ChatGPT:prompt-previous",
        timestamp: "2026-02-05T10:00:00.000Z",
        hallucinationDetected: true,
      }),
    ], now);

    expect(metric).toEqual({
      count: 2,
      countLabel: "2",
      deltaLabel: "1 high severity this month",
      deltaTone: "text-rose-400",
    });
  });

  it("returns a no-issues state when the current month has no hallucinations", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");

    const metric = buildDashboardHallucinationsMetric([
      createStoredResponse({
        responseId: "ChatGPT:prompt-current",
        timestamp: "2026-03-05T10:00:00.000Z",
      }),
    ], now);

    expect(metric).toEqual({
      count: 0,
      countLabel: "0",
      deltaLabel: "No hallucinations this month",
      deltaTone: "text-emerald-400",
    });
  });
});