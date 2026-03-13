import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  buildAIResponseId,
  type AICitation,
  type AIPlatform,
  type AIResponse,
  type AIResponseLink,
  type AISource,
} from "@/lib/aiResponse";
import { type EntityDetectionResult } from "@/lib/ai/entityDetection/types";
import {
  type AccuracySeverity,
  type ResponseAccuracyAnalysis,
} from "@/lib/ai/hallucinationDetection/types";

const AI_RESPONSE_RECORDS_TABLE = "ai_response_records";

export interface AIResponseAnalysisPayload {
  sources: AISource[];
  citations: AICitation[];
  links: AIResponseLink[];
  rankingOrder?: string[];
  entityDetection?: EntityDetectionResult;
  accuracyAnalysis?: ResponseAccuracyAnalysis;
}

export interface AIStoredResponse {
  promptId: string;
  responseId: string;
  platform: AIPlatform;
  model: string;
  prompt: string;
  responseText: string;
  timestamp: string;
  sources: AISource[];
  citations: AICitation[];
  links: AIResponseLink[];
  rankingOrder?: string[];
  hallucinationDetected: boolean;
  overallAccuracyScore: number;
  overallSeverity: AccuracySeverity;
  analysisPayload: AIResponseAnalysisPayload;
}

export interface AIProcessedResponseRecord {
  response: AIResponse;
  entityDetection: EntityDetectionResult;
  accuracyAnalysis: ResponseAccuracyAnalysis;
}

export interface AIResponseRepository {
  saveRawResponse(response: AIResponse): Promise<void>;
  saveProcessedResponse(record: AIProcessedResponseRecord): Promise<void>;
  findByPromptId(promptId: string): Promise<AIStoredResponse | undefined>;
  listAll(): Promise<AIStoredResponse[]>;
}

interface AIResponseRecordRow {
  prompt_id: string;
  response_id: string;
  platform: AIPlatform;
  model: string;
  prompt: string;
  response_text: string;
  responded_at: string;
  hallucination_detected: boolean;
  overall_accuracy_score: number;
  overall_severity: AccuracySeverity;
  analysis_payload: AIResponseAnalysisPayload;
}

function cloneStoredResponse(response: AIStoredResponse): AIStoredResponse {
  return {
    ...response,
    sources: response.sources.map((source) => ({ ...source })),
    citations: response.citations.map((citation) => ({ ...citation })),
    links: response.links.map((link) => ({ ...link })),
    rankingOrder: response.rankingOrder ? [...response.rankingOrder] : undefined,
    analysisPayload: {
      sources: response.analysisPayload.sources.map((source) => ({ ...source })),
      citations: response.analysisPayload.citations.map((citation) => ({ ...citation })),
      links: response.analysisPayload.links.map((link) => ({ ...link })),
      rankingOrder: response.analysisPayload.rankingOrder
        ? [...response.analysisPayload.rankingOrder]
        : undefined,
      entityDetection: response.analysisPayload.entityDetection
        ? {
            ...response.analysisPayload.entityDetection,
            brandMentions: [...response.analysisPayload.entityDetection.brandMentions],
            productMentions: [...response.analysisPayload.entityDetection.productMentions],
            retailerMentions: [...response.analysisPayload.entityDetection.retailerMentions],
            claims: [...response.analysisPayload.entityDetection.claims],
          }
        : undefined,
      accuracyAnalysis: response.analysisPayload.accuracyAnalysis
        ? {
            ...response.analysisPayload.accuracyAnalysis,
            results: response.analysisPayload.accuracyAnalysis.results.map((result) => ({
              ...result,
            })),
          }
        : undefined,
    },
  };
}

export function toStoredResponse(response: AIResponse): AIStoredResponse {
  return {
    promptId: response.promptId,
    responseId: buildAIResponseId(response),
    platform: response.platform,
    model: response.model,
    prompt: response.prompt,
    responseText: response.responseText,
    timestamp: response.timestamp,
    sources: [...response.sources],
    citations: [...response.citations],
    links: [...response.links],
    rankingOrder: response.rankingOrder ? [...response.rankingOrder] : undefined,
    hallucinationDetected: false,
    overallAccuracyScore: 1,
    overallSeverity: "low",
    analysisPayload: {
      sources: [...response.sources],
      citations: [...response.citations],
      links: [...response.links],
      rankingOrder: response.rankingOrder ? [...response.rankingOrder] : undefined,
    },
  };
}

export function toProcessedStoredResponse(
  record: AIProcessedResponseRecord,
): AIStoredResponse {
  const stored = toStoredResponse(record.response);

  return {
    ...stored,
    hallucinationDetected: record.accuracyAnalysis.hallucinationDetected,
    overallAccuracyScore: record.accuracyAnalysis.overallAccuracyScore,
    overallSeverity: record.accuracyAnalysis.overallSeverity,
    analysisPayload: {
      ...stored.analysisPayload,
      entityDetection: {
        ...record.entityDetection,
        brandMentions: [...record.entityDetection.brandMentions],
        productMentions: [...record.entityDetection.productMentions],
        retailerMentions: [...record.entityDetection.retailerMentions],
        claims: [...record.entityDetection.claims],
      },
      accuracyAnalysis: {
        ...record.accuracyAnalysis,
        results: record.accuracyAnalysis.results.map((result) => ({ ...result })),
      },
    },
  };
}

