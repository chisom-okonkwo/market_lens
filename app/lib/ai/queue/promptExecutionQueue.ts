import { PromptExecutionService } from "@/lib/ai/services/promptExecutionService";
import { InMemoryPromptExecutionQueue } from "@/lib/ai/queue/inMemoryPromptExecutionQueue";

export const promptExecutionQueue = new InMemoryPromptExecutionQueue(
  new PromptExecutionService(),
);
