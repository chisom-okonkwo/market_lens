import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ManualPromptPage from "@/app/manual-prompt/page";
import { AIPlatform } from "@/lib/aiResponse";
import { submitManualPrompt } from "@/lib/manualPromptClient";

vi.mock("@/lib/manualPromptClient", () => ({
  submitManualPrompt: vi.fn(),
}));

const submitManualPromptMock = vi.mocked(submitManualPrompt);

describe("ManualPromptPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    submitManualPromptMock.mockReset();
  });

  it("shows validation when submitting an empty prompt", async () => {
    render(<ManualPromptPage />);

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
    });

    render(<ManualPromptPage />);

    const input = screen.getByLabelText("Prompt");
    fireEvent.change(input, { target: { value: "  Best cordless drill  " } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Prompt" }));

    await waitFor(() => {
      expect(submitManualPromptMock).toHaveBeenCalledWith("Best cordless drill");
    });

    expect(await screen.findByText("AI Output")).toBeInTheDocument();
    expect(
      await screen.findByText("DeWalt and Bosch are great beginner options."),
    ).toBeInTheDocument();
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
});