function toDatabaseRow(response: AIStoredResponse): AIResponseRecordRow {
  return {
    prompt_id: response.promptId,
    response_id: response.responseId,
    platform: response.platform,
    model: response.model,
    prompt: response.prompt,
    response_text: response.responseText,
    responded_at: response.timestamp,
    hallucination_detected: response.hallucinationDetected,
    overall_accuracy_score: response.overallAccuracyScore,
    overall_severity: response.overallSeverity,
    analysis_payload: cloneStoredResponse(response).analysisPayload,
  };
}

function fromDatabaseRow(row: AIResponseRecordRow): AIStoredResponse {
  const accuracyAnalysis = row.analysis_payload.accuracyAnalysis;
  const entityDetection = row.analysis_payload.entityDetection;

  return {
    promptId: row.prompt_id,
    responseId: row.response_id,
    platform: row.platform,
    model: row.model,
    prompt: row.prompt,
    responseText: row.response_text,
    timestamp: row.responded_at,
    sources: row.analysis_payload.sources ?? [],
    citations: row.analysis_payload.citations ?? [],
    links: row.analysis_payload.links ?? [],
    rankingOrder: row.analysis_payload.rankingOrder,
    hallucinationDetected: row.hallucination_detected,
    overallAccuracyScore: Number(row.overall_accuracy_score),
    overallSeverity: row.overall_severity,
    analysisPayload: {
      sources: row.analysis_payload.sources ?? [],
      citations: row.analysis_payload.citations ?? [],
      links: row.analysis_payload.links ?? [],
      rankingOrder: row.analysis_payload.rankingOrder,
      entityDetection: entityDetection
        ? {
            ...entityDetection,
            brandMentions: [...entityDetection.brandMentions],
            productMentions: [...entityDetection.productMentions],
            retailerMentions: [...entityDetection.retailerMentions],
            claims: [...entityDetection.claims],
          }
        : undefined,
      accuracyAnalysis: accuracyAnalysis
        ? {
            ...accuracyAnalysis,
            results: accuracyAnalysis.results.map((result) => ({ ...result })),
          }
        : undefined,
    },
  };
}

function hasSupabaseConfig(): boolean {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key);
}

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase persistence requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export class InMemoryAIResponseRepository implements AIResponseRepository {
  private readonly responses = new Map<string, AIStoredResponse>();

  public async saveRawResponse(response: AIResponse): Promise<void> {
    const stored = toStoredResponse(response);
    this.responses.set(stored.responseId, cloneStoredResponse(stored));
  }

  public async saveProcessedResponse(record: AIProcessedResponseRecord): Promise<void> {
    const stored = toProcessedStoredResponse(record);
    this.responses.set(stored.responseId, cloneStoredResponse(stored));
  }

  public async findByPromptId(promptId: string): Promise<AIStoredResponse | undefined> {
    const response = [...this.responses.values()].find((entry) => entry.promptId === promptId);
    return response ? cloneStoredResponse(response) : undefined;
  }

  public async listAll(): Promise<AIStoredResponse[]> {
    return [...this.responses.values()].map((response) => cloneStoredResponse(response));
  }
}

export class SupabaseAIResponseRepository implements AIResponseRepository {
  private readonly client: SupabaseClient;

  public constructor(client: SupabaseClient = createSupabaseClient()) {
    this.client = client;
  }

  public async saveRawResponse(response: AIResponse): Promise<void> {
    await this.upsertRecord(toStoredResponse(response));
  }

  public async saveProcessedResponse(record: AIProcessedResponseRecord): Promise<void> {
    await this.upsertRecord(toProcessedStoredResponse(record));
  }

  public async findByPromptId(promptId: string): Promise<AIStoredResponse | undefined> {
    const { data, error } = await this.client
      .from(AI_RESPONSE_RECORDS_TABLE)
      .select("*")
      .eq("prompt_id", promptId)
      .limit(1)
      .maybeSingle<AIResponseRecordRow>();

    if (error) {
      throw new Error(`Failed to fetch AI response record: ${error.message}`);
    }

    return data ? fromDatabaseRow(data) : undefined;
  }

  public async listAll(): Promise<AIStoredResponse[]> {
    const { data, error } = await this.client
      .from(AI_RESPONSE_RECORDS_TABLE)
      .select("*")
      .order("responded_at", { ascending: false })
      .returns<AIResponseRecordRow[]>();

    if (error) {
      throw new Error(`Failed to list AI response records: ${error.message}`);
    }

    return (data ?? []).map((row) => fromDatabaseRow(row));
  }

  private async upsertRecord(response: AIStoredResponse): Promise<void> {
    const { error } = await this.client
      .from(AI_RESPONSE_RECORDS_TABLE)
      .upsert(toDatabaseRow(response), { onConflict: "response_id" });

    if (error) {
      throw new Error(`Failed to save AI response record: ${error.message}`);
    }
  }
}

export function createAIResponseRepository(): AIResponseRepository {
  if (hasSupabaseConfig()) {
    return new SupabaseAIResponseRepository();
  }

  return new InMemoryAIResponseRepository();
}

export const aiResponseRepository = createAIResponseRepository();
