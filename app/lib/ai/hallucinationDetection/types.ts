export type AccuracySeverity = "low" | "medium" | "high";

export interface ClaimAccuracyResult {
  claim: string;
  isAccurate: boolean;
  hallucinationDetected: boolean;
  severity: AccuracySeverity;
  confidence: number;
  explanation: string;
  matchedGroundTruth?: string;
  sourceReference?: string;
}

export interface ResponseAccuracyAnalysis {
  responseId: string;
  results: ClaimAccuracyResult[];
  overallAccuracyScore: number;
  hallucinationDetected: boolean;
  analyzedAt: string;
}
