// ============================================================
// STAYHUB AI BUSINESS BUDDY TYPES (Phase 20)
// ============================================================

export type AIProviderType = "gemini" | "openai" | "anthropic" | "rule-based" | "mock";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface AIToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
}

export interface AIToolResult {
  toolCallId: string;
  name: string;
  output: unknown;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  toolCalls?: AIToolCall[];
  toolResults?: AIToolResult[];
  sourceReport?: string;
  metrics?: Record<string, unknown>;
}

export interface AIExecutionContext {
  propertyId: string;
  propertyName: string;
  organizationId?: string;
  userId: string;
  roleCode: string;
  permissions: string[];
  timezone: string;
  currency: string;
}

export type ToolSensitivity = "public" | "internal" | "financial" | "sensitive";

export interface AIToolDefinition<TInput = Record<string, string | undefined>, TOutput = unknown> {
  name: string;
  displayName: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: string | number | boolean;
    }>;
    required?: string[];
  };
  requiredPermission?: string;
  allowedRoles?: string[];
  sensitivity: ToolSensitivity;
  execute: (params: TInput, context: AIExecutionContext) => Promise<TOutput>;
}

export interface AIChatRequest {
  messages: ChatMessage[];
  propertyId: string;
  customContext?: Record<string, unknown>;
}

export interface AIChatResponse {
  message: ChatMessage;
  toolExecutions: Array<{
    name: string;
    displayName: string;
    summary: string;
    error?: string;
  }>;
  sources: string[];
}

export interface SuggestedPrompt {
  id: string;
  category: "overview" | "financial" | "operations" | "inventory" | "staff";
  title: string;
  prompt: string;
  requiredPermission?: string;
}

export interface AIAuditLogEntry {
  id: string;
  propertyId: string;
  userId: string;
  roleCode: string;
  promptSummary: string;
  toolsUsed: string[];
  status: "success" | "denied" | "error";
  durationMs: number;
  provider: string;
  createdAt: string;
}
