import { describe, expect, it, vi } from "vitest";

import { AIPlatform, type AIResponse } from "@/lib/aiResponse";
import { InMemoryPromptExecutionQueue } from "@/lib/ai/queue/inMemoryPromptExecutionQueue";
import { type PromptExecutionHandler } from "@/lib/ai/queue/types";

function createResponse(prompt: string): AIResponse {
  return {
    promptId: `${prompt}-id`,
    platform: AIPlatform.ChatGPT,
    model: "gpt-4o-mini",
    prompt,
    responseText: `Response for ${prompt}`,
    timestamp: new Date().toISOString(),
    sources: [],
    citations: [],
    links: [],
    rankingOrder: undefined,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("InMemoryPromptExecutionQueue", () => {
  it("processes jobs sequentially in enqueue order", async () => {
    const executionOrder: string[] = [];

    const handler: PromptExecutionHandler = {
      execute: vi.fn(async (prompt: string) => {
        executionOrder.push(`start:${prompt}`);

        if (prompt === "first") {
          await wait(15);
        }

        executionOrder.push(`end:${prompt}`);
        return [createResponse(prompt)];
      }),
    };

    const queue = new InMemoryPromptExecutionQueue(handler);

    const firstJobPromise = queue.enqueue("first");
    const secondJobPromise = queue.enqueue("second");

    const [firstResult, secondResult] = await Promise.all([firstJobPromise, secondJobPromise]);

    expect(handler.execute).toHaveBeenCalledTimes(2);
    expect(executionOrder).toEqual([
      "start:first",
      "end:first",
      "start:second",
      "end:second",
    ]);
    expect(firstResult.job.prompt).toBe("first");
    expect(secondResult.job.prompt).toBe("second");
    expect(firstResult.responses[0].prompt).toBe("first");
    expect(secondResult.responses[0].prompt).toBe("second");
  });

  it("rejects empty prompts before queueing", async () => {
    const handler: PromptExecutionHandler = {
      execute: vi.fn(),
    };

    const queue = new InMemoryPromptExecutionQueue(handler);

    await expect(queue.enqueue("   ")).rejects.toThrow(
      "Prompt is required and cannot be empty.",
    );
    expect(handler.execute).not.toHaveBeenCalled();
    expect(queue.getPendingCount()).toBe(0);
  });
});
