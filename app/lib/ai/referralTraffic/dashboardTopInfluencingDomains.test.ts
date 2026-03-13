import { describe, expect, it } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";
import { buildDashboardTopInfluencingDomains } from "@/lib/ai/referralTraffic/dashboardTopInfluencingDomains";
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

describe("buildDashboardTopInfluencingDomains", () => {
  it("returns current-month top domains with impact labels", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");

    const result = buildDashboardTopInfluencingDomains([
      createStoredResponse({
        responseId: "ChatGPT:prompt-current-1",
        timestamp: "2026-03-02T10:00:00.000Z",
        sources: [{ name: "Wirecutter", url: "https://www.wirecutter.com/reviews/drills" }],
        citations: [{ title: "eBay deals", url: "https://pages.ebay.com/deals" }],
      }),
      createStoredResponse({
        responseId: "ChatGPT:prompt-current-2",
        timestamp: "2026-03-05T10:00:00.000Z",
        links: [{ label: "Wirecutter article", url: "https://www.wirecutter.com/best-tools" }],
      }),
      createStoredResponse({
        responseId: "ChatGPT:prompt-previous",
        timestamp: "2026-02-05T10:00:00.000Z",
        links: [{ label: "Ignore previous month", url: "https://www.amazon.com/dp/example" }],
      }),
    ], now);

    expect(result).toEqual([
      {
        domain: "wirecutter.com",
        impact: "High influence",
        tone: "bg-rose-500/20 text-rose-300",
      },
      {
        domain: "pages.ebay.com",
        impact: "High influence",
        tone: "bg-rose-500/20 text-rose-300",
      },
    ]);
  });

  it("returns a fallback row when there are no cited domains", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");

    const result = buildDashboardTopInfluencingDomains([
      createStoredResponse({
        responseId: "ChatGPT:prompt-current",
        timestamp: "2026-03-05T10:00:00.000Z",
      }),
    ], now);

    expect(result).toEqual([
      {
        domain: "No cited domains yet",
        impact: "Awaiting responses",
        tone: "bg-zinc-500/20 text-zinc-300",
      },
    ]);
  });
});