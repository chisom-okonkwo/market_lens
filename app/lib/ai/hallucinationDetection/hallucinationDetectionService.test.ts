import { describe, expect, it } from "vitest";

import {
  HallucinationDetectionService,
} from "@/lib/ai/hallucinationDetection/hallucinationDetectionService";

describe("HallucinationDetectionService", () => {
  it("marks exact and partial matches as accurate", () => {
    const service = new HallucinationDetectionService();

    const result = service.analyze({
      responseId: "response-1",
      claims: [
        "The best cordless drills include the DeWalt DCD771",
        "The product is available at Home Depot and Amazon",
      ],
      groundTruth: [
        {
          value: "The best cordless drills include the DeWalt DCD771",
          sourceReference: "https://example.com/reviews",
        },
        {
          value: "Available at Home Depot and Amazon",
          sourceReference: "https://example.com/retailers",
        },
      ],
    });

    expect(result.responseId).toBe("response-1");
    expect(result.results).toHaveLength(2);
    expect(result.results[0]?.isAccurate).toBe(true);
    expect(result.results[1]?.isAccurate).toBe(true);
    expect(result.hallucinationDetected).toBe(false);
    expect(result.overallAccuracyScore).toBe(1);
  });

  it("marks unsupported claims as hallucinations", () => {
    const service = new HallucinationDetectionService();

    const result = service.analyze({
      responseId: "response-2",
      claims: ["This drill can run for 80 hours continuously"],
      groundTruth: [
        { value: "Battery runtime is around 40 minutes under typical load" },
      ],
    });

    expect(result.results[0]?.hallucinationDetected).toBe(true);
    expect(result.results[0]?.severity).toBe("high");
    expect(result.hallucinationDetected).toBe(true);
    expect(result.overallAccuracyScore).toBe(0);
  });

  it("throws when responseId is empty", () => {
    const service = new HallucinationDetectionService();

    expect(() =>
      service.analyze({
        responseId: "   ",
        claims: ["Any claim"],
        groundTruth: [{ value: "Any claim" }],
      }),
    ).toThrow("responseId is required and cannot be empty.");
  });

  it("matches a paraphrased claim via token overlap", () => {
    // "You can buy Bosch drills at Home Depot" shares 4/5 key terms with
    // "Home Depot sells Bosch drills" → high overlap → accurate.
    const service = new HallucinationDetectionService();

    const result = service.analyze({
      responseId: "response-overlap",
      claims: ["You can buy Bosch drills at Home Depot"],
      groundTruth: [{ value: "Home Depot sells Bosch drills" }],
    });

    expect(result.results[0]?.isAccurate).toBe(true);
    expect(result.results[0]?.hallucinationDetected).toBe(false);
    expect(result.results[0]?.confidence).toBeGreaterThan(0.7);
    expect(result.results[0]?.matchedGroundTruth).toBe("Home Depot sells Bosch drills");
  });

  it("detects a numeric contradiction in a high-overlap claim", () => {
    // "3x miles" overlaps strongly with "2x miles per dollar" but the digit
    // differs → numeric contradiction → hallucination with high confidence.
    const service = new HallucinationDetectionService();

    const result = service.analyze({
      responseId: "response-numeric",
      claims: ["Capital One Venture earns 3x miles per dollar"],
      groundTruth: [{ value: "Capital One Venture earns 2x miles per dollar" }],
    });

    expect(result.results[0]?.isAccurate).toBe(false);
    expect(result.results[0]?.hallucinationDetected).toBe(true);
    expect(result.results[0]?.severity).toBe("high");
    expect(result.results[0]?.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.results[0]?.matchedGroundTruth).toBeDefined();
  });

  it("marks a moderate-overlap claim as unverifiable, not hallucinatory", () => {
    // "Bosch drills are available at several major retailers" shares only
    // 2/6 key terms (bosch, drills) with the truth → moderate overlap
    // (0.30–0.59) → cannot confirm or deny → hallucinationDetected false.
    const service = new HallucinationDetectionService();

    const result = service.analyze({
      responseId: "response-partial",
      claims: ["Bosch drills are available at several major retailers"],
      groundTruth: [{ value: "Home Depot sells Bosch drills" }],
    });

    expect(result.results[0]?.isAccurate).toBe(false);
    expect(result.results[0]?.hallucinationDetected).toBe(false);
    expect(result.results[0]?.confidence).toBeGreaterThanOrEqual(0.3);
    expect(result.results[0]?.confidence).toBeLessThan(0.6); // below HIGH_OVERLAP_THRESHOLD
  });

  // -------------------------------------------------------------------------
  // Response-level summary
  // -------------------------------------------------------------------------

  it("builds a clean summary when all claims are verified", () => {
    const service = new HallucinationDetectionService();

    const result = service.analyze({
      responseId: "summary-all-accurate",
      claims: [
        "DeWalt DCD771 is a cordless drill",
        "Home Depot sells Bosch drills",
      ],
      groundTruth: [
        { value: "DeWalt DCD771 is a cordless drill" },
        { value: "Home Depot sells Bosch drills" },
      ],
    });

    expect(result.claimCount).toBe(2);
    expect(result.accurateCount).toBe(2);
    expect(result.hallucinationCount).toBe(0);
    expect(result.unverifiableCount).toBe(0);
    expect(result.overallAccuracyScore).toBe(1);
    expect(result.hallucinationDetected).toBe(false);
    expect(result.overallSeverity).toBe("low");
    expect(result.summary).toBe("All 2 claims verified against known facts.");
  });

  it("builds a mixed summary with accurate, hallucinated and unverifiable claims", () => {
    // Claim 1: exact match → accurate
    // Claim 2: numeric contradiction → hallucination (high severity)
    // Claim 3: topic overlap only → unverifiable
    const service = new HallucinationDetectionService();

    const result = service.analyze({
      responseId: "summary-mixed",
      claims: [
        "Home Depot sells Bosch drills",
        "Capital One Venture earns 3x miles per dollar",
        "Bosch drills are available at several major retailers",
      ],
      groundTruth: [
        { value: "Home Depot sells Bosch drills" },
        { value: "Capital One Venture earns 2x miles per dollar" },
        { value: "Home Depot sells DeWalt power tools" },
      ],
    });

    expect(result.claimCount).toBe(3);
    expect(result.accurateCount).toBe(1);
    expect(result.hallucinationCount).toBe(1);
    expect(result.unverifiableCount).toBe(1);
    expect(result.overallAccuracyScore).toBe(0.33);
    expect(result.hallucinationDetected).toBe(true);
    expect(result.overallSeverity).toBe("high");
    expect(result.summary).toContain("1 of 3 claims verified.");
    expect(result.summary).toContain("1 hallucination detected (high severity).");
    expect(result.summary).toContain("1 claim could not be verified.");
  });

  it("returns a perfect score and appropriate summary when no claims are provided", () => {
    const service = new HallucinationDetectionService();

    const result = service.analyze({
      responseId: "summary-empty",
      claims: [],
      groundTruth: [{ value: "Home Depot sells Bosch drills" }],
    });

    expect(result.claimCount).toBe(0);
    expect(result.accurateCount).toBe(0);
    expect(result.hallucinationCount).toBe(0);
    expect(result.unverifiableCount).toBe(0);
    expect(result.overallAccuracyScore).toBe(1);
    expect(result.hallucinationDetected).toBe(false);
    expect(result.overallSeverity).toBe("low");
    expect(result.summary).toBe("No claims were analyzed.");
  });
});
