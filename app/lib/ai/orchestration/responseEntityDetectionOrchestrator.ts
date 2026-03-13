import { type AIResponse } from "@/lib/aiResponse";
import {
  EntityDetectionService,
  type DetectEntitiesInput,
} from "@/lib/ai/entityDetection/entityDetectionService";
import { type EntityDetectionResult } from "@/lib/ai/entityDetection/types";
import {
  HallucinationDetectionService,
} from "@/lib/ai/hallucinationDetection/hallucinationDetectionService";
import {
  type AnalyzeHallucinationInput,
  type ResponseAccuracyAnalysis,
} from "@/lib/ai/hallucinationDetection/types";

export interface CollectedResponsesWithEntities {
  responses: AIResponse[];
  entityDetections: EntityDetectionResult[];
  accuracyAnalyses: ResponseAccuracyAnalysis[];
}

export interface EntityDetectionRunner {
  detect(input: DetectEntitiesInput): EntityDetectionResult;
}

export interface HallucinationAnalyzer {
  analyze(input: AnalyzeHallucinationInput): ResponseAccuracyAnalysis;
}

export class ResponseEntityDetectionOrchestrator {
  private readonly entityDetectionRunner: EntityDetectionRunner;
  private readonly hallucinationAnalyzer: HallucinationAnalyzer;

  public constructor(
    entityDetectionRunner: EntityDetectionRunner = new EntityDetectionService(),
    hallucinationAnalyzer: HallucinationAnalyzer = new HallucinationDetectionService(),
  ) {
    this.entityDetectionRunner = entityDetectionRunner;
    this.hallucinationAnalyzer = hallucinationAnalyzer;
  }

  public processCollectedResponses(responses: AIResponse[]): CollectedResponsesWithEntities {
    const entityDetections = responses.map((response) =>
      this.entityDetectionRunner.detect({
        responseId: this.buildResponseId(response),
        rawText: response.responseText,
      }),
    );

    const accuracyAnalyses = entityDetections.map((detection) =>
      this.hallucinationAnalyzer.analyze({
        responseId: detection.responseId,
        claims: detection.claims,
      }),
    );

    return {
      responses,
      entityDetections,
      accuracyAnalyses,
    };
  }

  private buildResponseId(response: AIResponse): string {
    return `${response.platform}:${response.promptId}`;
  }
}

export const responseEntityDetectionOrchestrator = new ResponseEntityDetectionOrchestrator();
