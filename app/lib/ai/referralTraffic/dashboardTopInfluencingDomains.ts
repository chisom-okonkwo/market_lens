import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";
import {
  TopInfluencingDomainsService,
  type InfluencingDomainBreakdown,
} from "@/lib/ai/referralTraffic/topInfluencingDomainsService";

export interface DashboardInfluencingDomain {
  domain: string;
  impact: string;
  tone: string;
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

function toImpact(
  domain: InfluencingDomainBreakdown,
  totalResponses: number,
): Pick<DashboardInfluencingDomain, "impact" | "tone"> {
  if (totalResponses === 0) {
    return {
      impact: "No data yet",
      tone: "bg-zinc-500/20 text-zinc-300",
    };
  }

  const responseShare = domain.responseCount / totalResponses;

  if (responseShare >= 0.5 || domain.referenceCount >= 4) {
    return {
      impact: "High influence",
      tone: "bg-rose-500/20 text-rose-300",
    };
  }

  if (responseShare >= 0.25 || domain.referenceCount >= 2) {
    return {
      impact: "Medium",
      tone: "bg-amber-500/20 text-amber-300",
    };
  }

  return {
    impact: "Low",
    tone: "bg-emerald-500/20 text-emerald-300",
  };
}

export function buildDashboardTopInfluencingDomains(
  responses: AIStoredResponse[],
  now: Date = new Date(),
  service: TopInfluencingDomainsService = new TopInfluencingDomainsService(),
): DashboardInfluencingDomain[] {
  const currentMonthResponses = filterResponsesForMonth(responses, now);
  const result = service.analyze(currentMonthResponses);

  if (result.domains.length === 0) {
    return [
      {
        domain: "No cited domains yet",
        impact: "Awaiting responses",
        tone: "bg-zinc-500/20 text-zinc-300",
      },
    ];
  }

  return result.domains.slice(0, 5).map((domain) => ({
    domain: domain.domain,
    ...toImpact(domain, result.responseCount),
  }));
}