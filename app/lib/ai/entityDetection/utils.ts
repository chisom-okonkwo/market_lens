export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
