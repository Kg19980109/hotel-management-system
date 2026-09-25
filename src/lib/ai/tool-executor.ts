// ============================================================
// STAYHUB AI TOOL EXECUTOR (Phase 20)
// Safe, permission-checked execution pipeline for business tools
// ============================================================

import { getToolByName } from "./tool-registry";
import { isToolAuthorized } from "./permissions";
import { sanitizePromptInput } from "./safety";
import type { AIExecutionContext, AIToolCall, AIToolResult } from "./types";

export interface ToolExecutionResult {
  toolCallId: string;
  name: string;
  displayName: string;
  output: unknown;
  error?: string;
  sourceReport?: string;
}

/**
 * Executes a single business tool safely within the user's authenticated context.
 * Performs authorization checks, input sanitization, error handling, and sensitive data bounds.
 */
export async function executeAITool(
  toolCall: AIToolCall,
  context: AIExecutionContext
): Promise<ToolExecutionResult> {
  const tool = getToolByName(toolCall.name);

  if (!tool) {
    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      displayName: toolCall.name,
      output: null,
      error: `Tool "${toolCall.name}" is not a recognized StayHub business tool.`,
    };
  }

  // Permission Check
  if (!isToolAuthorized(tool.name, context)) {
    return {
      toolCallId: toolCall.id,
      name: tool.name,
      displayName: tool.displayName,
      output: null,
      error: `Access Denied: Your role (${context.roleCode}) does not have permission to view ${tool.displayName}.`,
    };
  }

  try {
    // Sanitize parameters if string
    const sanitizedParams: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(toolCall.parameters || {})) {
      if (typeof value === "string") {
        sanitizedParams[key] = sanitizePromptInput(value);
      } else if (value !== undefined && value !== null) {
        sanitizedParams[key] = String(value);
      }
    }

    const output = await tool.execute(sanitizedParams, context);

    return {
      toolCallId: toolCall.id,
      name: tool.name,
      displayName: tool.displayName,
      output,
      sourceReport: tool.displayName,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[AIToolExecutor] Error executing tool ${tool.name}:`, err);
    return {
      toolCallId: toolCall.id,
      name: tool.name,
      displayName: tool.displayName,
      output: null,
      error: `Failed to retrieve ${tool.displayName} data: ${message}`,
    };
  }
}

/**
 * Execute multiple tool calls sequentially and collect results
 */
export async function executeAITools(
  toolCalls: AIToolCall[],
  context: AIExecutionContext
): Promise<AIToolResult[]> {
  const results: AIToolResult[] = [];

  for (const call of toolCalls) {
    const res = await executeAITool(call, context);
    results.push({
      toolCallId: res.toolCallId,
      name: res.name,
      output: res.output,
      error: res.error,
    });
  }

  return results;
}
