import { type EntitySentiment as EntitySentimentType, type ResponseId } from "@/lib/ai/entityDetection/types";

export interface EntityDetectionPipelineStages {
  detectBrands: (text: string) => string[];
  detectProducts: (text: string) => string[];
  detectRetailers: (text: string) => string[];
  extractClaims: (text: string) => string[];
  detectSentiment: (text: string) => EntitySentimentType;
}

export interface DetectEntitiesInput {
  responseId: ResponseId;
  rawText: string;
}
