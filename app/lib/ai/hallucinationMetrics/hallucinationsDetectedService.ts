import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";
import { type AccuracySeverity } from "@/lib/ai/hallucinationDetection/types";

export interface HallucinatedClaimSummary {
  claim: string;
  severity: AccuracySeverity;
  confidence: number;
  explanation: string;
  matchedGroundTruth?: string;
  sourceReference?: string;
}

export interface HallucinatedResponseBreakdown {
  responseId: string;
  platform: string;
  hallucinationDetected: boolean;
  hallucinationCount: number;
  overallSeverity: AccuracySeverity;
  hallucinatedClaims: HallucinatedClaimSummary[];
}

export interface HallucinationsDetectedResult {
  responseCount: number;
  hallucinatedResponseCount: number;
  hallucinatedClaimCount: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  responseBreakdown: HallucinatedResponseBreakdown[];
  analyzedAt: string;
}

function emptySeverityCounts() {
  return {
    highSeverityCount: 0,
    mediumSeverityCount: 0,
    lowSeverityCount: 0,
  };
}

export class HallucinationsDetectedService {
  public analyze(responses: AIStoredResponse[]): HallucinationsDetectedResult {
    let hallucinatedResponseCount = 0;
    let hallucinatedClaimCount = 0;
    const severityCounts = emptySeverityCounts();

    const responseBreakdown = responses.map((response) => {
      const accuracyAnalysis = response.analysisPayload.accuracyAnalysis;
      const hallucinatedClaims = (accuracyAnalysis?.results ?? [])
        .filter((result) => result.hallucinationDetected)
        .map((result) => ({
          claim: result.claim,
          severity: result.severity,
          confidence: result.confidence,
          explanation: result.explanation,
          matchedGroundTruth: result.matchedGroundTruth,
          sourceReference: result.sourceReference,
        }));

      if (hallucinatedClaims.length > 0) {
        hallucinatedResponseCount += 1;
      }

      hallucinatedClaimCount += hallucinatedClaims.length;

      for (const claim of hallucinatedClaims) {
        if (claim.severity === "high") {
          severityCounts.highSeverityCount += 1;
        } else if (claim.severity === "medium") {
          severityCounts.mediumSeverityCount += 1;
        } else {
          severityCounts.lowSeverityCount += 1;
        }
      }

      return {
        responseId: response.responseId,
        platform: response.platform,
        hallucinationDetected: hallucinatedClaims.length > 0,
        hallucinationCount: hallucinatedClaims.length,
        overallSeverity: accuracyAnalysis?.overallSeverity ?? "low",
        hallucinatedClaims,
      };
    });

    return {
      responseCount: responses.length,
      hallucinatedResponseCount,
      hallucinatedClaimCount,
      ...severityCounts,
      responseBreakdown,
      analyzedAt: new Date().toISOString(),
    };
  }
}