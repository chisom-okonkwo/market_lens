import { describe, expect, it, vi } from "vitest";

const { enqueueMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(),
}));

vi.mock("@/lib/ai/queue/promptExecutionQueue", () => ({
  promptExecutionQueue: {
    enqueue: enqueueMock,
  },
}));

import { schedulePrompt } from "@/lib/ai/scheduler/promptScheduler";

describe("schedulePrompt", () => {
  it("adds prompt jobs to the execution queue", async () => {
    enqueueMock.mockReset();
    enqueueMock.mockResolvedValueOnce({
      job: {
        id: "job-1",
        prompt: "Best cordless drill for beginners",
        createdAt: new Date().toISOString(),
      },
      responses: [],
    });

    const result = await schedulePrompt("Best cordless drill for beginners");

    expect(enqueueMock).toHaveBeenCalledWith("Best cordless drill for beginners");
    expect(result.job.id).toBe("job-1");
  });
});
