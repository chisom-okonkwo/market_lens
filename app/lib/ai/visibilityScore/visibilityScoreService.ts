import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";

export interface VisibilityScoreInput {
  trackedTerms: string[];
  responses: AIStoredResponse[];
}

export interface VisibilityScoreResponseBreakdown {
  responseId: string;
  platform: string;
  mentionDetected: boolean;
  matchedTerms: string[];
  sentiment: "positive" | "neutral" | "negative" | "unknown";
  hallucinationDetected: boolean;
  score: number;
}

export interface VisibilityScoreResult {
  trackedTerms: string[];
  responseCount: number;
  mentioningResponseCount: number;
  mentionRate: number;
  positiveResponseCount: number;
  hallucinatedResponseCount: number;
  overallScore: number;
  responseBreakdown: VisibilityScoreResponseBreakdown[];
  analyzedAt: string;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findMatchedTerms(text: string, trackedTerms: string[]): string[] {
  const normalizedText = normalizeText(text);

  return trackedTerms.filter((term) => {
    const normalizedTerm = normalizeText(term);
    const pattern = new RegExp(`(^|\\b)${escapeRegExp(normalizedTerm)}(\\b|$)`, "i");
    return pattern.test(normalizedText);
  });
}

function detectSentiment(response: AIStoredResponse): VisibilityScoreResponseBreakdown["sentiment"] {
  return response.analysisPayload.entityDetection?.sentiment ?? "unknown";
}

function calculateResponseScore(response: AIStoredResponse, matchedTerms: string[]): number {
  if (matchedTerms.length === 0) {
    return 0;
  }

  let score = 0;
  score += 70;

  const sentiment = detectSentiment(response);
  if (sentiment === "positive") {
    score += 20;
  } else if (sentiment === "neutral") {
    score += 10;
  } else if (sentiment === "negative") {
    score -= 10;
  }

  if (response.hallucinationDetected) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateOverallScore(responseBreakdown: VisibilityScoreResponseBreakdown[]): number {
  if (responseBreakdown.length === 0) {
    return 0;
  }

  const total = responseBreakdown.reduce((sum, response) => sum + response.score, 0);
  return Number((total / responseBreakdown.length).toFixed(2));
}

export class VisibilityScoreService {
  public analyze(input: VisibilityScoreInput): VisibilityScoreResult {
    const trackedTerms = input.trackedTerms
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    if (trackedTerms.length === 0) {
      throw new Error("trackedTerms must contain at least one non-empty term.");
    }

    const responseBreakdown = input.responses.map((response) => {
      const matchedTerms = findMatchedTerms(response.responseText, trackedTerms);
      const mentionDetected = matchedTerms.length > 0;

      return {
        responseId: response.responseId,
        platform: response.platform,
        mentionDetected,
        matchedTerms,
        sentiment: detectSentiment(response),
        hallucinationDetected: response.hallucinationDetected,
        score: calculateResponseScore(response, matchedTerms),
      };
    });

    const mentioningResponseCount = responseBreakdown.filter(
      (response) => response.mentionDetected,
    ).length;
    const positiveResponseCount = responseBreakdown.filter(
      (response) => response.sentiment === "positive",
    ).length;
    const hallucinatedResponseCount = responseBreakdown.filter(
      (response) => response.hallucinationDetected,
    ).length;

    const mentionRate =
      responseBreakdown.length === 0
        ? 0
        : Number((mentioningResponseCount / responseBreakdown.length).toFixed(2));

    return {
      trackedTerms,
      responseCount: responseBreakdown.length,
      mentioningResponseCount,
      mentionRate,
      positiveResponseCount,
      hallucinatedResponseCount,
      overallScore: calculateOverallScore(responseBreakdown),
      responseBreakdown,
      analyzedAt: new Date().toISOString(),
    };
  }
}