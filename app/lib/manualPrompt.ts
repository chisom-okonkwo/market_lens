export interface ManualPromptRequest {
  prompt: string;
}

export interface ManualPromptResponse {
  message: string;
  prompt: string;
}

export function normalizePrompt(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}
