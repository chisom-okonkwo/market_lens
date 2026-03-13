import { describe, expect, it } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";
import { TopInfluencingDomainsService } from "@/lib/ai/referralTraffic/topInfluencingDomainsService";
import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";

function buildStoredResponse(overrides: Partial<AIStoredResponse>): AIStoredResponse {
	return {
		promptId: "prompt-1",
		responseId: "ChatGPT:prompt-1",
		platform: AIPlatform.ChatGPT,
		model: "gpt-4o-mini",
		prompt: "Where should I shop?",
		responseText: "See https://www.amazon.com and ebay.com for examples.",
		timestamp: new Date().toISOString(),
		sources: [],
		citations: [],
		links: [],
		rankingOrder: undefined,
		hallucinationDetected: false,
		overallAccuracyScore: 1,
		overallSeverity: "low",
		analysisPayload: {
			sources: [],
			citations: [],
			links: [],
			accuracyAnalysis: {
				responseId: "ChatGPT:prompt-1",
				results: [
					{
						claim: "Amazon is popular",
						isAccurate: true,
						hallucinationDetected: false,
						severity: "low",
						confidence: 0.9,
						explanation: "Observed reference",
						sourceReference: "https://docs.ebay.com/seller-guide",
					},
				],
				claimCount: 1,
				accurateCount: 1,
				hallucinationCount: 0,
				unverifiableCount: 0,
				overallAccuracyScore: 1,
				hallucinationDetected: false,
				overallSeverity: "low",
				summary: "Accurate",
				analyzedAt: new Date().toISOString(),
			},
		},
		...overrides,
	};
}

describe("TopInfluencingDomainsService", () => {
	it("prefers accuracy source references over incidental response-text domains", () => {
		const service = new TopInfluencingDomainsService();
		const result = service.analyze([
			buildStoredResponse({}),
		]);

		expect(result.domains.map((domain) => domain.domain)).toContain("ebay.com");
		expect(result.domains.map((domain) => domain.domain)).not.toContain("amazon.com");
	});

	it("falls back to explicit response-text URLs only when no stronger evidence exists", () => {
		const service = new TopInfluencingDomainsService();
		const result = service.analyze([
			buildStoredResponse({
				responseId: "ChatGPT:prompt-3",
				responseText: "Read more at https://www.amazon.com/deals and also ebay.com for comparison.",
				analysisPayload: {
					sources: [],
					citations: [],
					links: [],
				},
			}),
		]);

		expect(result.domains.map((domain) => domain.domain)).toContain("amazon.com");
		expect(result.domains.map((domain) => domain.domain)).not.toContain("ebay.com");
	});

	it("extracts domain-like source names even when URL fields are empty", () => {
		const service = new TopInfluencingDomainsService();
		const result = service.analyze([
			buildStoredResponse({
				responseId: "ChatGPT:prompt-2",
				sources: [{ name: "www.wayfair.com" }],
				analysisPayload: {
					sources: [{ name: "www.wayfair.com" }],
					citations: [],
					links: [],
				},
			}),
		]);

		expect(result.domains.map((domain) => domain.domain)).toContain("wayfair.com");
	});
});