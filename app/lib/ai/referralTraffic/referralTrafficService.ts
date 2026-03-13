import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";

export interface ReferralReferenceMatch {
  url: string;
  host: string;
  field: "source" | "citation" | "link";
}

export interface ReferralTrafficResponseBreakdown {
  responseId: string;
  platform: string;
  referralDetected: boolean;
  referralCount: number;
  matchedReferences: ReferralReferenceMatch[];
}

export interface ReferralTrafficResult {
  trackedDomains: string[];
  responseCount: number;
  referralResponseCount: number;
  referralCount: number;
  uniqueUrlCount: number;
  responseBreakdown: ReferralTrafficResponseBreakdown[];
  analyzedAt: string;
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/$/, "");
}

function extractHostname(url: string): string | null {
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

function matchesTrackedDomain(host: string, trackedDomains: string[]): boolean {
  return trackedDomains.some(
    (trackedDomain) => host === trackedDomain || host.endsWith(`.${trackedDomain}`),
  );
}

export interface ReferralTrafficInput {
  trackedDomains: string[];
  responses: AIStoredResponse[];
}

export class ReferralTrafficService {
  public analyze(input: ReferralTrafficInput): ReferralTrafficResult {
    const trackedDomains = input.trackedDomains
      .map((domain) => normalizeDomain(domain))
      .filter((domain) => domain.length > 0);

    if (trackedDomains.length === 0) {
      throw new Error("trackedDomains must contain at least one non-empty domain.");
    }

    const uniqueUrls = new Set<string>();

    const responseBreakdown = input.responses.map((response) => {
      const matchesByUrl = new Map<string, ReferralReferenceMatch>();

      for (const source of response.sources) {
        if (!source.url) {
          continue;
        }

        const host = extractHostname(source.url);
        if (host && matchesTrackedDomain(host, trackedDomains)) {
          matchesByUrl.set(normalizeUrl(source.url), {
            url: source.url,
            host,
            field: "source",
          });
        }
      }

      for (const citation of response.citations) {
        if (!citation.url) {
          continue;
        }

        const host = extractHostname(citation.url);
        if (host && matchesTrackedDomain(host, trackedDomains)) {
          matchesByUrl.set(normalizeUrl(citation.url), {
            url: citation.url,
            host,
            field: "citation",
          });
        }
      }

      for (const link of response.links) {
        const host = extractHostname(link.url);
        if (host && matchesTrackedDomain(host, trackedDomains)) {
          matchesByUrl.set(normalizeUrl(link.url), {
            url: link.url,
            host,
            field: "link",
          });
        }
      }

      const matchedReferences = [...matchesByUrl.values()];
      for (const match of matchedReferences) {
        uniqueUrls.add(normalizeUrl(match.url));
      }

      return {
        responseId: response.responseId,
        platform: response.platform,
        referralDetected: matchedReferences.length > 0,
        referralCount: matchedReferences.length,
        matchedReferences,
      };
    });

    const referralResponseCount = responseBreakdown.filter(
      (response) => response.referralDetected,
    ).length;
    const referralCount = responseBreakdown.reduce(
      (sum, response) => sum + response.referralCount,
      0,
    );

    return {
      trackedDomains,
      responseCount: input.responses.length,
      referralResponseCount,
      referralCount,
      uniqueUrlCount: uniqueUrls.size,
      responseBreakdown,
      analyzedAt: new Date().toISOString(),
    };
  }
}