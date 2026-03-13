import { describe, expect, it, vi } from "vitest";

const { listActiveMock } = vi.hoisted(() => ({
	listActiveMock: vi.fn(),
}));

vi.mock("@/lib/ai/promptSources/monitoredPromptRepository", () => ({
	monitoredPromptRepository: {
		listActive: listActiveMock,
	},
}));

import { GET } from "@/app/api/monitored-prompts/route";

describe("GET /api/monitored-prompts", () => {
	it("returns monitored prompts when loading succeeds", async () => {
		listActiveMock.mockResolvedValueOnce([
			{ id: "prompt-1", prompt: "best cordless drill", label: "Drills", isActive: true, sortOrder: 1 },
		]);

		const response = await GET();
		const body = (await response.json()) as { prompts: Array<{ id: string }> };

		expect(response.status).toBe(200);
		expect(body.prompts).toHaveLength(1);
		expect(body.prompts[0]?.id).toBe("prompt-1");
	});

	it("returns 500 when loading prompts fails", async () => {
		listActiveMock.mockRejectedValueOnce(new Error("Supabase unavailable"));

		const response = await GET();
		const body = (await response.json()) as { error: string };

		expect(response.status).toBe(500);
		expect(body.error).toBe("Supabase unavailable");
	});
});