import { type AIResponse } from "@/lib/aiResponse";

export interface PromptExecutionJob {
  id: string;
  prompt: string;
  createdAt: string;
}

export interface PromptExecutionJobResult {
  job: PromptExecutionJob;
  responses: AIResponse[];
}

export interface PromptExecutionHandler {
  execute(prompt: string): Promise<AIResponse[]>;
}

export interface PromptExecutionQueue {
  enqueue(prompt: string): Promise<PromptExecutionJobResult>;
  getPendingCount(): number;
}
