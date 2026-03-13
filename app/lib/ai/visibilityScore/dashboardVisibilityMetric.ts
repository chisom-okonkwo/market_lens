import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";
import {
  VisibilityScoreService,
  type VisibilityScoreResult,
} from "@/lib/ai/visibilityScore/visibilityScoreService";

export interface DashboardVisibilityMetric {
  score: number;
  scoreLabel: string;
  deltaLabel: string;
  deltaTone: string;
}

const DEFAULT_TRACKED_TERMS = ["eBay"];

function getTrackedTerms(): string[] {
  const configuredTerms = process.env.VISIBILITY_TRACKED_TERMS
    ?.split(",")
    .map((term) => term.trim())
    .filter((term) => term.length > 0);

  return configuredTerms && configuredTerms.length > 0
    ? configuredTerms
    : DEFAULT_TRACKED_TERMS;
}

function isSameMonth(date: Date, reference: Date): boolean {
  return (
    date.getUTCFullYear() === reference.getUTCFullYear() &&
    date.getUTCMonth() === reference.getUTCMonth()
  );
}

function shiftMonth(reference: Date, monthOffset: number): Date {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + monthOffset, 1));
}

function filterResponsesForMonth(
  responses: AIStoredResponse[],
  monthReference: Date,
): AIStoredResponse[] {
  return responses.filter((response) => isSameMonth(new Date(response.timestamp), monthReference));
}

function toVisibilityResult(
  responses: AIStoredResponse[],
  service: VisibilityScoreService,
): VisibilityScoreResult {
  return service.analyze({
    trackedTerms: getTrackedTerms(),
    responses,
  });
}

function buildDeltaLabel(currentScore: number, previousScore: number | null): {
  deltaLabel: string;
  deltaTone: string;
} {
  if (previousScore === null) {
    return {
      deltaLabel: "No previous month data",
      deltaTone: "text-zinc-400",
    };
  }

  if (previousScore === 0) {
    if (currentScore === 0) {
      return {
        deltaLabel: "0% vs previous month",
        deltaTone: "text-zinc-400",
      };
    }

    return {
      deltaLabel: "+100% vs previous month",
      deltaTone: "text-emerald-400",
    };
  }

  const deltaPercentage = Number(
    (((currentScore - previousScore) / previousScore) * 100).toFixed(0),
  );

  if (deltaPercentage > 0) {
    return {
      deltaLabel: `+${deltaPercentage}% vs previous month`,
      deltaTone: "text-emerald-400",
    };
  }

  if (deltaPercentage < 0) {
    return {
      deltaLabel: `${deltaPercentage}% vs previous month`,
      deltaTone: "text-rose-400",
    };
  }

  return {
    deltaLabel: "0% vs previous month",
    deltaTone: "text-zinc-400",
  };
}

export function buildDashboardVisibilityMetric(
  responses: AIStoredResponse[],
  now: Date = new Date(),
  service: VisibilityScoreService = new VisibilityScoreService(),
): DashboardVisibilityMetric {
  const currentMonthResponses = filterResponsesForMonth(responses, now);
  const previousMonthResponses = filterResponsesForMonth(responses, shiftMonth(now, -1));

  const currentMonthResult = toVisibilityResult(currentMonthResponses, service);
  const previousMonthResult =
    previousMonthResponses.length > 0
      ? toVisibilityResult(previousMonthResponses, service)
      : null;

  const roundedCurrentScore = Math.round(currentMonthResult.overallScore);
  const { deltaLabel, deltaTone } = buildDeltaLabel(
    roundedCurrentScore,
    previousMonthResult ? Math.round(previousMonthResult.overallScore) : null,
  );

  return {
    score: roundedCurrentScore,
    scoreLabel: `${roundedCurrentScore}%`,
    deltaLabel,
    deltaTone,
  };
}