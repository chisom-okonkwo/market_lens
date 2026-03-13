import { describe, expect, it } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";
import { ReferralTrafficService } from "@/lib/ai/referralTraffic/referralTrafficService";
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
      sources: overrides.sources ?? [],
      citations: overrides.citations ?? [],
      links: overrides.links ?? [],
    },
  };
}

describe("ReferralTrafficService", () => {
  it("counts unique tracked-domain source, citation, and link references", () => {
    const service = new ReferralTrafficService();

    const result = service.analyze({
      trackedDomains: ["ebay.com"],
      responses: [
        createStoredResponse({
          responseId: "ChatGPT:prompt-1",
          sources: [
            { name: "eBay seller guide", url: "https://www.ebay.com/sellercenter" },
            { name: "Other source", url: "https://example.com/post" },
          ],
          citations: [
            { title: "eBay deals", url: "https://pages.ebay.com/deals" },
            { title: "duplicate source", url: "https://www.ebay.com/sellercenter" },
          ],
          links: [
            { label: "Shop on eBay", url: "https://www.ebay.com/itm/123" },
            { label: "External", url: "https://amazon.com/item/1" },
          ],
        }),
        createStoredResponse({
          responseId: "Gemini:prompt-2",
          platform: AIPlatform.Gemini,
          sources: [{ name: "Neutral source", url: "https://wirecutter.com/best" }],
        }),
      ],
    });

    expect(result.trackedDomains).toEqual(["ebay.com"]);
    expect(result.responseCount).toBe(2);
    expect(result.referralResponseCount).toBe(1);
    expect(result.referralCount).toBe(3);
    expect(result.uniqueUrlCount).toBe(3);
    expect(result.responseBreakdown).toEqual([
      {
        responseId: "ChatGPT:prompt-1",
        platform: AIPlatform.ChatGPT,
        referralDetected: true,
        referralCount: 3,
        matchedReferences: [
          {
            url: "https://www.ebay.com/sellercenter",
            host: "ebay.com",
            field: "citation",
          },
          {
            url: "https://pages.ebay.com/deals",
            host: "pages.ebay.com",
            field: "citation",
          },
          {
            url: "https://www.ebay.com/itm/123",
            host: "ebay.com",
            field: "link",
          },
        ],
      },
      {
        responseId: "Gemini:prompt-2",
        platform: AIPlatform.Gemini,
        referralDetected: false,
        referralCount: 0,
        matchedReferences: [],
      },
    ]);
  });

  it("throws when tracked domains are empty", () => {
    const service = new ReferralTrafficService();

    expect(() =>
      service.analyze({
        trackedDomains: ["   "],
        responses: [],
      }),
    ).toThrow("trackedDomains must contain at least one non-empty domain.");
  });
});