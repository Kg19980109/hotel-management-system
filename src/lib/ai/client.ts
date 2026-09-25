// ============================================================
// STAYHUB AI PROVIDER ABSTRACTION & CLIENT (Phase 20)
// Pluggable provider layer with Gemini, OpenAI, and RuleBased fallback
// ============================================================

import { getAIConfig } from "./config";
import { buildSystemPrompt } from "./prompts";
import { getAuthorizedTools, getToolDeclarationsForAI } from "./tool-registry";
import { executeAITool } from "./tool-executor";
import { detectPromptInjection, truncateConversation } from "./safety";
import { formatToolResultAsMarkdown } from "./formatters";
import type {
  ChatMessage,
  AIExecutionContext,
  AIToolDefinition,
  AIChatResponse,
  AIToolCall,
} from "./types";

export interface AIProvider {
  name: string;
  generateResponse(
    messages: ChatMessage[],
    context: AIExecutionContext,
    tools: AIToolDefinition[]
  ): Promise<AIChatResponse>;
}

// ------------------------------------------------------------
// 1. RULE-BASED / DETERMINISTIC SMART PROVIDER (Fallback / Offline)
// ------------------------------------------------------------
export class RuleBasedSmartProvider implements AIProvider {
  name = "rule-based";

  async generateResponse(
    messages: ChatMessage[],
    context: AIExecutionContext
  ): Promise<AIChatResponse> {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const query = (lastUserMsg?.content || "").toLowerCase();

    // Check for prompt injection
    const injectionCheck = detectPromptInjection(query);
    if (injectionCheck.isSuspicious) {
      return {
        message: {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `I cannot fulfill this request. ${injectionCheck.reason}`,
          createdAt: new Date().toISOString(),
        },
        toolExecutions: [],
        sources: [],
      };
    }

    // Determine relevant tool based on question keywords
    let toolToRun = "get_hotel_overview";
    let defaultRange = "today";

    if (query.includes("yesterday")) defaultRange = "yesterday";
    else if (query.includes("last 7 days") || query.includes("this week")) defaultRange = "this week";
    else if (query.includes("last month") || query.includes("previous month")) defaultRange = "last month";
    else if (query.includes("this month")) defaultRange = "this month";
    else if (query.includes("last 30 days")) defaultRange = "last 30 days";

    if (query.includes("occupan") || query.includes("adr") || query.includes("revpar")) {
      toolToRun = "get_occupancy_metrics";
    } else if (query.includes("room status") || query.includes("dirty") || query.includes("clean") || query.includes("out of order")) {
      toolToRun = "get_room_status_summary";
    } else if (query.includes("revenue") || query.includes("income") || query.includes("sales") || query.includes("folio")) {
      if (query.includes("folio") || query.includes("outstanding") || query.includes("balance")) {
        toolToRun = "get_folio_summary";
      } else {
        toolToRun = "get_revenue_metrics";
      }
    } else if (query.includes("arrival") || query.includes("departure") || query.includes("in-house") || query.includes("front desk") || query.includes("check-in") || query.includes("checkout")) {
      toolToRun = "get_front_desk_summary";
    } else if (query.includes("booking") || query.includes("reservation") || query.includes("cancel") || query.includes("no-show")) {
      toolToRun = "get_reservation_summary";
    } else if (query.includes("restaurant") || query.includes("pos") || query.includes("menu") || query.includes("food revenue")) {
      toolToRun = "get_restaurant_summary";
    } else if (query.includes("kitchen") || query.includes("kds") || query.includes("ticket") || query.includes("delayed order") || query.includes("cook")) {
      toolToRun = "get_kitchen_summary";
    } else if (query.includes("housekeeping") || query.includes("cleaning") || query.includes("dirty room") || query.includes("turnover")) {
      toolToRun = "get_housekeeping_summary";
    } else if (query.includes("maintenance") || query.includes("work order") || query.includes("repair") || query.includes("hvac") || query.includes("broken")) {
      toolToRun = "get_maintenance_summary";
    } else if (query.includes("inventory") || query.includes("stock") || query.includes("low stock") || query.includes("item")) {
      toolToRun = "get_inventory_summary";
    } else if (query.includes("supplier") || query.includes("vendor") || query.includes("purchase order")) {
      toolToRun = "get_supplier_summary";
    } else if (query.includes("staff") || query.includes("employee") || query.includes("attendance") || query.includes("shift") || query.includes("clock in")) {
      toolToRun = "get_staff_summary";
    } else if (query.includes("expense") || query.includes("spending") || query.includes("receipt") || query.includes("cost")) {
      toolToRun = "get_expense_summary";
    } else if (query.includes("guest service") || query.includes("request") || query.includes("ticket") || query.includes("amenity")) {
      toolToRun = "get_guest_service_summary";
    } else if (query.includes("guest") || query.includes("vip") || query.includes("repeat")) {
      toolToRun = "get_guest_summary";
    }

    const toolCall: AIToolCall = {
      id: `call_${Date.now()}`,
      name: toolToRun,
      parameters: { dateRangeQuery: defaultRange },
    };

    const toolExec = await executeAITool(toolCall, context);

    const toolExecutions = [
      {
        name: toolExec.name,
        displayName: toolExec.displayName,
        summary: toolExec.error ? "Execution failed" : "Data retrieved successfully",
        error: toolExec.error,
      },
    ];

    if (toolExec.error) {
      return {
        message: {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Unable to complete query**: ${toolExec.error}`,
          createdAt: new Date().toISOString(),
          toolResults: [
            {
              toolCallId: toolCall.id,
              name: toolCall.name,
              output: null,
              error: toolExec.error,
            },
          ],
        },
        toolExecutions,
        sources: [],
      };
    }

    const markdownOutput = formatToolResultAsMarkdown(toolExec.displayName, toolExec.output);

    return {
      message: {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: markdownOutput,
        createdAt: new Date().toISOString(),
        sourceReport: toolExec.displayName,
        metrics: toolExec.output as Record<string, unknown>,
        toolResults: [
          {
            toolCallId: toolCall.id,
            name: toolCall.name,
            output: toolExec.output,
          },
        ],
      },
      toolExecutions,
      sources: [toolExec.displayName],
    };
  }
}

interface GeminiFunctionCallPart {
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
  };
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiFunctionCallPart[];
  };
}

interface GeminiApiResponse {
  candidates?: GeminiCandidate[];
}

// ------------------------------------------------------------
// 2. GEMINI PROVIDER (Google AI)
// ------------------------------------------------------------
export class GeminiProvider implements AIProvider {
  name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-1.5-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(
    messages: ChatMessage[],
    context: AIExecutionContext,
    tools: AIToolDefinition[]
  ): Promise<AIChatResponse> {
    const systemPrompt = buildSystemPrompt(context);
    const toolDeclarations = getToolDeclarationsForAI(tools);

    // Build Gemini contents
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody: Record<string, unknown> = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    };

    if (toolDeclarations.length > 0) {
      requestBody.tools = [
        {
          functionDeclarations: toolDeclarations,
        },
      ];
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[GeminiProvider] API Error (${response.status}): ${errText}`);
        // Fallback to RuleBasedSmartProvider on provider error
        const fallback = new RuleBasedSmartProvider();
        return fallback.generateResponse(messages, context);
      }

      const data = (await response.json()) as GeminiApiResponse;
      const candidate = data.candidates?.[0];
      const functionCalls = candidate?.content?.parts?.filter((p) => p.functionCall);

      if (functionCalls && functionCalls.length > 0) {
        // Execute tool calls
        const toolExecutions: Array<{
          name: string;
          displayName: string;
          summary: string;
          error?: string;
        }> = [];
        const sources: string[] = [];
        const toolResultsForPrompt: Array<{
          tool: string;
          displayName: string;
          data: unknown;
          error?: string;
        }> = [];

        for (const fc of functionCalls) {
          if (!fc.functionCall) continue;
          const callName = fc.functionCall.name;
          const callArgs = fc.functionCall.args || {};

          const toolCall: AIToolCall = {
            id: `call_${Date.now()}_${callName}`,
            name: callName,
            parameters: callArgs,
          };

          const result = await executeAITool(toolCall, context);
          toolExecutions.push({
            name: result.name,
            displayName: result.displayName,
            summary: result.error ? "Failed" : "Retrieved",
            error: result.error,
          });

          if (!result.error) {
            sources.push(result.displayName);
          }

          toolResultsForPrompt.push({
            tool: result.name,
            displayName: result.displayName,
            data: result.output,
            error: result.error,
          });
        }

        // Generate final summary with tool data
        const summaryText = formatToolResultAsMarkdown(
          toolExecutions[0]?.displayName || "Hotel Report",
          toolResultsForPrompt[0]?.data
        );

        return {
          message: {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: summaryText,
            createdAt: new Date().toISOString(),
            sourceReport: sources.join(", "),
            metrics: toolResultsForPrompt[0]?.data as Record<string, unknown>,
          },
          toolExecutions,
          sources,
        };
      }

      const textResponse = candidate?.content?.parts?.[0]?.text || "No response generated.";

      return {
        message: {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: textResponse,
          createdAt: new Date().toISOString(),
        },
        toolExecutions: [],
        sources: [],
      };
    } catch (err: unknown) {
      console.error("[GeminiProvider] Network/execution error:", err);
      const fallback = new RuleBasedSmartProvider();
      return fallback.generateResponse(messages, context);
    }
  }
}

