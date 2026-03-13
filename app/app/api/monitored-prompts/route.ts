import { NextResponse } from "next/server";

import { monitoredPromptRepository } from "@/lib/ai/promptSources/monitoredPromptRepository";

export async function GET() {
	try {
		const prompts = await monitoredPromptRepository.listActive();
		return NextResponse.json({ prompts }, { status: 200 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unable to load monitored prompts right now.";

		return NextResponse.json({ error: message }, { status: 500 });
	}
}