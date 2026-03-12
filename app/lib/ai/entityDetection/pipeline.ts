import { extractClaimSentences } from "@/lib/ai/entityDetection/claimExtraction";
import {
  DEFAULT_BRAND_DICTIONARY,
  DEFAULT_RETAILER_DICTIONARY,
} from "@/lib/ai/entityDetection/dictionaries";
import { detectBrandMentions, detectRetailerMentions } from "@/lib/ai/entityDetection/dictionaryDetection";
import { type EntityDetectionPipelineStages } from "@/lib/ai/entityDetection/pipelineTypes";
import { detectProductMentions } from "@/lib/ai/entityDetection/productDetection";
import { detectSentiment } from "@/lib/ai/entityDetection/sentimentDetection";
import { type EntitySentiment as EntitySentimentType } from "@/lib/ai/entityDetection/types";
import { uniqueStrings } from "@/lib/ai/entityDetection/utils";

export interface EntityDictionarySource {
  getBrandDictionary(): readonly string[];
  getRetailerDictionary(): readonly string[];
}

export interface ProductMentionDetector {
  detect(text: string, brandDictionary: readonly string[]): string[];
}

export interface ClaimExtractor {
  extract(text: string): string[];
}

export interface SentimentClassifier {
  classify(text: string): EntitySentimentType;
}

export interface EntityDetectionDependencies {
  dictionarySource: EntityDictionarySource;
  productMentionDetector: ProductMentionDetector;
  claimExtractor: ClaimExtractor;
  sentimentClassifier: SentimentClassifier;
}

const defaultDictionarySource: EntityDictionarySource = {
  getBrandDictionary: () => DEFAULT_BRAND_DICTIONARY,
  getRetailerDictionary: () => DEFAULT_RETAILER_DICTIONARY,
};

const defaultProductMentionDetector: ProductMentionDetector = {
  detect: (text: string, brandDictionary: readonly string[]) =>
    detectProductMentions(text, { brandDictionary }),
};

const defaultClaimExtractor: ClaimExtractor = {
  extract: (text: string) => extractClaimSentences(text),
};

const defaultSentimentClassifier: SentimentClassifier = {
  classify: (text: string) => detectSentiment(text),
};

const DEFAULT_ENTITY_DETECTION_DEPENDENCIES: EntityDetectionDependencies = {
  dictionarySource: defaultDictionarySource,
  productMentionDetector: defaultProductMentionDetector,
  claimExtractor: defaultClaimExtractor,
  sentimentClassifier: defaultSentimentClassifier,
};

export function createEntityDetectionPipelineStages(
  dependencies: Partial<EntityDetectionDependencies> = {},
): EntityDetectionPipelineStages {
  const resolvedDependencies: EntityDetectionDependencies = {
    ...DEFAULT_ENTITY_DETECTION_DEPENDENCIES,
    ...dependencies,
  };

  return {
    detectBrands: (text: string) =>
      uniqueStrings(
        detectBrandMentions(text, resolvedDependencies.dictionarySource.getBrandDictionary()),
      ),
    detectProducts: (text: string) =>
      uniqueStrings(
        resolvedDependencies.productMentionDetector.detect(
          text,
          resolvedDependencies.dictionarySource.getBrandDictionary(),
        ),
      ),
    detectRetailers: (text: string) =>
      uniqueStrings(
        detectRetailerMentions(text, resolvedDependencies.dictionarySource.getRetailerDictionary()),
      ),
    extractClaims: (text: string) => resolvedDependencies.claimExtractor.extract(text),
    detectSentiment: (text: string) => resolvedDependencies.sentimentClassifier.classify(text),
  };
}
