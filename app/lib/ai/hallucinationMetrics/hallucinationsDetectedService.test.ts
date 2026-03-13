import { describe, expect, it } from "vitest";

import { HallucinationsDetectedService } from "@/lib/ai/hallucinationMetrics/hallucinationsDetectedService";
import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";

function createStoredResponse(
  overrides: Partial<AIStoredResponse> = {},
): AIStoredResponse {
  return {
    id: overrides.id ?? "stored-response-1",
    promptId: overrides.promptId ?? "prompt-1",
    responseId: overrides.responseId ?? "response-1",
    platform: overrides.platform ?? "chatgpt",
    promptText: overrides.promptText ?? "What should I buy on eBay?",
    responseText: overrides.responseText ?? "Default response",
    createdAt: overrides.createdAt ?? "2025-03-15T10:00:00.000Z",
    analysisPayload: overrides.analysisPayload ?? {},
    entityDetection: overrides.entityDetection,
    accuracyAnalysis: overrides.accuracyAnalysis,
    hallucinationCount: overrides.hallucinationCount ?? 0,
    hallucinationDetected: overrides.hallucinationDetected ?? false,
    overallSeverity: overrides.overallSeverity ?? "low",
  };
}

describe("HallucinationsDetectedService", () => {
  it("aggregates hallucinated claims and severities across responses", () => {
    const service = new HallucinationsDetectedService();

    const result = service.analyze([
      createStoredResponse({
        responseId: "response-1",
        platform: "chatgpt",
        analysisPayload: {
          accuracyAnalysis: {
            responseId: "response-1",
            hallucinationDetected: true,
            hallucinationCount: 2,
            overallSeverity: "high",
            results: [
              {
                claim: "eBay guarantees same-day delivery for all items.",
                hallucinationDetected: true,
                matchedGroundTruth: "eBay delivery time varies by seller and shipping method.",
                explanation: "The claim overstates a guarantee that is not present in the ground truth.",
                confidence: 0.96,
                severity: "high",
                sourceReference: "shipping-policy",
              },
              {
                claim: "eBay charges a mandatory 20% fee on every transaction.",
                hallucinationDetected: true,
                matchedGroundTruth: "Fees vary by listing type, category, and seller plan.",
                explanation: "The fee percentage is fabricated and contradicted by the source facts.",
                confidence: 0.82,
                severity: "medium",
                sourceReference: "seller-fees",
              },
            ],
          },
        },
        hallucinationDetected: true,
        hallucinationCount: 2,
        overallSeverity: "high",
      }),
      createStoredResponse({
        responseId: "response-2",
        platform: "gemini",
        analysisPayload: {
          accuracyAnalysis: {
            responseId: "response-2",
            hallucinationDetected: false,
            hallucinationCount: 0,
            overallSeverity: "low",
            results: [
              {
                claim: "eBay has buyer protection on eligible purchases.",
                hallucinationDetected: false,
                matchedGroundTruth: "eBay Money Back Guarantee applies to eligible transactions.",
                explanation: "The claim aligns with the available ground truth.",
                confidence: 0.21,
                severity: "low",
                sourceReference: "buyer-protection",
              },
            ],
          },
        },
        hallucinationDetected: false,
        hallucinationCount: 0,
        overallSeverity: "low",
      }),
      createStoredResponse({
        responseId: "response-3",
        platform: "claude",
        analysisPayload: {
          accuracyAnalysis: {
            responseId: "response-3",
            hallucinationDetected: true,
            hallucinationCount: 1,
            overallSeverity: "low",
            results: [
              {
                claim: "eBay offers free product authentication on every listing.",
                hallucinationDetected: true,
                matchedGroundTruth: "Authentication is available for selected categories and items.",
                explanation: "The claim expands the program beyond the supported categories.",
                confidence: 0.68,
                severity: "low",
                sourceReference: "authentication-program",
              },
            ],
          },
        },
        hallucinationDetected: true,
        hallucinationCount: 1,
        overallSeverity: "low",
      }),
    ]);

    expect(result.responseCount).toBe(3);
    expect(result.hallucinatedResponseCount).toBe(2);
    expect(result.hallucinatedClaimCount).toBe(3);
    expect(result.highSeverityCount).toBe(1);
    expect(result.mediumSeverityCount).toBe(1);
    expect(result.lowSeverityCount).toBe(1);
    expect(result.responseBreakdown).toEqual([
      {
        responseId: "response-1",
        platform: "chatgpt",
        hallucinationDetected: true,
        hallucinationCount: 2,
        overallSeverity: "high",
        hallucinatedClaims: [
          {
            claim: "eBay guarantees same-day delivery for all items.",
            severity: "high",
            confidence: 0.96,
            explanation: "The claim overstates a guarantee that is not present in the ground truth.",
            matchedGroundTruth: "eBay delivery time varies by seller and shipping method.",
            sourceReference: "shipping-policy",
          },
          {
            claim: "eBay charges a mandatory 20% fee on every transaction.",
            severity: "medium",
            confidence: 0.82,
            explanation: "The fee percentage is fabricated and contradicted by the source facts.",
            matchedGroundTruth: "Fees vary by listing type, category, and seller plan.",
            sourceReference: "seller-fees",
          },
        ],
      },
      {
        responseId: "response-2",
        platform: "gemini",
        hallucinationDetected: false,
        hallucinationCount: 0,
        overallSeverity: "low",
        hallucinatedClaims: [],
      },
      {
        responseId: "response-3",
        platform: "claude",
        hallucinationDetected: true,
        hallucinationCount: 1,
        overallSeverity: "low",
        hallucinatedClaims: [
          {
            claim: "eBay offers free product authentication on every listing.",
            severity: "low",
            confidence: 0.68,
            explanation: "The claim expands the program beyond the supported categories.",
            matchedGroundTruth: "Authentication is available for selected categories and items.",
            sourceReference: "authentication-program",
          },
        ],
      },
    ]);
    expect(result.analyzedAt).toBeTypeOf("string");
  });

  it("returns zeroed counts when responses are missing accuracy analysis", () => {
    const service = new HallucinationsDetectedService();

    const result = service.analyze([
      createStoredResponse({ responseId: "response-1" }),
      createStoredResponse({ responseId: "response-2", analysisPayload: {} }),
    ]);

    expect(result.responseCount).toBe(2);
    expect(result.hallucinatedResponseCount).toBe(0);
    expect(result.hallucinatedClaimCount).toBe(0);
    expect(result.highSeverityCount).toBe(0);
    expect(result.mediumSeverityCount).toBe(0);
    expect(result.lowSeverityCount).toBe(0);
    expect(result.responseBreakdown).toEqual([
      {
        responseId: "response-1",
        platform: "chatgpt",
        hallucinationDetected: false,
        hallucinationCount: 0,
        overallSeverity: "low",
        hallucinatedClaims: [],
      },
      {
        responseId: "response-2",
        platform: "chatgpt",
        hallucinationDetected: false,
        hallucinationCount: 0,
        overallSeverity: "low",
        hallucinatedClaims: [],
      },
    ]);
  });
});