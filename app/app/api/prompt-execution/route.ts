import { NextResponse } from "next/server";

import { responseEntityDetectionOrchestrator } from "@/lib/ai/orchestration/responseEntityDetectionOrchestrator";
import { promptExecutionQueue } from "@/lib/ai/queue/promptExecutionQueue";

interface PromptExecutionRequest {
  prompt: string;
}

// Thin API entry point: execute the prompt, then enrich the collected outputs for downstream analytics.
export async function POST(request: Request) {
  let body: PromptExecutionRequest;

  try {
    body = (await request.json()) as PromptExecutionRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required and cannot be empty." },
      { status: 400 },
    );
  }

  try {
    const jobResult = await promptExecutionQueue.enqueue(prompt);
    const payload = await responseEntityDetectionOrchestrator.processCollectedResponses(
      jobResult.responses,
    );

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to execute prompt right now.";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
