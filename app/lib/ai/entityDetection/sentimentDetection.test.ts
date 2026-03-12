import { describe, expect, it } from "vitest";

import { EntitySentiment } from "@/lib/ai/entityDetection/types";
import { detectSentiment } from "@/lib/ai/entityDetection/sentimentDetection";

describe("detectSentiment", () => {
  it("returns positive when positive cues dominate", () => {
    const text = "This is one of the best and most reliable drills for beginners.";

    expect(detectSentiment(text)).toBe(EntitySentiment.Positive);
  });

  it("returns negative when negative cues dominate", () => {
    const text = "This is a poor option and users should avoid it due to weak performance.";

    expect(detectSentiment(text)).toBe(EntitySentiment.Negative);
  });

  it("returns neutral when cues are balanced or absent", () => {
    expect(detectSentiment("This drill comes with a battery and charger.")).toBe(
      EntitySentiment.Neutral,
    );

    expect(detectSentiment("Great option but also has a bad battery issue.")).toBe(
      EntitySentiment.Neutral,
    );
  });

  it("returns neutral for empty text", () => {
    expect(detectSentiment("   ")).toBe(EntitySentiment.Neutral);
  });
});
