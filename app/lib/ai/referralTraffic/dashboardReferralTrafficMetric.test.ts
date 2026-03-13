import { describe, expect, it } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";
import { buildDashboardReferralTrafficMetric } from "@/lib/ai/referralTraffic/dashboardReferralTrafficMetric";
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

describe("buildDashboardReferralTrafficMetric", () => {
  it("summarizes current-month referral opportunities and previous-month delta", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");

    const metric = buildDashboardReferralTrafficMetric([
      createStoredResponse({
        responseId: "ChatGPT:prompt-current",
        timestamp: "2026-03-05T10:00:00.000Z",
        sources: [{ name: "eBay source", url: "https://www.ebay.com/sellercenter" }],
        citations: [{ title: "eBay deals", url: "https://pages.ebay.com/deals" }],
        links: [{ label: "Shop on eBay", url: "https://www.ebay.com/itm/123" }],
      }),
      createStoredResponse({
        responseId: "ChatGPT:prompt-previous",
        timestamp: "2026-02-05T10:00:00.000Z",
        links: [{ label: "Older link", url: "https://www.ebay.com/itm/previous" }],
      }),
    ], now);

    expect(metric).toEqual({
      referralCount: 3,
      countLabel: "3",
      deltaLabel: "+200% vs previous month",
      deltaTone: "text-emerald-400",
    });
  });

  it("returns a no-data state when there is no previous month data", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");

    const metric = buildDashboardReferralTrafficMetric([
      createStoredResponse({
        responseId: "ChatGPT:prompt-current",
        timestamp: "2026-03-05T10:00:00.000Z",
        sources: [{ name: "eBay source", url: "https://www.ebay.com/sellercenter" }],
      }),
    ], now);

    expect(metric).toEqual({
      referralCount: 1,
      countLabel: "1",
      deltaLabel: "No previous month data",
      deltaTone: "text-zinc-400",
    });
  });
});