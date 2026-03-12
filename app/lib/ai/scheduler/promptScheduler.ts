import { promptExecutionQueue } from "@/lib/ai/queue/promptExecutionQueue";
import { type PromptExecutionJobResult } from "@/lib/ai/queue/types";

// Architectural placeholder for future scheduled prompt generation (QIS -> queue).
export async function schedulePrompt(prompt: string): Promise<PromptExecutionJobResult> {
  return promptExecutionQueue.enqueue(prompt);
}
