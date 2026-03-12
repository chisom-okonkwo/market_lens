import { AIPlatform, type AIResponse } from "@/lib/aiResponse";
import { ChatGptConnector } from "@/lib/ai/connectors/chatGptConnector";
import { AIConnectorRegistry } from "@/lib/ai/connectors/registry";
import { type AIConnector } from "@/lib/ai/connectors/types";
import {
  type AIResponseRepository,
  inMemoryAIResponseRepository,
  toStoredResponse,
} from "@/lib/ai/storage/aiResponseRepository";

export class PromptExecutionService {
  private readonly connectorRegistry: AIConnectorRegistry;
  private readonly responseRepository: AIResponseRepository;

  public constructor(
    connectors: AIConnector[] = [new ChatGptConnector()],
    responseRepository: AIResponseRepository = inMemoryAIResponseRepository,
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
      await this.responseRepository.save(toStoredResponse(aiResponse));
      responses.push(aiResponse);
    }

    return responses;
  }
}
