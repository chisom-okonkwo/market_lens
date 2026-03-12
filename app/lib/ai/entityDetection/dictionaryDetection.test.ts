import { describe, expect, it } from "vitest";

import {
  detectBrandMentions,
  detectRetailerMentions,
  findDictionaryMentions,
} from "@/lib/ai/entityDetection/dictionaryDetection";

describe("dictionaryDetection", () => {
  it("matches dictionary entries case-insensitively", () => {
    const text = "dewalt and BOSCH are popular options at amazon.";

    expect(detectBrandMentions(text)).toEqual(["DeWalt", "Bosch"]);
    expect(detectRetailerMentions(text)).toEqual(["Amazon"]);
  });

  it("returns unique matches only", () => {
    const text = "DeWalt is great. dewalt is reliable.";

    expect(detectBrandMentions(text)).toEqual(["DeWalt"]);
  });

  it("supports configurable dictionaries", () => {
    const text = "Acme is available at Tool Mart.";

    const brands = findDictionaryMentions(text, ["Acme", "BrandX"]);
    const retailers = findDictionaryMentions(text, ["Tool Mart", "ShopY"]);

    expect(brands).toEqual(["Acme"]);
    expect(retailers).toEqual(["Tool Mart"]);
  });
});
