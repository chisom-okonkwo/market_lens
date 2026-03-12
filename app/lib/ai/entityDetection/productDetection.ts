import { DEFAULT_BRAND_DICTIONARY } from "@/lib/ai/entityDetection/dictionaries";
import { escapeRegExp, uniqueStrings } from "@/lib/ai/entityDetection/utils";

const DEFAULT_GENERIC_PRODUCT_KEYWORDS: readonly string[] = [
  "cordless drill",
  "impact driver",
  "drill",
  "driver kit",
];

export interface ProductDetectionOptions {
  brandDictionary?: readonly string[];
  genericProductKeywords?: readonly string[];
}

function buildCanonicalBrandLookup(brands: readonly string[]): Map<string, string> {
  return new Map(brands.map((brand) => [brand.toLowerCase(), brand]));
}

function normalizeModelCode(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

const NON_MODEL_SUFFIX_STOPWORDS = new Set([
  "is",
  "and",
  "for",
  "the",
  "with",
  "or",
  "to",
  "on",
  "at",
  "in",
  "of",
]);

function normalizeMatchedModelCode(modelRaw: string): string {
  const tokens = modelRaw.replace(/\s+/g, " ").trim().split(" ");

  if (tokens.length <= 1) {
    return normalizeModelCode(modelRaw);
  }

  const lastToken = tokens[tokens.length - 1] ?? "";
  const lowercaseLastToken = lastToken.toLowerCase();
  const shouldKeepSuffix =
    /^[A-Za-z]{1,2}$/.test(lastToken) && !NON_MODEL_SUFFIX_STOPWORDS.has(lowercaseLastToken);

  if (shouldKeepSuffix) {
    return normalizeModelCode(tokens.join(" "));
  }

  return normalizeModelCode(tokens.slice(0, -1).join(" "));
}

function findBrandModelMentions(text: string, brands: readonly string[]): string[] {
  if (!text.trim() || brands.length === 0) {
    return [];
  }

  const canonicalByLowercase = buildCanonicalBrandLookup(brands);
  const escapedBrands = brands.map(escapeRegExp).join("|");
  const pattern = new RegExp(
    `\\b(${escapedBrands})\\s+([A-Za-z]{2,}(?:[-\\s]?\\d{1,4})(?:\\s+[A-Za-z]{1,3})?)\\b`,
    "gi",
  );

  const matches: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(pattern)) {
    const brandRaw = match[1];
    const modelRaw = match[2];

    if (!brandRaw || !modelRaw) {
      continue;
    }

    const canonicalBrand = canonicalByLowercase.get(brandRaw.toLowerCase()) ?? brandRaw;
    const productName = `${canonicalBrand} ${normalizeMatchedModelCode(modelRaw)}`;

    if (!seen.has(productName)) {
      seen.add(productName);
      matches.push(productName);
    }
  }

  return matches;
}

function findGenericProductMentions(text: string, keywords: readonly string[]): string[] {
  if (!text.trim()) {
    return [];
  }

  const normalizedText = text.toLowerCase();
  const matches: string[] = [];
  const seen = new Set<string>();

  for (const keyword of keywords) {
    if (normalizedText.includes(keyword.toLowerCase()) && !seen.has(keyword)) {
      seen.add(keyword);
      matches.push(keyword.replace(/\b\w/g, (char) => char.toUpperCase()));
    }
  }

  return matches;
}

export function detectProductMentions(
  text: string,
  options: ProductDetectionOptions = {},
): string[] {
  const brandDictionary = options.brandDictionary ?? DEFAULT_BRAND_DICTIONARY;
  const genericProductKeywords =
    options.genericProductKeywords ?? DEFAULT_GENERIC_PRODUCT_KEYWORDS;

  const brandModelMentions = findBrandModelMentions(text, brandDictionary);
  const genericMentions = findGenericProductMentions(text, genericProductKeywords);

  return uniqueStrings([...brandModelMentions, ...genericMentions]);
}
