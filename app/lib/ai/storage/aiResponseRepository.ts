import {
  type AICitation,
  type AIPlatform,
  type AIResponse,
  type AIResponseLink,
  type AISource,
} from "@/lib/aiResponse";

export interface AIStoredResponse {
  promptId: string;
  platform: AIPlatform;
  model: string;
  prompt: string;
  responseText: string;
  timestamp: string;
  sources: AISource[];
  citations: AICitation[];
  links: AIResponseLink[];
}

export interface AIResponseRepository {
  save(response: AIStoredResponse): Promise<void>;
  findByPromptId(promptId: string): Promise<AIStoredResponse | undefined>;
  listAll(): Promise<AIStoredResponse[]>;
}

export function toStoredResponse(response: AIResponse): AIStoredResponse {
  return {
    promptId: response.promptId,
    platform: response.platform,
    model: response.model,
    prompt: response.prompt,
    responseText: response.responseText,
    timestamp: response.timestamp,
    sources: [...response.sources],
    citations: [...response.citations],
    links: [...response.links],
  };
}

export class InMemoryAIResponseRepository implements AIResponseRepository {
  private readonly responses: AIStoredResponse[] = [];

  public async save(response: AIStoredResponse): Promise<void> {
    this.responses.push({
      ...response,
      sources: [...response.sources],
      citations: [...response.citations],
      links: [...response.links],
    });
  }

  public async findByPromptId(promptId: string): Promise<AIStoredResponse | undefined> {
    return this.responses.find((response) => response.promptId === promptId);
  }

  public async listAll(): Promise<AIStoredResponse[]> {
    return this.responses.map((response) => ({
      ...response,
      sources: [...response.sources],
      citations: [...response.citations],
      links: [...response.links],
    }));
  }
}

export const inMemoryAIResponseRepository = new InMemoryAIResponseRepository();
