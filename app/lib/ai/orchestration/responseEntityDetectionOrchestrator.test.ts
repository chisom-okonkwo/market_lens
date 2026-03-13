import { describe, expect, it, vi } from "vitest";

import { AIPlatform, type AIResponse } from "@/lib/aiResponse";
import { EntitySentiment } from "@/lib/ai/entityDetection/types";
import {
  ResponseEntityDetectionOrchestrator,
  type EntityDetectionRunner,
  type HallucinationAnalyzer,
} from "@/lib/ai/orchestration/responseEntityDetectionOrchestrator";

describe("ResponseEntityDetectionOrchestrator", () => {
  it("maps collected responses into entity detections", () => {
    const mockEntityDetectionResult = {
      responseId: "ChatGPT:prompt-123",
      brandMentions: ["DeWalt"],
      productMentions: ["DeWalt DCD771"],
      retailerMentions: ["Amazon"],
      claims: ["The best cordless drills include the DeWalt DCD771"],
      sentiment: EntitySentiment.Positive,
      rawText: "The best cordless drills include the DeWalt DCD771.",
      extractedAt: new Date().toISOString(),
    };

    const mockAccuracyAnalysis = {
      responseId: "ChatGPT:prompt-123",
      results: [],
      claimCount: 1,
      accurateCount: 0,
      hallucinationCount: 0,
      unverifiableCount: 1,
      overallAccuracyScore: 0,
      hallucinationDetected: false,
      overallSeverity: "low" as const,
      summary: "0 of 1 claim verified.",
      analyzedAt: new Date().toISOString(),
    };

    const entityDetectionRunner: EntityDetectionRunner = {
      detect: vi.fn().mockReturnValue(mockEntityDetectionResult),
    };

    const hallucinationAnalyzer: HallucinationAnalyzer = {
      analyze: vi.fn().mockReturnValue(mockAccuracyAnalysis),
    };

    const orchestrator = new ResponseEntityDetectionOrchestrator(
      entityDetectionRunner,
      hallucinationAnalyzer,
    );

    const responses: AIResponse[] = [
      {
        promptId: "prompt-123",
        platform: AIPlatform.ChatGPT,
        model: "gpt-4o-mini",
        prompt: "Best cordless drill for beginners",
        responseText: "The best cordless drills include the DeWalt DCD771.",
        timestamp: new Date().toISOString(),
        sources: [],
        citations: [],
        links: [],
      },
    ];

    const result = orchestrator.processCollectedResponses(responses);

    expect(entityDetectionRunner.detect).toHaveBeenCalledWith({
      responseId: "ChatGPT:prompt-123",
      rawText: "The best cordless drills include the DeWalt DCD771.",
    });
    expect(hallucinationAnalyzer.analyze).toHaveBeenCalledWith({
      responseId: "ChatGPT:prompt-123",
      claims: ["The best cordless drills include the DeWalt DCD771"],
    });
    expect(result.responses).toEqual(responses);
    expect(result.entityDetections).toHaveLength(1);
    expect(result.entityDetections[0]?.brandMentions).toEqual(["DeWalt"]);
    expect(result.accuracyAnalyses).toHaveLength(1);
    expect(result.accuracyAnalyses[0]?.responseId).toBe("ChatGPT:prompt-123");
  });
});
