import { describe, expect, it, vi } from "vitest";

import { AIPlatform } from "@/lib/aiResponse";
import { GeminiConnector } from "@/lib/ai/connectors/geminiConnector";

describe("GeminiConnector", () => {
  it("calls Gemini API and maps result into AIResponse", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              role: "model",
              parts: [{ text: "1. DeWalt\n2. Bosch\n3. Ryobi" }],
            },
            finishReason: "STOP",
          },
        ],
        modelVersion: "gemini-2.0-flash",
      }),
    });

    const connector = new GeminiConnector({
      apiKey: "test-key",
      fetchFn,
      model: "gemini-2.0-flash",
    });

    const result = await connector.executePrompt("Best cordless drill for beginners");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=test-key",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.promptId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.platform).toBe(AIPlatform.Gemini);
    expect(result.model).toBe("gemini-2.0-flash");
    expect(result.prompt).toBe("Best cordless drill for beginners");
    expect(result.responseText).toContain("DeWalt");
    expect(result.sources).toEqual([]);
    expect(result.citations).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    const connector = new GeminiConnector({ apiKey: "" });

    await expect(connector.executePrompt("Best cordless drill for beginners")).rejects.toThrow(
      "GEMINI_API_KEY is not configured.",
    );
  });

  it("throws when Gemini returns non-2xx", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "API key not valid. Please pass a valid API key." } }),
    });

    const connector = new GeminiConnector({
      apiKey: "test-key",
      fetchFn,
    });

    await expect(connector.executePrompt("Best cordless drill for beginners")).rejects.toThrow(
      "API key not valid. Please pass a valid API key.",
    );
  });
});