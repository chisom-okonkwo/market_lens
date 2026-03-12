const CLAIM_CUE_PATTERNS: RegExp[] = [
  /\b(best|top|recommended|recommend|ideal|great option|good option)\b/i,
  /\b(include|includes|included|featuring)\b/i,
  /\b(available|sold|offered|found)\b/i,
  /\b(is|are|has|have|comes with)\b/i,
];

function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.!?]+\s*|[\n\r]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function normalizeSentence(sentence: string): string {
  return sentence.replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim();
}

function looksLikeClaim(sentence: string): boolean {
  if (sentence.length < 12) {
    return false;
  }

  return CLAIM_CUE_PATTERNS.some((pattern) => pattern.test(sentence));
}

export function extractClaimSentences(text: string): string[] {
  const sentences = splitIntoSentences(text);
  const claims: string[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    const normalizedSentence = normalizeSentence(sentence);

    if (!looksLikeClaim(normalizedSentence)) {
      continue;
    }

    if (!seen.has(normalizedSentence)) {
      seen.add(normalizedSentence);
      claims.push(normalizedSentence);
    }
  }

  return claims;
}
