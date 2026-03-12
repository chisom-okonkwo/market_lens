import { createEntityDetectionPipelineStages } from "@/lib/ai/entityDetection/pipeline";
import {
  type DetectEntitiesInput,
  type EntityDetectionPipelineStages,
} from "@/lib/ai/entityDetection/pipelineTypes";
import { type EntityDetectionResult } from "@/lib/ai/entityDetection/types";

export type {
  DetectEntitiesInput,
  EntityDetectionPipelineStages,
} from "@/lib/ai/entityDetection/pipelineTypes";

const defaultPipelineStages: EntityDetectionPipelineStages =
  createEntityDetectionPipelineStages();

export class EntityDetectionService {
  private readonly pipelineStages: EntityDetectionPipelineStages;

  public constructor(pipelineStages: EntityDetectionPipelineStages = defaultPipelineStages) {
    this.pipelineStages = pipelineStages;
  }

  public detect(input: DetectEntitiesInput): EntityDetectionResult {
    const responseId = input.responseId.trim();
    const rawText = input.rawText.trim();

    if (!responseId) {
      throw new Error("responseId is required and cannot be empty.");
    }

    if (!rawText) {
      throw new Error("rawText is required and cannot be empty.");
    }

    const brandMentions = this.pipelineStages.detectBrands(rawText);
    const productMentions = this.pipelineStages.detectProducts(rawText);
    const retailerMentions = this.pipelineStages.detectRetailers(rawText);
    const claims = this.pipelineStages.extractClaims(rawText);
    const sentiment = this.pipelineStages.detectSentiment(rawText);

    return {
      responseId,
      brandMentions,
      productMentions,
      retailerMentions,
      claims,
      sentiment,
      rawText,
      extractedAt: new Date().toISOString(),
    };
  }
}
