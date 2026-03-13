import { describe, expect, it, vi } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";
import { ClaudeConnector } from "@/lib/ai/connectors/claudeConnector";

describe("ClaudeConnector", () => {
  it("calls Claude API and maps result into AIResponse", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-4-6",
        content: [
          {
            type: "text",
            text: "1. DeWalt\n2. Bosch\n3. Ryobi",
          },
        ],
      }),
    });

    const connector = new ClaudeConnector({
      apiKey: "test-key",
      fetchFn,
      model: "claude-sonnet-4-6",
    });

    const result = await connector.executePrompt("Best cordless drill for beginners");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.promptId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.platform).toBe(AIPlatform.Claude);
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.prompt).toBe("Best cordless drill for beginners");
    expect(result.responseText).toContain("DeWalt");
    expect(result.sources).toEqual([]);
    expect(result.citations).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    const connector = new ClaudeConnector({ apiKey: "" });

    await expect(connector.executePrompt("Best cordless drill for beginners")).rejects.toThrow(
      "ANTHROPIC_API_KEY is not configured.",
    );
  });

  it("throws when Claude returns non-2xx", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "invalid x-api-key" } }),
    });

    const connector = new ClaudeConnector({
      apiKey: "test-key",
      fetchFn,
    });

    await expect(connector.executePrompt("Best cordless drill for beginners")).rejects.toThrow(
      "invalid x-api-key",
    );
  });
});