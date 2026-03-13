import { NextResponse } from "next/server";

import { responseEntityDetectionOrchestrator } from "@/lib/ai/orchestration/responseEntityDetectionOrchestrator";
import {
	monitoredPromptRepository,
	type MonitoredPrompt,
} from "@/lib/ai/promptSources/monitoredPromptRepository";
import { promptExecutionQueue } from "@/lib/ai/queue/promptExecutionQueue";

export async function POST() {
	try {
		const prompts = await monitoredPromptRepository.listActive();

		if (prompts.length === 0) {
			return NextResponse.json(
				{ error: "No active monitored prompts found." },
				{ status: 400 },
			);
		}

		const allResponses = [];
		for (const prompt of prompts) {
			const jobResult = await promptExecutionQueue.enqueue(prompt.prompt);
			allResponses.push(...jobResult.responses);
		}

		const payload = await responseEntityDetectionOrchestrator.processCollectedResponses(
			allResponses,
		);
		await monitoredPromptRepository.markExecuted(prompts.map((prompt: MonitoredPrompt) => prompt.id));

		return NextResponse.json(
			{
				prompts,
				promptCount: prompts.length,
				responseCount: allResponses.length,
				...payload,
			},
			{ status: 200 },
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unable to execute monitored prompts right now.";

		return NextResponse.json({ error: message }, { status: 500 });
	}
}