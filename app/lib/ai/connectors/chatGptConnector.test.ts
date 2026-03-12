import { describe, expect, it, vi } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";
import { ChatGptConnector } from "@/lib/ai/connectors/chatGptConnector";

describe("ChatGptConnector", () => {
  it("calls OpenAI API and maps result into AIResponse", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "chatcmpl_123",
        object: "chat.completion",
        created: 1710000000,
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "1. DeWalt\n2. Bosch\n3. Ryobi",
            },
            finish_reason: "stop",
          },
        ],
      }),
    });

    const connector = new ChatGptConnector({
      apiKey: "test-key",
      fetchFn,
      model: "gpt-4o-mini",
    });

    const result = await connector.executePrompt("Best cordless drill for beginners");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.promptId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.platform).toBe(AIPlatform.ChatGPT);
    expect(result.model).toBe("gpt-4o-mini");
    expect(result.prompt).toBe("Best cordless drill for beginners");
    expect(result.responseText).toContain("DeWalt");
    expect(result.sources).toEqual([]);
    expect(result.citations).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    const connector = new ChatGptConnector({ apiKey: "" });

    await expect(connector.executePrompt("Best cordless drill for beginners")).rejects.toThrow(
      "OPENAI_API_KEY is not configured.",
    );
  });

  it("throws when OpenAI returns non-2xx", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Incorrect API key provided." } }),
    });

    const connector = new ChatGptConnector({
      apiKey: "test-key",
      fetchFn,
    });

    await expect(connector.executePrompt("Best cordless drill for beginners")).rejects.toThrow(
      "Incorrect API key provided.",
    );
  });
});
