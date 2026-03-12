import { describe, expect, it } from "vitest";

import { detectProductMentions } from "@/lib/ai/entityDetection/productDetection";

describe("detectProductMentions", () => {
  it("detects brand + model products using rule-based patterns", () => {
    const text = "Top picks include DeWalt DCD771 and Bosch GSB 13 RE for beginners.";

    const result = detectProductMentions(text);

    expect(result).toEqual(
      expect.arrayContaining(["DeWalt DCD771", "Bosch GSB 13 RE"]),
    );
  });

  it("matches product patterns case-insensitively and returns canonical brand casing", () => {
    const text = "dewalt dcd771 is often compared with BOSCH gsb 13 re.";

    const result = detectProductMentions(text);

    expect(result).toEqual(
      expect.arrayContaining(["DeWalt DCD771", "Bosch GSB 13 RE"]),
    );
  });

  it("returns unique product matches only", () => {
    const text = "DeWalt DCD771 is popular. DEWALT DCD771 is reliable.";

    const result = detectProductMentions(text);

    expect(result.filter((item) => item === "DeWalt DCD771")).toHaveLength(1);
  });

  it("still supports generic product mentions for first-pass coverage", () => {
    const text = "A cordless drill is a practical choice for home projects.";

    const result = detectProductMentions(text);

    expect(result).toContain("Cordless Drill");
  });
});
