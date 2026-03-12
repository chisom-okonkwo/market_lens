import {
  type ManualPromptRequest,
  type ManualPromptResponse,
} from "@/lib/manualPrompt";

const FALLBACK_SUBMIT_ERROR = "Unable to submit prompt right now.";

export interface SubmitManualPromptResult {
  message?: string;
  ok: boolean;
  error?: string;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const errorBody = (await response.json()) as { error?: string };
    return errorBody.error ?? FALLBACK_SUBMIT_ERROR;
  } catch {
    return FALLBACK_SUBMIT_ERROR;
  }
}

export async function submitManualPrompt(
  prompt: string,
): Promise<SubmitManualPromptResult> {
  const payload: ManualPromptRequest = { prompt };

  try {
    const response = await fetch("/api/manual-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await readErrorMessage(response);
      return {
        ok: false,
        error,
      };
    }

    const result = (await response.json()) as ManualPromptResponse;

    return {
      ok: true,
      message: result.message,
    };
  } catch {
    return {
      ok: false,
      error: FALLBACK_SUBMIT_ERROR,
    };
  }
}
