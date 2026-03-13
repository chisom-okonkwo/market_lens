import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";

const { listAllMock } = vi.hoisted(() => ({
  listAllMock: vi.fn(),
}));

vi.mock("@/lib/ai/storage/aiResponseRepository", () => ({
  aiResponseRepository: {
    listAll: listAllMock,
  },
}));

import DashboardPage from "@/app/dashboard/page";

describe("DashboardPage", () => {
  afterEach(() => {
    cleanup();
    listAllMock.mockReset();
  });

  it("renders the rebuilt dashboard with live overview data and tab navigation", async () => {
    const now = new Date();
    const currentMonthTimestamp = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10),
    ).toISOString();
    const previousMonthTimestamp = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 10),
    ).toISOString();

    listAllMock.mockResolvedValue([
      {
        promptId: "prompt-current",
        responseId: "ChatGPT:prompt-current",
        platform: AIPlatform.ChatGPT,
        model: "gpt-4o-mini",
        prompt: "Where should I shop?",
        responseText: "eBay is a great option for shoppers.",
        timestamp: currentMonthTimestamp,
        sources: [{ name: "eBay seller guide", url: "https://www.ebay.com/sellercenter" }],
        citations: [{ title: "eBay deals", url: "https://pages.ebay.com/deals" }],
        links: [{ label: "Shop on eBay", url: "https://www.ebay.com/itm/123" }],
        rankingOrder: undefined,
        hallucinationDetected: true,
        overallAccuracyScore: 0.4,
        overallSeverity: "high",
        analysisPayload: {
          sources: [{ name: "eBay seller guide", url: "https://www.ebay.com/sellercenter" }],
          citations: [{ title: "eBay deals", url: "https://pages.ebay.com/deals" }],
          links: [{ label: "Shop on eBay", url: "https://www.ebay.com/itm/123" }],
          entityDetection: {
            responseId: "ChatGPT:prompt-current",
            brandMentions: ["eBay"],
            productMentions: [],
            retailerMentions: [],
            claims: ["eBay is a great option for shoppers"],
            sentiment: "positive",
            rawText: "eBay is a great option for shoppers.",
            extractedAt: currentMonthTimestamp,
          },
          accuracyAnalysis: {
            responseId: "ChatGPT:prompt-current",
            results: [
              {
                claim: "eBay guarantees same-day delivery for every listing.",
                hallucinationDetected: true,
                matchedGroundTruth: "Shipping speed depends on the seller and shipping option.",
                explanation: "The statement introduces a guarantee not supported by source facts.",
                confidence: 0.94,
                severity: "high",
                sourceReference: "shipping-policy",
              },
              {
                claim: "All eBay sellers pay a flat 20% fee.",
                hallucinationDetected: true,
                matchedGroundTruth: "Fees vary by category and seller plan.",
                explanation: "The fixed percentage conflicts with the policy.",
                confidence: 0.87,
                severity: "medium",
                sourceReference: "seller-fees",
              },
            ],
            claimCount: 1,
            accurateCount: 0,
            hallucinationCount: 2,
            unverifiableCount: 0,
            overallAccuracyScore: 0.4,
            hallucinationDetected: true,
            overallSeverity: "high",
            summary: "Two hallucinated claims detected.",
            analyzedAt: currentMonthTimestamp,
          },
        },
      },
      {
        promptId: "prompt-previous",
        responseId: "ChatGPT:prompt-previous",
        platform: AIPlatform.ChatGPT,
        model: "gpt-4o-mini",
        prompt: "Where should I shop?",
        responseText: "eBay is available to buyers.",
        timestamp: previousMonthTimestamp,
        sources: [],
        citations: [],
        links: [{ label: "Older eBay link", url: "https://www.ebay.com/itm/previous" }],
        rankingOrder: undefined,
        hallucinationDetected: false,
        overallAccuracyScore: 1,
        overallSeverity: "low",
        analysisPayload: {
          sources: [],
          citations: [],
          links: [{ label: "Older eBay link", url: "https://www.ebay.com/itm/previous" }],
          entityDetection: {
            responseId: "ChatGPT:prompt-previous",
            brandMentions: ["eBay"],
            productMentions: [],
            retailerMentions: [],
            claims: ["eBay is available to buyers"],
            sentiment: "neutral",
            rawText: "eBay is available to buyers.",
            extractedAt: previousMonthTimestamp,
          },
          accuracyAnalysis: {
            responseId: "ChatGPT:prompt-previous",
            results: [],
            claimCount: 1,
            accurateCount: 1,
            hallucinationCount: 0,
            unverifiableCount: 0,
            overallAccuracyScore: 1,
            hallucinationDetected: false,
            overallSeverity: "low",
            summary: "Accurate.",
            analyzedAt: previousMonthTimestamp,
          },
        },
      },
    ]);

    render(await DashboardPage());

    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("AI visibility score").length).toBeGreaterThan(0);
    expect(screen.getAllByText("75%").length).toBeGreaterThan(0);
    expect(screen.getByText("-6% vs previous month")).toBeInTheDocument();
    expect(screen.getByText("Hallucinations active")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getByText("1 high severity this month")).toBeInTheDocument();
    expect(screen.getByText("Influencing sources")).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getByText("+200% vs previous month")).toBeInTheDocument();
    expect(screen.getByText("Strong AI recommendation presence")).toBeInTheDocument();
    expect(screen.getAllByText("Top influencing domains").length).toBeGreaterThan(0);
    expect(screen.getByText("ebay.com")).toBeInTheDocument();
    expect(screen.getByText("pages.ebay.com")).toBeInTheDocument();
    expect(screen.getAllByText("High influence")).toHaveLength(2);
    expect(screen.getByText("Category visibility breakdown")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fix weak categories" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Competitors" }));
    expect(screen.getByTestId("dashboard-competitors")).toBeInTheDocument();
    expect(screen.getByText("Competitor tactics you can replicate this month")).toBeInTheDocument();
    expect(screen.getByText("Amazon")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ad sources" }));
    expect(screen.getByTestId("dashboard-sources")).toBeInTheDocument();
    expect(screen.getByText("Sources by influence score")).toBeInTheDocument();
    expect(screen.getByText("pages.ebay.com")).toBeInTheDocument();
    expect(screen.getByText("Recommended ad budget allocation")).toBeInTheDocument();
  });
});