// ============================================================
// STAYHUB AI CONFIGURATION (Phase 20)
// Server-only configuration loader
// ============================================================

import type { AIProviderType } from "./types";

export interface AIConfig {
  provider: AIProviderType;
  model: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  isConfigured: boolean;
}

export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER as AIProviderType) || (process.env.GEMINI_API_KEY ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : "rule-based");
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
  
  let defaultModel = "stayhub-rule-engine";
  if (provider === "gemini") {
    defaultModel = process.env.AI_MODEL || "gemini-2.0-flash";
  } else if (provider === "openai") {
    defaultModel = process.env.AI_MODEL || "gpt-4o";
  }

  const model = process.env.AI_MODEL || defaultModel;
  const maxTokens = parseInt(process.env.AI_MAX_TOKENS || "1500", 10);
  const temperature = parseFloat(process.env.AI_TEMPERATURE || "0.2");

  const isConfigured = provider === "rule-based" || Boolean(apiKey);

  return {
    provider,
    model,
    apiKey: apiKey || undefined,
    maxTokens,
    temperature,
    isConfigured,
  };
}

export function isAIConfigured(): boolean {
  const config = getAIConfig();
  return config.isConfigured;
}
