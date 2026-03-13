import { AIPlatform, type AIResponse } from "@/lib/aiResponse";
import { ChatGptConnector } from "@/lib/ai/connectors/chatGptConnector";
import { ClaudeConnector } from "@/lib/ai/connectors/claudeConnector";
import { GeminiConnector } from "@/lib/ai/connectors/geminiConnector";
import { AIConnectorRegistry } from "@/lib/ai/connectors/registry";
import { type AIConnector } from "@/lib/ai/connectors/types";
import {
  type AIResponseRepository,
  aiResponseRepository,
} from "@/lib/ai/storage/aiResponseRepository";

// Executes a single prompt across every configured provider and persists the raw responses.
export class PromptExecutionService {
  private readonly connectorRegistry: AIConnectorRegistry;
  private readonly responseRepository: AIResponseRepository;

  public constructor(
    connectors: AIConnector[] = createDefaultConnectors(),
    responseRepository: AIResponseRepository = aiResponseRepository,
  ) {
    this.connectorRegistry = new AIConnectorRegistry(connectors);
    this.responseRepository = responseRepository;
  }

  public async execute(prompt: string): Promise<AIResponse[]> {
    const normalizedPrompt = prompt.trim();

    if (!normalizedPrompt) {
      throw new Error("Prompt is required and cannot be empty.");
    }

    const connectors = this.connectorRegistry.getAll();

    if (connectors.length === 0) {
      throw new Error("No AI connectors are configured.");
    }

    const responses: AIResponse[] = [];

    for (const connector of connectors) {
      const aiResponse = await connector.executePrompt(normalizedPrompt);
      await this.responseRepository.saveRawResponse(aiResponse);
      responses.push(aiResponse);
    }

    return responses;
  }
}

// Providers are enabled opportunistically based on whichever API keys are present.
function createDefaultConnectors(): AIConnector[] {
  const connectors: AIConnector[] = [];

  if (process.env.OPENAI_API_KEY) {
    connectors.push(new ChatGptConnector());
  }

  if (process.env.ANTHROPIC_API_KEY) {
    connectors.push(new ClaudeConnector());
  }

  if (process.env.GEMINI_API_KEY) {
    connectors.push(new GeminiConnector());
  }

  return connectors;
}
