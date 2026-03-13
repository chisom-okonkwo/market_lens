import { describe, expect, it, vi } from "vitest";

import { AIPlatform, type AIResponse } from "@/lib/aiResponse";

const { listActiveMock, markExecutedMock, enqueueMock, processCollectedResponsesMock } = vi.hoisted(() => ({
	listActiveMock: vi.fn(),
	markExecutedMock: vi.fn(),
	enqueueMock: vi.fn(),
	processCollectedResponsesMock: vi.fn(),
}));

vi.mock("@/lib/ai/promptSources/monitoredPromptRepository", () => ({
	monitoredPromptRepository: {
		listActive: listActiveMock,
		markExecuted: markExecutedMock,
	},
}));

vi.mock("@/lib/ai/queue/promptExecutionQueue", () => ({
	promptExecutionQueue: {
		enqueue: enqueueMock,
	},
}));

vi.mock("@/lib/ai/orchestration/responseEntityDetectionOrchestrator", () => ({
	responseEntityDetectionOrchestrator: {
		processCollectedResponses: processCollectedResponsesMock,
	},
}));

import { POST } from "@/app/api/prompt-execution/monitored/route";

describe("POST /api/prompt-execution/monitored", () => {
	it("returns 400 when no active prompts exist", async () => {
		listActiveMock.mockResolvedValueOnce([]);

		const response = await POST();
		const body = (await response.json()) as { error: string };

		expect(response.status).toBe(400);
		expect(body.error).toBe("No active monitored prompts found.");
	});

	it("executes all active prompts and persists analysis", async () => {
		const prompts = [
			{ id: "prompt-1", prompt: "best cordless drill", isActive: true, sortOrder: 1 },
			{ id: "prompt-2", prompt: "best impact driver", isActive: true, sortOrder: 2 },
		];
		const responses: AIResponse[] = [
			{
				promptId: "response-1",
				platform: AIPlatform.ChatGPT,
				model: "gpt-4o-mini",
				prompt: "best cordless drill",
				responseText: "Try DeWalt.",
				timestamp: new Date().toISOString(),
				sources: [],
				citations: [],
				links: [],
				rankingOrder: undefined,
			},
			{
				promptId: "response-2",
				platform: AIPlatform.ChatGPT,
				model: "gpt-4o-mini",
				prompt: "best impact driver",
				responseText: "Try Bosch.",
				timestamp: new Date().toISOString(),
				sources: [],
				citations: [],
				links: [],
				rankingOrder: undefined,
			},
		];

		listActiveMock.mockResolvedValueOnce(prompts);
		enqueueMock
			.mockResolvedValueOnce({ job: { id: "job-1" }, responses: [responses[0]] })
			.mockResolvedValueOnce({ job: { id: "job-2" }, responses: [responses[1]] });
		processCollectedResponsesMock.mockResolvedValueOnce({
			responses,
			entityDetections: [],
			accuracyAnalyses: [],
		});

		const response = await POST();
		const body = (await response.json()) as { promptCount: number; responseCount: number };

		expect(response.status).toBe(200);
		expect(enqueueMock).toHaveBeenCalledWith("best cordless drill");
		expect(enqueueMock).toHaveBeenCalledWith("best impact driver");
		expect(processCollectedResponsesMock).toHaveBeenCalledWith(responses);
		expect(markExecutedMock).toHaveBeenCalledTimes(1);
		expect(body.promptCount).toBe(2);
		expect(body.responseCount).toBe(2);
	});
});