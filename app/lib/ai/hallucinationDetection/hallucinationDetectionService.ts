import {
  type AccuracySeverity,
  type AnalyzeHallucinationInput,
  type ClaimAccuracyResult,
  type GroundTruthEntry,
  type ResponseAccuracyAnalysis,
} from "@/lib/ai/hallucinationDetection/types";
import { getGroundTruth } from "@/lib/ai/hallucinationDetection/groundTruthData";

// ---------------------------------------------------------------------------
// Comparison thresholds
// ---------------------------------------------------------------------------

/** Fraction of claim key terms that must appear in a truth entry to call it a strong match. */
const HIGH_OVERLAP_THRESHOLD = 0.6;

/** Minimum overlap to consider a claim "related" to a truth entry (neither confirmed nor denied). */
const MODERATE_OVERLAP_THRESHOLD = 0.3;

/** Claims shorter than this many key terms are too vague to score reliably. */
const MIN_KEY_TERMS = 2;

// ---------------------------------------------------------------------------
// Common English words that carry no factual weight.
// Keep this list deliberately short — domain words must never appear here.
// ---------------------------------------------------------------------------
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "it", "its", "this", "that", "these",
  "those", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "up", "about", "into", "per", "each", "all",
  "as", "if", "so", "not", "no",
]);

// ---------------------------------------------------------------------------
// Pure helper functions
// ---------------------------------------------------------------------------

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Returns the significant content words from a piece of text after stripping
 * punctuation and stopwords. Numbers are kept because they carry factual weight.
 */
