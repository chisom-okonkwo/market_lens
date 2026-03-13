import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";
import {
  HallucinationsDetectedService,
  type HallucinationsDetectedResult,
} from "@/lib/ai/hallucinationMetrics/hallucinationsDetectedService";

export interface DashboardHallucinationsMetric {
  count: number;
  countLabel: string;
  deltaLabel: string;
  deltaTone: string;
}

function isSameMonth(date: Date, reference: Date): boolean {
  return (
    date.getUTCFullYear() === reference.getUTCFullYear() &&
    date.getUTCMonth() === reference.getUTCMonth()
  );
}

function filterResponsesForMonth(
  responses: AIStoredResponse[],
  monthReference: Date,
): AIStoredResponse[] {
  return responses.filter((response) => isSameMonth(new Date(response.timestamp), monthReference));
}

function buildDelta(result: HallucinationsDetectedResult): {
  deltaLabel: string;
  deltaTone: string;
} {
  if (result.responseCount === 0) {
    return {
      deltaLabel: "No data yet",
      deltaTone: "text-zinc-400",
    };
  }

  if (result.hallucinatedClaimCount === 0) {
    return {
      deltaLabel: "No hallucinations this month",
      deltaTone: "text-emerald-400",
    };
  }

  if (result.highSeverityCount > 0) {
    return {
      deltaLabel: `${result.highSeverityCount} high severity this month`,
      deltaTone: "text-rose-400",
    };
  }

  if (result.mediumSeverityCount > 0) {
    return {
      deltaLabel: `${result.mediumSeverityCount} medium severity this month`,
      deltaTone: "text-amber-400",
    };
  }

  const affectedResponseLabel =
    result.hallucinatedResponseCount === 1 ? "1 affected response" : `${result.hallucinatedResponseCount} affected responses`;

  return {
    deltaLabel: `${affectedResponseLabel} this month`,
    deltaTone: "text-amber-400",
  };
}

export function buildDashboardHallucinationsMetric(
  responses: AIStoredResponse[],
  now: Date = new Date(),
  service: HallucinationsDetectedService = new HallucinationsDetectedService(),
): DashboardHallucinationsMetric {
  const currentMonthResponses = filterResponsesForMonth(responses, now);
  const result = service.analyze(currentMonthResponses);
  const { deltaLabel, deltaTone } = buildDelta(result);

  return {
    count: result.hallucinatedClaimCount,
    countLabel: String(result.hallucinatedClaimCount),
    deltaLabel,
    deltaTone,
  };
}