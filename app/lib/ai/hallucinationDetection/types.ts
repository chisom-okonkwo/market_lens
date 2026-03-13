export type AccuracySeverity = "low" | "medium" | "high";

export interface GroundTruthEntry {
  value: string;
  sourceReference?: string;
}

export interface AnalyzeHallucinationInput {
  responseId: string;
  claims: string[];
  /** Omit to use the default local ground-truth store from groundTruthData.ts */
  groundTruth?: GroundTruthEntry[];
}

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

  // ----- Counts (transparent breakdown of the verdict) --------------------
  claimCount: number;
  accurateCount: number;
  hallucinationCount: number;
  /** Claims that could not be confirmed or denied against known facts. */
  unverifiableCount: number;

  // ----- Score -------------------------------------------------------------
  /**
   * Fraction of claims that are accurate: accurateCount / claimCount.
   * Ranges 0–1, rounded to 2 decimal places.
   * Returns 1 when there are no claims (nothing wrong was said).
   */
  overallAccuracyScore: number;

  // ----- Flags -------------------------------------------------------------
  /** True when at least one claim was positively identified as a hallucination. */
  hallucinationDetected: boolean;

  /**
   * Worst severity across all hallucinated claims.
   * "low" when no hallucinations were detected.
   */
  overallSeverity: AccuracySeverity;

  // ----- Human-readable verdict -------------------------------------------
  /** One-line English description of the response accuracy verdict. */
  summary: string;

  analyzedAt: string;
}
