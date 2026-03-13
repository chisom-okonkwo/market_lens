import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_MONITORED_PROMPTS_TABLE = "monitored_prompts";

export interface MonitoredPrompt {
	id: string;
	prompt: string;
	label?: string;
	isActive: boolean;
	sortOrder: number;
	lastRunAt?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface MonitoredPromptRepository {
	listActive(): Promise<MonitoredPrompt[]>;
	markExecuted(promptIds: string[], executedAt?: string): Promise<void>;
}

interface MonitoredPromptRow {
	id: string;
	prompt: string;
	label: string | null;
	is_active: boolean;
	sort_order: number | null;
	last_run_at: string | null;
	created_at: string | null;
	updated_at: string | null;
}

function getMonitoredPromptsTable(): string {
	return process.env.SUPABASE_MONITORED_PROMPTS_TABLE?.trim() || DEFAULT_MONITORED_PROMPTS_TABLE;
}

function hasSupabaseConfig(): boolean {
	const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	return Boolean(url && key);
}

function createSupabaseAdminClient(): SupabaseClient {
	const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		throw new Error(
			"Supabase prompt sourcing requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
		);
	}

	return createClient(url, key, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
}

function fromRow(row: MonitoredPromptRow): MonitoredPrompt {
	return {
		id: row.id,
		prompt: row.prompt,
		label: row.label ?? undefined,
		isActive: row.is_active,
		sortOrder: row.sort_order ?? 0,
		lastRunAt: row.last_run_at ?? undefined,
		createdAt: row.created_at ?? undefined,
		updatedAt: row.updated_at ?? undefined,
	};
}

export class InMemoryMonitoredPromptRepository implements MonitoredPromptRepository {
	public async listActive(): Promise<MonitoredPrompt[]> {
		return [];
	}

	public async markExecuted(): Promise<void> {
		return;
	}
}

export class SupabaseMonitoredPromptRepository implements MonitoredPromptRepository {
	private readonly client: SupabaseClient;
	private readonly tableName: string;

	public constructor(
		client: SupabaseClient = createSupabaseAdminClient(),
		tableName: string = getMonitoredPromptsTable(),
	) {
		this.client = client;
		this.tableName = tableName;
	}

	public async listActive(): Promise<MonitoredPrompt[]> {
		const { data, error } = await this.client
			.from(this.tableName)
			.select("id,prompt,label,is_active,sort_order,last_run_at,created_at,updated_at")
			.eq("is_active", true)
			.order("sort_order", { ascending: true })
			.order("created_at", { ascending: true })
			.returns<MonitoredPromptRow[]>();

		if (error) {
			throw new Error(`Failed to list monitored prompts: ${error.message}`);
		}

		return (data ?? []).map((row) => fromRow(row));
	}

	public async markExecuted(promptIds: string[], executedAt: string = new Date().toISOString()): Promise<void> {
		if (promptIds.length === 0) {
			return;
		}

		const { error } = await this.client
			.from(this.tableName)
			.update({ last_run_at: executedAt })
			.in("id", promptIds);

		if (error) {
			throw new Error(`Failed to update monitored prompts: ${error.message}`);
		}
	}
}

export function createMonitoredPromptRepository(): MonitoredPromptRepository {
	if (hasSupabaseConfig()) {
		return new SupabaseMonitoredPromptRepository();
	}

	return new InMemoryMonitoredPromptRepository();
}

export const monitoredPromptRepository = createMonitoredPromptRepository();