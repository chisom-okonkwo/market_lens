import { randomUUID } from "node:crypto";

import { AIPlatform, type AIResponse } from "@/lib/aiResponse";
import { type AIConnector } from "@/lib/ai/connectors/types";

interface ClaudeContentBlock {
  type: string;
  text?: string;
}

interface ClaudeMessageResponse {
  id: string;
  type: string;
  role: string;
  content: ClaudeContentBlock[];
  model: string;
}

interface ClaudeErrorResponse {
  error?: {
    message?: string;
  };
}

interface ClaudeConnectorOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class ClaudeConnector implements AIConnector {
  public readonly platform = AIPlatform.Claude;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  public constructor(options: ClaudeConnectorOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model = options.model ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
    this.baseUrl = options.baseUrl ?? "https://api.anthropic.com";
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async executePrompt(prompt: string): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }

    const normalizedPrompt = prompt.trim();

    if (!normalizedPrompt) {
      throw new Error("Prompt is required and cannot be empty.");
    }

    const rawResponse = await this.executeRaw(normalizedPrompt);
    return this.toAIResponse(rawResponse, normalizedPrompt);
  }

  public async executeRaw(prompt: string): Promise<ClaudeMessageResponse> {
    const response = await this.fetchFn(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(await this.readClaudeError(response));
    }

    return (await response.json()) as ClaudeMessageResponse;
  }

  private async readClaudeError(response: Response): Promise<string> {
    try {
      const errorBody = (await response.json()) as ClaudeErrorResponse;
      return errorBody.error?.message ?? `Claude request failed with status ${response.status}.`;
    } catch {
      return `Claude request failed with status ${response.status}.`;
    }
  }

  private toAIResponse(raw: ClaudeMessageResponse, prompt: string): AIResponse {
    const responseText = raw.content
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n")
      .trim();

    return {
      promptId: randomUUID(),
      platform: this.platform,
      model: raw.model,
      prompt,
      responseText,
      timestamp: new Date().toISOString(),
      sources: [],
      citations: [],
      links: [],
      rankingOrder: undefined,
    };
  }
}