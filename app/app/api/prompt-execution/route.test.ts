import { describe, expect, it, vi } from "vitest";

import { AIPlatform, type AIResponse } from "@/lib/aiResponse";

const { enqueueMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(),
}));

vi.mock("@/lib/ai/queue/promptExecutionQueue", () => ({
  promptExecutionQueue: {
    enqueue: enqueueMock,
  },
}));

import { POST } from "@/app/api/prompt-execution/route";

describe("POST /api/prompt-execution", () => {
  it("returns 400 when request body is invalid JSON", async () => {
    enqueueMock.mockReset();

    const request = new Request("http://localhost:3000/api/prompt-execution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON payload.");
  });

  it("returns 400 when prompt is missing", async () => {
    enqueueMock.mockReset();

    const request = new Request("http://localhost:3000/api/prompt-execution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Prompt is required and cannot be empty.");
  });

  it("returns 400 when prompt is empty or whitespace", async () => {
    enqueueMock.mockReset();

    const request = new Request("http://localhost:3000/api/prompt-execution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "   " }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Prompt is required and cannot be empty.");
  });

  it("returns AIResponse array when prompt execution succeeds", async () => {
    enqueueMock.mockReset();

    const aiResponse: AIResponse = {
      promptId: "prompt-123",
      platform: AIPlatform.ChatGPT,
      model: "gpt-4o-mini",
      prompt: "Best cordless drill for beginners",
      responseText: "1. DeWalt 2. Bosch 3. Ryobi",
      timestamp: new Date().toISOString(),
      sources: [],
      citations: [],
      links: [],
      rankingOrder: ["DeWalt", "Bosch", "Ryobi"],
    };

    enqueueMock.mockResolvedValueOnce({
      job: {
        id: "job-123",
        prompt: "Best cordless drill for beginners",
        createdAt: new Date().toISOString(),
      },
      responses: [aiResponse],
    });

    const request = new Request("http://localhost:3000/api/prompt-execution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "  Best cordless drill for beginners  " }),
    });

    const response = await POST(request);
    const body = (await response.json()) as AIResponse[];

    expect(response.status).toBe(200);
    expect(enqueueMock).toHaveBeenCalledWith("Best cordless drill for beginners");
    expect(body).toEqual([aiResponse]);
  });

  it("returns 500 when prompt execution fails", async () => {
    enqueueMock.mockReset();
    enqueueMock.mockRejectedValueOnce(new Error("OpenAI request failed"));

    const request = new Request("http://localhost:3000/api/prompt-execution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Best cordless drill for beginners" }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("OpenAI request failed");
  });
});
