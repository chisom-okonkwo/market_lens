import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ManualPromptPage from "@/app/manual-prompt/page";
import { AIPlatform } from "@/lib/aiResponse";
import { EntitySentiment } from "@/lib/ai/entityDetection/types";
import {
  executeMonitoredPrompts,
  loadMonitoredPrompts,
  submitManualPrompt,
} from "@/lib/manualPromptClient";

vi.mock("@/lib/manualPromptClient", () => ({
  submitManualPrompt: vi.fn(),
  loadMonitoredPrompts: vi.fn(),
  executeMonitoredPrompts: vi.fn(),
}));

const submitManualPromptMock = vi.mocked(submitManualPrompt);
const loadMonitoredPromptsMock = vi.mocked(loadMonitoredPrompts);
const executeMonitoredPromptsMock = vi.mocked(executeMonitoredPrompts);

describe("ManualPromptPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    submitManualPromptMock.mockReset();
    loadMonitoredPromptsMock.mockReset();
    executeMonitoredPromptsMock.mockReset();
    loadMonitoredPromptsMock.mockResolvedValue({
      ok: true,
      prompts: [
        {
          id: "monitored-1",
          prompt: "best cordless drill for beginners",
          label: "Drill prompt",
          isActive: true,
          sortOrder: 1,
        },
      ],
    });
  });

  it("shows validation when submitting an empty prompt", async () => {
    render(<ManualPromptPage />);

    expect(await screen.findByText("Monitored prompts from database")).toBeInTheDocument();

    const form = screen.getByRole("button", { name: "Submit Prompt" }).closest("form");
    if (!form) {
      throw new Error("Form not found");
    }

    fireEvent.submit(form);

    expect(await screen.findByText("Please enter a prompt before submitting.")).toBeInTheDocument();
    expect(submitManualPromptMock).not.toHaveBeenCalled();
  });

  it("submits a trimmed prompt and shows AI output", async () => {
    submitManualPromptMock.mockResolvedValue({
      ok: true,
      responses: [
        {
          promptId: "prompt-123",
          platform: AIPlatform.ChatGPT,
          model: "gpt-4o-mini",
          prompt: "Best cordless drill",
          responseText: "DeWalt and Bosch are great beginner options.",
          timestamp: new Date().toISOString(),
          sources: [],
          citations: [],
          links: [],
          rankingOrder: ["DeWalt", "Bosch"],
        },
      ],
      entityDetections: [
        {
          responseId: "ChatGPT:prompt-123",
          brandMentions: ["DeWalt", "Bosch"],
          productMentions: ["DeWalt DCD771"],
          retailerMentions: ["Amazon"],
          claims: ["The best cordless drills include the DeWalt DCD771"],
          sentiment: EntitySentiment.Positive,
          rawText: "DeWalt and Bosch are great beginner options.",
          extractedAt: new Date().toISOString(),
        },
      ],
      accuracyAnalyses: [
        {
          responseId: "ChatGPT:prompt-123",
          results: [
            {
              claim: "The best cordless drills include the DeWalt DCD771",
              isAccurate: true,
              hallucinationDetected: false,
              severity: "low",
              confidence: 0.95,
              explanation: "Claim exactly matches a known ground truth fact.",
              matchedGroundTruth: "The best cordless drills include the DeWalt DCD771",
              sourceReference: "https://example.com/reviews",
            },
          ],
          claimCount: 1,
          accurateCount: 1,
          hallucinationCount: 0,
          unverifiableCount: 0,
          overallAccuracyScore: 1,
          hallucinationDetected: false,
          overallSeverity: "low",
          summary: "All 1 claim verified against known facts.",
          analyzedAt: new Date().toISOString(),
        },
      ],
    });

    render(<ManualPromptPage />);

    const input = screen.getByLabelText("Prompt");
    fireEvent.change(input, { target: { value: "  Best cordless drill  " } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Prompt" }));

    await waitFor(() => {
      expect(submitManualPromptMock).toHaveBeenCalledWith("Best cordless drill");
    });

    expect(await screen.findByText("AI Output")).toBeInTheDocument();
    expect(await screen.findByText("Entity Detection Output")).toBeInTheDocument();
    expect(
      await screen.findByText("DeWalt and Bosch are great beginner options."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Sentiment:", { exact: false })).toBeInTheDocument();
    expect(await screen.findByText("Brands:", { exact: false })).toBeInTheDocument();

    const viewMoreButton = await screen.findByRole("button", { name: "View more" });
    expect(screen.queryByText("Hallucination & Accuracy Output")).not.toBeInTheDocument();

    fireEvent.click(viewMoreButton);

    expect(await screen.findByText("Hallucination & Accuracy Output")).toBeInTheDocument();
    expect(await screen.findByText("Summary:", { exact: false })).toBeInTheDocument();
    expect(await screen.findByText("Overall accuracy score:", { exact: false })).toBeInTheDocument();
    expect(await screen.findByText("Claim exactly matches a known ground truth fact.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Hide more" })).toBeInTheDocument();
  });

  it("shows an error message when request fails", async () => {
    submitManualPromptMock.mockResolvedValue({
      ok: false,
      error: "Unable to submit prompt right now.",
    });

    render(<ManualPromptPage />);

    const input = screen.getByLabelText("Prompt");
    fireEvent.change(input, { target: { value: "Best cordless drill" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Prompt" }));

    expect(await screen.findByText("Unable to submit prompt right now.")).toBeInTheDocument();
  });

  it("runs monitored prompts from the database", async () => {
    executeMonitoredPromptsMock.mockResolvedValue({
      ok: true,
      prompts: [
        {
          id: "monitored-1",
          prompt: "best cordless drill for beginners",
          label: "Drill prompt",
          isActive: true,
          sortOrder: 1,
        },
      ],
      responses: [
        {
          promptId: "prompt-123",
          platform: AIPlatform.ChatGPT,
          model: "gpt-4o-mini",
          prompt: "best cordless drill for beginners",
          responseText: "DeWalt and Bosch are great beginner options.",
          timestamp: new Date().toISOString(),
          sources: [],
          citations: [],
          links: [],
          rankingOrder: ["DeWalt", "Bosch"],
        },
      ],
      entityDetections: [],
      accuracyAnalyses: [],
      promptCount: 1,
      responseCount: 1,
    });

    render(<ManualPromptPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Run monitored prompts" }));

    await waitFor(() => {
      expect(executeMonitoredPromptsMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("AI Output")).toBeInTheDocument();
    expect(await screen.findByText("DeWalt and Bosch are great beginner options.")).toBeInTheDocument();
  });
});
