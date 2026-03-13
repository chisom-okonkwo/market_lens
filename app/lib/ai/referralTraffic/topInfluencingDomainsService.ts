import { type AIStoredResponse } from "@/lib/ai/storage/aiResponseRepository";

export interface InfluencingDomainBreakdown {
  domain: string;
  responseCount: number;
  referenceCount: number;
  sourceCount: number;
  citationCount: number;
  linkCount: number;
}

export interface TopInfluencingDomainsResult {
  responseCount: number;
  domains: InfluencingDomainBreakdown[];
  analyzedAt: string;
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function extractHostname(url: string): string | null {
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

interface DomainAccumulator {
  responseIds: Set<string>;
  referenceCount: number;
  sourceCount: number;
  citationCount: number;
  linkCount: number;
}

export class TopInfluencingDomainsService {
  public analyze(responses: AIStoredResponse[]): TopInfluencingDomainsResult {
    const domains = new Map<string, DomainAccumulator>();

    for (const response of responses) {
      const responseDomainKeys = new Set<string>();

      for (const source of response.sources) {
        if (!source.url) {
          continue;
        }

        const domain = extractHostname(source.url);
        if (!domain) {
          continue;
        }

        const existing = domains.get(domain) ?? {
          responseIds: new Set<string>(),
          referenceCount: 0,
          sourceCount: 0,
          citationCount: 0,
          linkCount: 0,
        };

        existing.referenceCount += 1;
        existing.sourceCount += 1;
        responseDomainKeys.add(domain);
        domains.set(domain, existing);
      }

      for (const citation of response.citations) {
        if (!citation.url) {
          continue;
        }

        const domain = extractHostname(citation.url);
        if (!domain) {
          continue;
        }

        const existing = domains.get(domain) ?? {
          responseIds: new Set<string>(),
          referenceCount: 0,
          sourceCount: 0,
          citationCount: 0,
          linkCount: 0,
        };

        existing.referenceCount += 1;
        existing.citationCount += 1;
        responseDomainKeys.add(domain);
        domains.set(domain, existing);
      }

      for (const link of response.links) {
        const domain = extractHostname(link.url);
        if (!domain) {
          continue;
        }

        const existing = domains.get(domain) ?? {
          responseIds: new Set<string>(),
          referenceCount: 0,
          sourceCount: 0,
          citationCount: 0,
          linkCount: 0,
        };

        existing.referenceCount += 1;
        existing.linkCount += 1;
        responseDomainKeys.add(domain);
        domains.set(domain, existing);
      }

      for (const domain of responseDomainKeys) {
        domains.get(domain)?.responseIds.add(response.responseId);
      }
    }

    return {
      responseCount: responses.length,
      domains: [...domains.entries()]
        .map(([domain, counts]) => ({
          domain,
          responseCount: counts.responseIds.size,
          referenceCount: counts.referenceCount,
          sourceCount: counts.sourceCount,
          citationCount: counts.citationCount,
          linkCount: counts.linkCount,
        }))
        .sort((left, right) => {
          if (right.responseCount !== left.responseCount) {
            return right.responseCount - left.responseCount;
          }

          if (right.referenceCount !== left.referenceCount) {
            return right.referenceCount - left.referenceCount;
          }

          return left.domain.localeCompare(right.domain);
        }),
      analyzedAt: new Date().toISOString(),
    };
  }
}