import { describe, expect, it } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";
import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";
import { TopInfluencingDomainsService } from "@/lib/ai/referralTraffic/topInfluencingDomainsService";

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
      sources: overrides.sources ?? [],
      citations: overrides.citations ?? [],
      links: overrides.links ?? [],
    },
  };
}

describe("TopInfluencingDomainsService", () => {
  it("aggregates domains by response count and reference frequency", () => {
    const service = new TopInfluencingDomainsService();

    const result = service.analyze([
      createStoredResponse({
        responseId: "ChatGPT:prompt-1",
        sources: [
          { name: "Wirecutter", url: "https://www.wirecutter.com/reviews/drills" },
          { name: "eBay seller guide", url: "https://www.ebay.com/sellercenter" },
        ],
        citations: [
          { title: "Best drill review", url: "https://www.wirecutter.com/reviews/drills-2026" },
        ],
        links: [{ label: "Shop on eBay", url: "https://www.ebay.com/itm/123" }],
      }),
      createStoredResponse({
        responseId: "Gemini:prompt-2",
        platform: AIPlatform.Gemini,
        sources: [{ name: "Wirecutter", url: "https://www.wirecutter.com/best-tools" }],
        links: [{ label: "Amazon", url: "https://www.amazon.com/dp/example" }],
      }),
    ]);

    expect(result.responseCount).toBe(2);
    expect(result.domains).toEqual([
      {
        domain: "wirecutter.com",
        responseCount: 2,
        referenceCount: 3,
        sourceCount: 2,
        citationCount: 1,
        linkCount: 0,
      },
      {
        domain: "ebay.com",
        responseCount: 1,
        referenceCount: 2,
        sourceCount: 1,
        citationCount: 0,
        linkCount: 1,
      },
      {
        domain: "amazon.com",
        responseCount: 1,
        referenceCount: 1,
        sourceCount: 0,
        citationCount: 0,
        linkCount: 1,
      },
    ]);
    expect(result.analyzedAt).toBeTypeOf("string");
  });
});