import { describe, expect, it } from "vitest";

import {
  createEntityDetectionPipelineStages,
  type ClaimExtractor,
  type EntityDictionarySource,
  type ProductMentionDetector,
  type SentimentClassifier,
} from "@/lib/ai/entityDetection/pipeline";
import { EntitySentiment } from "@/lib/ai/entityDetection/types";

describe("createEntityDetectionPipelineStages", () => {
  it("supports custom dependencies for extensibility", () => {
    const dictionarySource: EntityDictionarySource = {
      getBrandDictionary: () => ["Acme"],
      getRetailerDictionary: () => ["Tool Mart"],
    };

    const productMentionDetector: ProductMentionDetector = {
      detect: (text) => (text.includes("X100") ? ["Acme X100"] : []),
    };

    const claimExtractor: ClaimExtractor = {
      extract: () => ["Acme X100 is available at Tool Mart"],
    };

    const sentimentClassifier: SentimentClassifier = {
      classify: () => EntitySentiment.Positive,
    };

    const stages = createEntityDetectionPipelineStages({
      dictionarySource,
      productMentionDetector,
      claimExtractor,
      sentimentClassifier,
    });

    const text = "Acme X100 is available at Tool Mart.";

    expect(stages.detectBrands(text)).toEqual(["Acme"]);
    expect(stages.detectProducts(text)).toEqual(["Acme X100"]);
    expect(stages.detectRetailers(text)).toEqual(["Tool Mart"]);
    expect(stages.extractClaims(text)).toEqual([
      "Acme X100 is available at Tool Mart",
    ]);
    expect(stages.detectSentiment(text)).toBe(EntitySentiment.Positive);
  });
});
