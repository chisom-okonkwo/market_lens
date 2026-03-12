export enum AIPlatform {
  ChatGPT = "ChatGPT",
  Claude = "Claude",
  Gemini = "Gemini",
  Perplexity = "Perplexity",
  GoogleAI = "Google AI",
}

export interface AISource {
  name: string;
  url?: string;
}

export interface AICitation {
  title?: string;
  excerpt?: string;
  url?: string;
}

export interface AIResponseLink {
  label?: string;
  url: string;
}

export interface AIResponse {
  promptId: string;
  platform: AIPlatform;
  model: string;
  prompt: string;
  responseText: string;
  timestamp: string;
  sources: AISource[];
  citations: AICitation[];
  links: AIResponseLink[];
  rankingOrder?: string[];
}
