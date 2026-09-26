"use server";

// ============================================================
// STAYHUB AI SERVER ACTIONS (Phase 20)
// Server Actions for AI Business Buddy with property isolation & RBAC
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { processAIChatMessage } from "./client";
import { isToolAuthorized } from "./permissions";
import { getSuggestedPromptsForRole } from "./prompts";
import { logAIInteraction } from "./audit";
import { getAIConfig } from "./config";
import type { ChatMessage, AIExecutionContext, AIChatResponse, SuggestedPrompt } from "./types";

async function resolveAIContext(propertyId: string): Promise<{ error?: string; context?: AIExecutionContext }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required. Please log in to use AI Business Buddy." };
    }

    // Resolve property details
    const { data: propData } = await supabase
      .from("properties")
      .select("id, name, timezone, currency, organization_id")
      .eq("id", propertyId)
      .maybeSingle();

    const propertyName = propData?.name || "StayHub Hotel";
    const timezone = propData?.timezone || "UTC";
    const currency = propData?.currency || "INR";

    // Resolve membership
    const { data: membership } = await supabase
      .from("property_memberships")
      .select("role:roles(code), status")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    let roleCode = "GENERAL_MANAGER";
    if (membership?.role) {
      roleCode = (membership.role as unknown as { code: string })?.code || "GENERAL_MANAGER";
    }

    // Check basic AI view permission
    const testContext: AIExecutionContext = {
      propertyId,
      propertyName,
      userId: user.id,
      roleCode,
      permissions: [],
      timezone,
      currency,
      organizationId: propData?.organization_id,
    };

    if (!isToolAuthorized("AI_BUSINESS_BUDDY_VIEW", testContext)) {
      return { error: `Access denied. Your role (${roleCode}) is not authorized to use the AI Business Buddy.` };
    }

    return { context: testContext };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify AI session.";
    return { error: message };
  }
}

/**
 * Server Action: Process a chat message with the AI Business Buddy
 */
export async function sendAIMessageAction(
  propertyId: string,
  messages: ChatMessage[]
): Promise<{ error: string | null; response: AIChatResponse | null }> {
  const startTime = Date.now();
  const auth = await resolveAIContext(propertyId);

  if (auth.error || !auth.context) {
    return { error: auth.error || "Authorization error", response: null };
  }

  const context = auth.context;
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const promptSummary = lastUserMsg?.content || "AI Query";

  try {
    const response = await processAIChatMessage(messages, context);
    const durationMs = Date.now() - startTime;

    const toolsUsed = response.toolExecutions.map((t) => t.name);
    await logAIInteraction({
      propertyId: context.propertyId,
      userId: context.userId,
      roleCode: context.roleCode,
      promptSummary,
      toolsUsed,
      status: "success",
      durationMs,
      provider: getAIConfig().provider,
    });

    return { error: null, response };
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : "An unexpected AI processing error occurred.";

    await logAIInteraction({
      propertyId: context.propertyId,
      userId: context.userId,
      roleCode: context.roleCode,
      promptSummary,
      toolsUsed: [],
      status: "error",
      durationMs,
      provider: getAIConfig().provider,
    });

    return { error: message, response: null };
  }
}

/**
 * Server Action: Fetch suggested questions based on the user's role
 */
export async function getAISuggestedPromptsAction(
  propertyId: string
): Promise<{ error: string | null; prompts: SuggestedPrompt[] }> {
  const auth = await resolveAIContext(propertyId);
  if (auth.error || !auth.context) {
    return { error: auth.error || "Authorization error", prompts: [] };
  }

  const prompts = getSuggestedPromptsForRole(auth.context.roleCode);
  return { error: null, prompts };
}

/**
 * Server Action: Get public AI provider configuration status (No API keys exposed)
 */
export async function getAIConfigStatusAction(): Promise<{
  provider: string;
  model: string;
  hasApiKey: boolean;
  isReady: boolean;
}> {
  const config = getAIConfig();
  return {
    provider: config.provider,
    model: config.model,
    hasApiKey: !!config.apiKey,
    isReady: true,
  };
}
