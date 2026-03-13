import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";
import {
  ReferralTrafficService,
  type ReferralTrafficResult,
} from "@/lib/ai/referralTraffic/referralTrafficService";

export interface DashboardReferralTrafficMetric {
  referralCount: number;
  countLabel: string;
  deltaLabel: string;
  deltaTone: string;
}

const DEFAULT_TRACKED_DOMAINS = ["ebay.com"];

function getTrackedDomains(): string[] {
  const configuredDomains = process.env.REFERRAL_TRACKED_DOMAINS
    ?.split(",")
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0);

  return configuredDomains && configuredDomains.length > 0
    ? configuredDomains
    : DEFAULT_TRACKED_DOMAINS;
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

function toReferralResult(
  responses: AIStoredResponse[],
  service: ReferralTrafficService,
): ReferralTrafficResult {
  return service.analyze({
    trackedDomains: getTrackedDomains(),
    responses,
  });
}

function buildDeltaLabel(currentCount: number, previousCount: number | null): {
  deltaLabel: string;
  deltaTone: string;
} {
  if (previousCount === null) {
    return {
      deltaLabel: "No previous month data",
      deltaTone: "text-zinc-400",
    };
  }

  if (previousCount === 0) {
    if (currentCount === 0) {
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
    (((currentCount - previousCount) / previousCount) * 100).toFixed(0),
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

export function buildDashboardReferralTrafficMetric(
  responses: AIStoredResponse[],
  now: Date = new Date(),
  service: ReferralTrafficService = new ReferralTrafficService(),
): DashboardReferralTrafficMetric {
  const currentMonthResponses = filterResponsesForMonth(responses, now);
  const previousMonthResponses = filterResponsesForMonth(responses, shiftMonth(now, -1));

  const currentMonthResult = toReferralResult(currentMonthResponses, service);
  const previousMonthResult =
    previousMonthResponses.length > 0
      ? toReferralResult(previousMonthResponses, service)
      : null;

  const { deltaLabel, deltaTone } = buildDeltaLabel(
    currentMonthResult.referralCount,
    previousMonthResult ? previousMonthResult.referralCount : null,
  );

  return {
    referralCount: currentMonthResult.referralCount,
    countLabel: new Intl.NumberFormat("en-US").format(currentMonthResult.referralCount),
    deltaLabel,
    deltaTone,
  };
}