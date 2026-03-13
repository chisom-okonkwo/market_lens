import { randomUUID } from "node:crypto";

import { AIPlatform, type AIResponse } from "@/lib/aiResponse";
import { type AIConnector } from "@/lib/ai/connectors/types";

interface GeminiContentPart {
  text?: string;
}

interface GeminiContent {
  role?: string;
  parts?: GeminiContentPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
  finishReason?: string;
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  modelVersion?: string;
}

interface GeminiErrorResponse {
  error?: {
    message?: string;
  };
}

interface GeminiConnectorOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class GeminiConnector implements AIConnector {
  public readonly platform = AIPlatform.Gemini;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  public constructor(options: GeminiConnectorOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? "";
    this.model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    this.baseUrl = options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async executePrompt(prompt: string): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const normalizedPrompt = prompt.trim();

    if (!normalizedPrompt) {
      throw new Error("Prompt is required and cannot be empty.");
    }

    const rawResponse = await this.executeRaw(normalizedPrompt);
    return this.toAIResponse(rawResponse, normalizedPrompt);
  }

  public async executeRaw(prompt: string): Promise<GeminiGenerateContentResponse> {
    const url = new URL(`${this.baseUrl}/models/${this.model}:generateContent`);
    url.searchParams.set("key", this.apiKey);

    const response = await this.fetchFn(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(await this.readGeminiError(response));
    }

    return (await response.json()) as GeminiGenerateContentResponse;
  }

  private async readGeminiError(response: Response): Promise<string> {
    try {
      const errorBody = (await response.json()) as GeminiErrorResponse;
      return errorBody.error?.message ?? `Gemini request failed with status ${response.status}.`;
    } catch {
      return `Gemini request failed with status ${response.status}.`;
    }
  }

  private toAIResponse(raw: GeminiGenerateContentResponse, prompt: string): AIResponse {
    const responseText = raw.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? "";

    return {
      promptId: randomUUID(),
      platform: this.platform,
      model: raw.modelVersion ?? this.model,
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