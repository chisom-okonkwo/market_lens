export type ResponseId = string;

export type ISOTimestamp = string;

export const EntitySentiment = {
  Positive: "positive",
  Neutral: "neutral",
  Negative: "negative",
} as const;

export type EntitySentiment = (typeof EntitySentiment)[keyof typeof EntitySentiment];

export interface EntityDetectionResult {
  responseId: ResponseId;
  brandMentions: string[];
  productMentions: string[];
  retailerMentions: string[];
  claims: string[];
  sentiment: EntitySentiment;
  rawText: string;
  extractedAt: ISOTimestamp;
}

export interface EntityDetectionBatchResult {
  results: EntityDetectionResult[];
  extractedAt: ISOTimestamp;
}
