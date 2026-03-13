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
import {
  aiResponseRepository,
  type AIProcessedResponseRecord,
  type AIResponseRepository,
} from "@/lib/ai/storage/aiResponseRepository";

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

export interface ProcessedResponseStore {
  saveProcessedResponse(record: AIProcessedResponseRecord): Promise<void>;
}

// This layer turns raw model output into the processed records used by the dashboard and analytics services.
export class ResponseEntityDetectionOrchestrator {
  private readonly entityDetectionRunner: EntityDetectionRunner;
  private readonly hallucinationAnalyzer: HallucinationAnalyzer;
  private readonly responseStore: ProcessedResponseStore;

  public constructor(
    entityDetectionRunner: EntityDetectionRunner = new EntityDetectionService(),
    hallucinationAnalyzer: HallucinationAnalyzer = new HallucinationDetectionService(),
    responseStore: ProcessedResponseStore = aiResponseRepository,
  ) {
    this.entityDetectionRunner = entityDetectionRunner;
    this.hallucinationAnalyzer = hallucinationAnalyzer;
    this.responseStore = responseStore;
  }

  // Each response is enriched, then written back so later reads can work from stored analysis only.
  public async processCollectedResponses(
    responses: AIResponse[],
  ): Promise<CollectedResponsesWithEntities> {
    const processedResponses = responses.map((response) => {
      const entityDetection = this.entityDetectionRunner.detect({
        responseId: this.buildResponseId(response),
        rawText: response.responseText,
      });

      const accuracyAnalysis = this.hallucinationAnalyzer.analyze({
        responseId: entityDetection.responseId,
        claims: entityDetection.claims,
      });

      return {
        response,
        entityDetection,
        accuracyAnalysis,
      };
    });

    await Promise.all(
      processedResponses.map((entry) =>
        this.responseStore.saveProcessedResponse({
          response: entry.response,
          entityDetection: entry.entityDetection,
          accuracyAnalysis: entry.accuracyAnalysis,
        }),
      ),
    );

    return {
      responses,
      entityDetections: processedResponses.map((entry) => entry.entityDetection),
      accuracyAnalyses: processedResponses.map((entry) => entry.accuracyAnalysis),
    };
  }

  private buildResponseId(response: AIResponse): string {
    return `${response.platform}:${response.promptId}`;
  }
}

export const responseEntityDetectionOrchestrator = new ResponseEntityDetectionOrchestrator();
