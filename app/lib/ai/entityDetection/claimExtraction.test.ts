import { describe, expect, it } from "vitest";

import { extractClaimSentences } from "@/lib/ai/entityDetection/claimExtraction";

describe("extractClaimSentences", () => {
  it("extracts recommendation-style claims", () => {
    const text = "The best cordless drills include the DeWalt DCD771. It also has a compact design.";

    const claims = extractClaimSentences(text);

    expect(claims).toContain("The best cordless drills include the DeWalt DCD771");
  });

  it("extracts factual availability claims", () => {
    const text = "The product is available at Home Depot and Amazon.";

    const claims = extractClaimSentences(text);

    expect(claims).toEqual(["The product is available at Home Depot and Amazon"]);
  });

  it("returns unique matching claim sentences", () => {
    const text =
      "The product is available at Home Depot and Amazon. The product is available at Home Depot and Amazon.";

    const claims = extractClaimSentences(text);

    expect(claims).toHaveLength(1);
  });

  it("ignores non-claim short fragments", () => {
    const text = "Great! Bosch.";

    const claims = extractClaimSentences(text);

    expect(claims).toEqual([]);
  });
});
