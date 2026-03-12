import { type AIResponse } from "@/lib/aiResponse";
import {
  EntityDetectionService,
  type DetectEntitiesInput,
} from "@/lib/ai/entityDetection/entityDetectionService";
import { type EntityDetectionResult } from "@/lib/ai/entityDetection/types";

export interface CollectedResponsesWithEntities {
  responses: AIResponse[];
  entityDetections: EntityDetectionResult[];
}

export interface EntityDetectionRunner {
  detect(input: DetectEntitiesInput): EntityDetectionResult;
}

export class ResponseEntityDetectionOrchestrator {
  private readonly entityDetectionRunner: EntityDetectionRunner;

  public constructor(entityDetectionRunner: EntityDetectionRunner = new EntityDetectionService()) {
    this.entityDetectionRunner = entityDetectionRunner;
  }

  public processCollectedResponses(responses: AIResponse[]): CollectedResponsesWithEntities {
    const entityDetections = responses.map((response) =>
      this.entityDetectionRunner.detect({
        responseId: this.buildResponseId(response),
        rawText: response.responseText,
      }),
    );

    return {
      responses,
      entityDetections,
    };
  }

  private buildResponseId(response: AIResponse): string {
    return `${response.platform}:${response.promptId}`;
  }
}

export const responseEntityDetectionOrchestrator = new ResponseEntityDetectionOrchestrator();
