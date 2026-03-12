import {
  EntitySentiment,
  type EntitySentiment as EntitySentimentType,
} from "@/lib/ai/entityDetection/types";

const POSITIVE_KEYWORDS: readonly string[] = [
  "best",
  "great",
  "excellent",
  "recommended",
  "reliable",
  "good",
  "top",
  "solid",
];

const NEGATIVE_KEYWORDS: readonly string[] = [
  "worst",
  "poor",
  "bad",
  "avoid",
  "unreliable",
  "terrible",
  "weak",
  "problem",
];

function countKeywordHits(text: string, keywords: readonly string[]): number {
  const normalizedText = text.toLowerCase();
  return keywords.filter((word) => normalizedText.includes(word)).length;
}

export function detectSentiment(text: string): EntitySentimentType {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return EntitySentiment.Neutral;
  }

  const positiveScore = countKeywordHits(normalizedText, POSITIVE_KEYWORDS);
  const negativeScore = countKeywordHits(normalizedText, NEGATIVE_KEYWORDS);

  if (positiveScore > negativeScore) {
    return EntitySentiment.Positive;
  }

  if (negativeScore > positiveScore) {
    return EntitySentiment.Negative;
  }

  return EntitySentiment.Neutral;
}
