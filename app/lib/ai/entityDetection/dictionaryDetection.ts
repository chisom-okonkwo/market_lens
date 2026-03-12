import {
  DEFAULT_BRAND_DICTIONARY,
  DEFAULT_RETAILER_DICTIONARY,
} from "@/lib/ai/entityDetection/dictionaries";
import { escapeRegExp } from "@/lib/ai/entityDetection/utils";

export function findDictionaryMentions(
  text: string,
  dictionary: readonly string[],
): string[] {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return [];
  }

  const seen = new Set<string>();
  const matches: string[] = [];

  for (const entry of dictionary) {
    const escapedEntry = escapeRegExp(entry);
    const pattern = new RegExp(`\\b${escapedEntry}\\b`, "i");

    if (pattern.test(normalizedText) && !seen.has(entry)) {
      matches.push(entry);
      seen.add(entry);
    }
  }

  return matches;
}

export function detectBrandMentions(
  text: string,
  dictionary: readonly string[] = DEFAULT_BRAND_DICTIONARY,
): string[] {
  return findDictionaryMentions(text, dictionary);
}

export function detectRetailerMentions(
  text: string,
  dictionary: readonly string[] = DEFAULT_RETAILER_DICTIONARY,
): string[] {
  return findDictionaryMentions(text, dictionary);
}
