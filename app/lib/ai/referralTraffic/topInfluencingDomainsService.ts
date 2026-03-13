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

const URL_PATTERN = /https?:\/\/[^\s)\]>"]+/gi;
const DOMAIN_PATTERN = /\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/gi;

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

function looksLikeDomain(value: string): boolean {
  return /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value.trim());
}

function extractDomainsFromPlainText(text: string): string[] {
  const domains = new Set<string>();

  for (const match of text.matchAll(URL_PATTERN)) {
    const hostname = extractHostname(match[0]);
    if (hostname) {
      domains.add(hostname);
    }
  }

  for (const match of text.matchAll(DOMAIN_PATTERN)) {
    const candidate = match[0]?.replace(/[.,;:!?]+$/g, "");
    if (!candidate || !looksLikeDomain(candidate)) {
      continue;
    }

    domains.add(normalizeDomain(candidate));
  }

  return [...domains];
}

function extractDomainsFromUrlsOnly(text: string): string[] {
  const domains = new Set<string>();

  for (const match of text.matchAll(URL_PATTERN)) {
    const hostname = extractHostname(match[0]);
    if (hostname) {
      domains.add(hostname);
    }
  }

  return [...domains];
}

interface DomainAccumulator {
  responseIds: Set<string>;
  referenceCount: number;
  sourceCount: number;
  citationCount: number;
  linkCount: number;
}

// Domain ranking prefers direct evidence from sources, citations, links, and accuracy references.
export class TopInfluencingDomainsService {
  public analyze(responses: AIStoredResponse[]): TopInfluencingDomainsResult {
    const domains = new Map<string, DomainAccumulator>();

    const recordDomainMention = (
      domain: string,
      responseId: string,
      field: "source" | "citation" | "link",
    ) => {
      const existing = domains.get(domain) ?? {
        responseIds: new Set<string>(),
        referenceCount: 0,
        sourceCount: 0,
        citationCount: 0,
        linkCount: 0,
      };

      existing.referenceCount += 1;
      if (field === "source") {
        existing.sourceCount += 1;
      } else if (field === "citation") {
        existing.citationCount += 1;
      } else {
        existing.linkCount += 1;
      }

      existing.responseIds.add(responseId);
      domains.set(domain, existing);
    };

    for (const response of responses) {
      let hasDirectEvidence = false;

      for (const source of response.sources) {
        if (!source.url) {
          continue;
        }

        const domain = extractHostname(source.url);
        if (!domain) {
          continue;
        }

        hasDirectEvidence = true;
        recordDomainMention(domain, response.responseId, "source");
      }

      for (const source of response.sources) {
        if (!source.name || source.url) {
          continue;
        }

        for (const domain of extractDomainsFromPlainText(source.name)) {
          hasDirectEvidence = true;
          recordDomainMention(domain, response.responseId, "source");
        }
      }

      for (const citation of response.citations) {
        if (!citation.url) {
          continue;
        }

        const domain = extractHostname(citation.url);
        if (!domain) {
          continue;
        }

        hasDirectEvidence = true;
        recordDomainMention(domain, response.responseId, "citation");
      }

      for (const citation of response.citations) {
        if (!citation.title || citation.url) {
          continue;
        }

        for (const domain of extractDomainsFromPlainText(citation.title)) {
          hasDirectEvidence = true;
          recordDomainMention(domain, response.responseId, "citation");
        }
        if (citation.excerpt) {
          for (const domain of extractDomainsFromPlainText(citation.excerpt)) {
            hasDirectEvidence = true;
            recordDomainMention(domain, response.responseId, "citation");
          }
        }
      }

      for (const link of response.links) {
        const domain = extractHostname(link.url);
        if (!domain) {
          continue;
        }

        hasDirectEvidence = true;
        recordDomainMention(domain, response.responseId, "link");
      }

      const accuracyResults = response.analysisPayload.accuracyAnalysis?.results ?? [];
      for (const result of accuracyResults) {
        if (!result.sourceReference) {
          continue;
        }

        for (const domain of extractDomainsFromPlainText(result.sourceReference)) {
          hasDirectEvidence = true;
          recordDomainMention(domain, response.responseId, "citation");
        }
      }

      if (!hasDirectEvidence) {
        for (const domain of extractDomainsFromUrlsOnly(response.responseText)) {
          recordDomainMention(domain, response.responseId, "citation");
        }
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