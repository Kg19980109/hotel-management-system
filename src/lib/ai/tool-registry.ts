// ============================================================
// STAYHUB AI TOOL REGISTRY (Phase 20)
// Central registry for controlled business tools
// ============================================================

import { ALL_AI_TOOLS } from "./tools";
import { isToolAuthorized } from "./permissions";
import type { AIToolDefinition, AIExecutionContext } from "./types";

const toolMap = new Map<string, AIToolDefinition>();
for (const tool of ALL_AI_TOOLS) {
  toolMap.set(tool.name, tool);
}

/**
 * Retrieve a tool definition by its unique name
 */
export function getToolByName(name: string): AIToolDefinition | undefined {
  return toolMap.get(name);
}

/**
 * Retrieve all registered AI business tools
 */
export function getAllTools(): AIToolDefinition[] {
  return ALL_AI_TOOLS;
}

/**
 * Filter tools by the user's authenticated context & permissions
 */
export function getAuthorizedTools(context: AIExecutionContext): AIToolDefinition[] {
  return ALL_AI_TOOLS.filter((tool) => isToolAuthorized(tool.name, context));
}

/**
 * Format tools for LLM function/tool declaration format (OpenAI / Gemini compatible)
 */
export function getToolDeclarationsForAI(tools: AIToolDefinition[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: `${tool.description} (Category: ${tool.displayName})`,
    parameters: tool.parameters,
  }));
}
