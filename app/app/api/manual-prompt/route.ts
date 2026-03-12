import { NextResponse } from "next/server";

import {
  normalizePrompt,
  type ManualPromptRequest,
  type ManualPromptResponse,
} from "@/lib/manualPrompt";

// Temporary endpoint for the manual prompt path until full QIS-driven input is introduced.
export async function POST(request: Request) {
  let body: ManualPromptRequest;

  try {
    body = (await request.json()) as ManualPromptRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const prompt = normalizePrompt(body?.prompt);

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required and cannot be empty." },
      { status: 400 },
    );
  }

  const response: ManualPromptResponse = {
    message: "Manual prompt received successfully.",
    prompt,
  };

  return NextResponse.json(response, { status: 200 });
}
