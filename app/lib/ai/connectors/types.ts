import { type AIPlatform, type AIResponse } from "@/lib/aiResponse";

export interface AIConnector {
  platform: AIPlatform;
  executePrompt(prompt: string): Promise<AIResponse>;
}
