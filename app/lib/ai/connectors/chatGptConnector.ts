import { randomUUID } from "node:crypto";

import { AIPlatform, type AIResponse } from "@/lib/aiResponse";
import { type AIConnector } from "@/lib/ai/connectors/types";

interface OpenAIChatCompletionMessage {
  role: string;
  content: string;
}

interface OpenAIChatCompletionChoice {
  index: number;
  message: OpenAIChatCompletionMessage;
  finish_reason: string;
}

interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChatCompletionChoice[];
}

interface OpenAIErrorResponse {
  error?: {
    message?: string;
  };
}

interface ChatGptConnectorOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class ChatGptConnector implements AIConnector {
  public readonly platform = AIPlatform.ChatGPT;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  public constructor(options: ChatGptConnectorOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    this.baseUrl = options.baseUrl ?? "https://api.openai.com";
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async executePrompt(prompt: string): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const normalizedPrompt = prompt.trim();

    if (!normalizedPrompt) {
      throw new Error("Prompt is required and cannot be empty.");
    }

    const rawResponse = await this.executeRaw(normalizedPrompt);
    return this.toAIResponse(rawResponse, normalizedPrompt);
  }

  public async executeRaw(prompt: string): Promise<OpenAIChatCompletionResponse> {
    const response = await this.fetchFn(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(await this.readOpenAIError(response));
    }

    return (await response.json()) as OpenAIChatCompletionResponse;
  }

  private async readOpenAIError(response: Response): Promise<string> {
    try {
      const errorBody = (await response.json()) as OpenAIErrorResponse;
      return errorBody.error?.message ?? `OpenAI request failed with status ${response.status}.`;
    } catch {
      return `OpenAI request failed with status ${response.status}.`;
    }
  }

  private toAIResponse(
    raw: OpenAIChatCompletionResponse,
    prompt: string,
  ): AIResponse {
    const responseText = raw.choices[0]?.message?.content ?? "";

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
