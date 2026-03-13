import { type AIResponse } from "@/lib/aiResponse";
import { type EntityDetectionResult } from "@/lib/ai/entityDetection/types";
import { type ResponseAccuracyAnalysis } from "@/lib/ai/hallucinationDetection/types";
import { type MonitoredPrompt } from "@/lib/ai/promptSources/monitoredPromptRepository";
import { type ManualPromptRequest } from "@/lib/manualPrompt";

const FALLBACK_SUBMIT_ERROR = "Unable to submit prompt right now.";

export interface SubmitManualPromptResult {
  responses?: AIResponse[];
  entityDetections?: EntityDetectionResult[];
  accuracyAnalyses?: ResponseAccuracyAnalysis[];
  ok: boolean;
  error?: string;
}

interface PromptExecutionPayload {
  responses: AIResponse[];
  entityDetections: EntityDetectionResult[];
  accuracyAnalyses: ResponseAccuracyAnalysis[];
}

interface MonitoredPromptExecutionPayload extends PromptExecutionPayload {
  prompts: MonitoredPrompt[];
  promptCount: number;
  responseCount: number;
}

export interface LoadMonitoredPromptsResult {
  ok: boolean;
  prompts?: MonitoredPrompt[];
  error?: string;
}

export interface ExecuteMonitoredPromptsResult extends SubmitManualPromptResult {
  prompts?: MonitoredPrompt[];
  promptCount?: number;
  responseCount?: number;
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
      accuracyAnalyses: result.accuracyAnalyses,
    };
  } catch {
    return {
      ok: false,
      error: FALLBACK_SUBMIT_ERROR,
    };
  }
}

export async function loadMonitoredPrompts(): Promise<LoadMonitoredPromptsResult> {
  try {
    const response = await fetch("/api/monitored-prompts", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await readErrorMessage(response);
      return {
        ok: false,
        error,
      };
    }

    const result = (await response.json()) as { prompts: MonitoredPrompt[] };
    return {
      ok: true,
      prompts: result.prompts,
    };
  } catch {
    return {
      ok: false,
      error: FALLBACK_SUBMIT_ERROR,
    };
  }
}

export async function executeMonitoredPrompts(): Promise<ExecuteMonitoredPromptsResult> {
  try {
    const response = await fetch("/api/prompt-execution/monitored", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await readErrorMessage(response);
      return {
        ok: false,
        error,
      };
    }

    const result = (await response.json()) as MonitoredPromptExecutionPayload;

    return {
      ok: true,
      responses: result.responses,
      entityDetections: result.entityDetections,
      accuracyAnalyses: result.accuracyAnalyses,
      prompts: result.prompts,
      promptCount: result.promptCount,
      responseCount: result.responseCount,
    };
  } catch {
    return {
      ok: false,
      error: FALLBACK_SUBMIT_ERROR,
    };
  }
}
