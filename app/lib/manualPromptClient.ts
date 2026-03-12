import { type AIResponse } from "@/lib/aiResponse";
import { type EntityDetectionResult } from "@/lib/ai/entityDetection/types";
import { type ManualPromptRequest } from "@/lib/manualPrompt";

const FALLBACK_SUBMIT_ERROR = "Unable to submit prompt right now.";

export interface SubmitManualPromptResult {
  responses?: AIResponse[];
  entityDetections?: EntityDetectionResult[];
  ok: boolean;
  error?: string;
}

interface PromptExecutionPayload {
  responses: AIResponse[];
  entityDetections: EntityDetectionResult[];
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
    const response = await fetch("/api/prompt-execution", {
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

    const result = (await response.json()) as PromptExecutionPayload;

    return {
      ok: true,
      responses: result.responses,
      entityDetections: result.entityDetections,
    };
  } catch {
    return {
      ok: false,
      error: FALLBACK_SUBMIT_ERROR,
    };
  }
}
