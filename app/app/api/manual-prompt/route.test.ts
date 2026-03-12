import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/manual-prompt/route";

describe("POST /api/manual-prompt", () => {
  it("returns 400 when prompt is missing", async () => {
    const request = new Request("http://localhost:3000/api/manual-prompt", {
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
    const request = new Request("http://localhost:3000/api/manual-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "   " }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Prompt is required and cannot be empty.");
  });

  it("returns success with normalized prompt", async () => {
    const request = new Request("http://localhost:3000/api/manual-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "  Best cordless drill  " }),
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      message: string;
      prompt: string;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: "Manual prompt received successfully.",
      prompt: "Best cordless drill",
    });
  });
});