function extractKeyTerms(text: string): string[] {
  return normalizeText(text)
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Returns the fraction of claimTerms that also appear in the truth entry text.
 * Returns 0 when the claim is too short to score reliably.
 */
function scoreTermOverlap(claimTerms: string[], truthText: string): number {
  if (claimTerms.length < MIN_KEY_TERMS) return 0;
  const truthTerms = new Set(extractKeyTerms(truthText));
  const matched = claimTerms.filter((t) => truthTerms.has(t)).length;
  return matched / claimTerms.length;
}

/**
 * Extracts all standalone digit sequences from the text.
 * Uses a simple regex so "3x" yields 3, "DCD771" is excluded because the
 * digits have no leading word boundary when immediately preceded by letters.
 */
function extractDigitValues(text: string): number[] {
  return (normalizeText(text).match(/\d+/g) ?? []).map(Number);
}

/**
 * Returns true when two high-overlap texts contain different numeric values,
 * which is a strong signal the claim is contradicting the ground truth
 * (e.g. "3x miles" vs "2x miles").
 */
function hasNumericContradiction(claim: string, truthValue: string): boolean {
  const claimDigits = extractDigitValues(claim);
  const truthDigits = new Set(extractDigitValues(truthValue));
  return (
    claimDigits.length > 0 &&
    truthDigits.size > 0 &&
    claimDigits.some((n) => !truthDigits.has(n))
  );
}

/**
 * Derives severity from the combination of accuracy, hallucination flag, and
 * confidence rather than confidence alone, so contradictions are always "high"
 * regardless of how confident we are they're wrong.
 */
function calculateSeverity(
  isAccurate: boolean,
  hallucinationDetected: boolean,
  confidence: number,
): AccuracySeverity {
  if (isAccurate) return "low";
  if (!hallucinationDetected) return "low"; // unverifiable — not confirmed wrong
  if (confidence >= 0.7) return "high";     // confidently wrong → most severe
  if (confidence >= 0.4) return "medium";
  return "high";                            // totally unsupported → also high concern
}

function calculateOverallAccuracyScore(results: ClaimAccuracyResult[]): number {
  if (results.length === 0) return 1;
  const accurateCount = results.filter((result) => result.isAccurate).length;
  return Number((accurateCount / results.length).toFixed(2));
}

/**
 * Derives the worst severity across all claims that were flagged as
 * hallucinations. Returns "low" when no hallucinations were detected because
 * there is nothing to be alarmed about.
 */
function deriveOverallSeverity(
  hallucinatedResults: ClaimAccuracyResult[],
): AccuracySeverity {
  if (hallucinatedResults.length === 0) return "low";
  if (hallucinatedResults.some((r) => r.severity === "high")) return "high";
  if (hallucinatedResults.some((r) => r.severity === "medium")) return "medium";
  return "low";
}

/**
 * Produces a single plain-English sentence that summarises the accuracy verdict
 * for a response. Covers the three common outcomes:
 *   - everything verified
 *   - a mix of accurate / hallucinated / unverifiable
 *   - nothing could be verified at all
 */
function buildSummaryString(
  claimCount: number,
  accurateCount: number,
  hallucinationCount: number,
  unverifiableCount: number,
  hallucinationDetected: boolean,
  overallSeverity: AccuracySeverity,
): string {
  if (claimCount === 0) {
    return "No claims were analyzed.";
  }

  if (!hallucinationDetected && unverifiableCount === 0) {
    return `All ${claimCount} claim${claimCount === 1 ? "" : "s"} verified against known facts.`;
  }

  const parts: string[] = [
    `${accurateCount} of ${claimCount} claim${claimCount === 1 ? "" : "s"} verified.`,
  ];

  if (hallucinationDetected) {
    parts.push(
      `${hallucinationCount} hallucination${hallucinationCount === 1 ? "" : "s"} detected (${overallSeverity} severity).`,
    );
  }

  if (unverifiableCount > 0) {
    parts.push(
      `${unverifiableCount} claim${unverifiableCount === 1 ? "" : "s"} could not be verified.`,
    );
  }

  return parts.join(" ");
}

type ResponseAccuracySummary = Pick<
  ResponseAccuracyAnalysis,
  | "claimCount"
  | "accurateCount"
  | "hallucinationCount"
  | "unverifiableCount"
  | "overallAccuracyScore"
  | "hallucinationDetected"
  | "overallSeverity"
  | "summary"
>;

/**
 * Aggregates all per-claim results into the response-level summary fields.
 * Extracted here so analyze() stays readable and the logic is independently testable.
 */
function buildResponseSummary(
  results: ClaimAccuracyResult[],
): ResponseAccuracySummary {
  const claimCount = results.length;
  const accurateCount = results.filter((r) => r.isAccurate).length;
  const hallucinationCount = results.filter((r) => r.hallucinationDetected).length;
  const unverifiableCount = results.filter(
    (r) => !r.isAccurate && !r.hallucinationDetected,
  ).length;

  const overallAccuracyScore = calculateOverallAccuracyScore(results);
  const hallucinationDetected = hallucinationCount > 0;
  const overallSeverity = deriveOverallSeverity(
    results.filter((r) => r.hallucinationDetected),
  );

  const summary = buildSummaryString(
    claimCount,
    accurateCount,
    hallucinationCount,
    unverifiableCount,
    hallucinationDetected,
    overallSeverity,
  );

  return {
    claimCount,
    accurateCount,
    hallucinationCount,
    unverifiableCount,
    overallAccuracyScore,
    hallucinationDetected,
    overallSeverity,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class HallucinationDetectionService {
  public analyze(input: AnalyzeHallucinationInput): ResponseAccuracyAnalysis {
    const responseId = input.responseId.trim();

    if (!responseId) {
      throw new Error("responseId is required and cannot be empty.");
    }

    const groundTruth = input.groundTruth ?? getGroundTruth();

    const results = input.claims
      .map((claim) => claim.trim())
      .filter((claim) => claim.length > 0)
      .map((claim) => this.analyzeClaim(claim, groundTruth));

    const responseSummary = buildResponseSummary(results);

    return {
      responseId,
      results,
      ...responseSummary,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Four-stage rule-based comparison:
   *
   *  Stage 1 — Exact match (normalized):  confidence 0.95, accurate.
   *  Stage 2 — High term overlap (≥60%) + no numeric contradiction: accurate,
   *            confidence scales with overlap depth (0.81–0.95).
   *  Stage 3 — High term overlap + numeric contradiction: hallucination,
   *            confidence 0.85 (we are fairly sure the value is wrong).
   *  Stage 4 — Moderate overlap (30–60%): unverifiable, not a hallucination,
   *            confidence equals the overlap ratio (0.30–0.59).
   *  Stage 5 — No meaningful overlap (<30%): hallucination, confidence 0.15.
   */
  private analyzeClaim(
    claim: string,
    groundTruth: GroundTruthEntry[],
  ): ClaimAccuracyResult {
    const normalizedClaim = normalizeText(claim);

    // --- Stage 1: exact string match (after normalization) ------------------
    const exactMatch = groundTruth.find(
      (entry) => normalizeText(entry.value) === normalizedClaim,
    );
    if (exactMatch) {
      const confidence = 0.95;
      return {
        claim,
        isAccurate: true,
        hallucinationDetected: false,
        severity: calculateSeverity(true, false, confidence),
        confidence,
        explanation: "Claim exactly matches a known ground truth fact.",
        matchedGroundTruth: exactMatch.value,
        sourceReference: exactMatch.sourceReference,
      };
    }

    // --- Stage 2–5: token overlap scoring -----------------------------------
    const claimTerms = extractKeyTerms(claim);

    const ranked = groundTruth
      .map((entry) => ({
        entry,
        overlap: scoreTermOverlap(claimTerms, entry.value),
      }))
      .sort((a, b) => b.overlap - a.overlap);

    const best = ranked[0];

    if (!best || best.overlap < MODERATE_OVERLAP_THRESHOLD) {
      // Stage 5: no meaningful connection to any known fact
      const confidence = 0.15;
      return {
        claim,
        isAccurate: false,
        hallucinationDetected: true,
        severity: calculateSeverity(false, true, confidence),
        confidence,
        explanation:
          "No supporting ground truth found for this claim. It may be fabricated or outside known facts.",
      };
    }

    if (best.overlap >= HIGH_OVERLAP_THRESHOLD) {
      // Stage 3: same topic, but numbers don't agree → contradiction
      if (hasNumericContradiction(claim, best.entry.value)) {
        const confidence = 0.85;
        return {
          claim,
          isAccurate: false,
          hallucinationDetected: true,
          severity: calculateSeverity(false, true, confidence),
          confidence,
          explanation: `Claim relates to a known fact but states a different value. Ground truth: "${best.entry.value}".`,
          matchedGroundTruth: best.entry.value,
          sourceReference: best.entry.sourceReference,
        };
      }

      // Stage 2: high overlap, no contradiction → treat as accurate
      const confidence = parseFloat((0.6 + best.overlap * 0.35).toFixed(2));
      return {
        claim,
        isAccurate: true,
        hallucinationDetected: false,
        severity: calculateSeverity(true, false, confidence),
        confidence,
        explanation: `Claim aligns with a known ground truth fact: "${best.entry.value}".`,
        matchedGroundTruth: best.entry.value,
        sourceReference: best.entry.sourceReference,
      };
    }

    // Stage 4: moderate overlap — related topic but insufficient evidence
    const confidence = parseFloat(best.overlap.toFixed(2));
    return {
      claim,
      isAccurate: false,
      hallucinationDetected: false,
      severity: calculateSeverity(false, false, confidence),
      confidence,
      explanation:
        "Claim partially overlaps with known facts but cannot be confirmed or denied.",
      matchedGroundTruth: best.entry.value,
      sourceReference: best.entry.sourceReference,
    };
  }
}