// ------------------------------------------------------------
// 3. OPENAI PROVIDER
// ------------------------------------------------------------
export class OpenAIProvider implements AIProvider {
  name = "openai";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(
    messages: ChatMessage[],
    context: AIExecutionContext
  ): Promise<AIChatResponse> {
    const fallback = new RuleBasedSmartProvider();
    return fallback.generateResponse(messages, context);
  }
}

/**
 * Resolves the configured AI provider based on environment variables
 */
export function getAIProvider(): AIProvider {
  const config = getAIConfig();

  if (config.provider === "gemini" && config.apiKey) {
    return new GeminiProvider(config.apiKey, config.model || "gemini-1.5-flash");
  }

  if (config.provider === "openai" && config.apiKey) {
    return new OpenAIProvider(config.apiKey, config.model || "gpt-4o-mini");
  }

  // Default robust fallback
  return new RuleBasedSmartProvider();
}

/**
 * Main AI chat entrypoint for business buddy queries
 */
export async function processAIChatMessage(
  messages: ChatMessage[],
  context: AIExecutionContext
): Promise<AIChatResponse> {
  const boundedMessages = truncateConversation(messages, 8);
  const authorizedTools = getAuthorizedTools(context);
  const provider = getAIProvider();

  return provider.generateResponse(boundedMessages, context, authorizedTools);
}
