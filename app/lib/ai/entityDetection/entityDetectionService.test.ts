import { describe, expect, it, vi } from "vitest";

import { EntitySentiment } from "@/lib/ai/entityDetection/types";
import {
  EntityDetectionService,
  type EntityDetectionPipelineStages,
} from "@/lib/ai/entityDetection/entityDetectionService";

describe("EntityDetectionService", () => {
  it("orchestrates all pipeline stages and returns structured result", () => {
    const stages: EntityDetectionPipelineStages = {
      detectBrands: vi.fn().mockReturnValue(["DeWalt"]),
      detectProducts: vi.fn().mockReturnValue(["Cordless Drill"]),
      detectRetailers: vi.fn().mockReturnValue(["Amazon"]),
      extractClaims: vi.fn().mockReturnValue(["DeWalt is beginner-friendly"]),
      detectSentiment: vi.fn().mockReturnValue(EntitySentiment.Positive),
    };

    const service = new EntityDetectionService(stages);
    const result = service.detect({
      responseId: "response-123",
      rawText: "DeWalt cordless drill is a great beginner option on Amazon.",
    });

    expect(stages.detectBrands).toHaveBeenCalledWith(
      "DeWalt cordless drill is a great beginner option on Amazon.",
    );
    expect(stages.detectProducts).toHaveBeenCalled();
    expect(stages.detectRetailers).toHaveBeenCalled();
    expect(stages.extractClaims).toHaveBeenCalled();
    expect(stages.detectSentiment).toHaveBeenCalled();

    expect(result.responseId).toBe("response-123");
    expect(result.brandMentions).toEqual(["DeWalt"]);
    expect(result.productMentions).toEqual(["Cordless Drill"]);
    expect(result.retailerMentions).toEqual(["Amazon"]);
    expect(result.claims).toEqual(["DeWalt is beginner-friendly"]);
    expect(result.sentiment).toBe(EntitySentiment.Positive);
    expect(result.rawText).toBe("DeWalt cordless drill is a great beginner option on Amazon.");
    expect(Number.isNaN(Date.parse(result.extractedAt))).toBe(false);
  });

  it("throws when responseId is empty", () => {
    const service = new EntityDetectionService();

    expect(() =>
      service.detect({
        responseId: "   ",
        rawText: "Some text",
      }),
    ).toThrow("responseId is required and cannot be empty.");
  });

  it("throws when rawText is empty", () => {
    const service = new EntityDetectionService();

    expect(() =>
      service.detect({
        responseId: "response-123",
        rawText: "   ",
      }),
    ).toThrow("rawText is required and cannot be empty.");
  });

  it("provides sensible default stage output", () => {
    const service = new EntityDetectionService();

    const result = service.detect({
      responseId: "response-456",
      rawText: "DeWalt cordless drill is a great option at Home Depot and Amazon.",
    });

    expect(result.brandMentions).toContain("DeWalt");
    expect(result.productMentions).toContain("Cordless Drill");
    expect(result.retailerMentions).toEqual(expect.arrayContaining(["Home Depot", "Amazon"]));
    expect(result.claims.length).toBeGreaterThan(0);
    expect(result.sentiment).toBe(EntitySentiment.Positive);
  });
});
