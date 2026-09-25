// ============================================================
// STAYHUB AI AUDIT LOGGER (Phase 20)
// Audit trail for AI Business Buddy queries and tool invocations
// ============================================================

import { createClient } from "@/lib/supabase/server";

export interface CreateAuditLogParams {
  propertyId: string;
  userId: string;
  roleCode: string;
  promptSummary: string;
  toolsUsed: string[];
  status: "success" | "denied" | "error";
  durationMs: number;
  provider: string;
}

/**
 * Records an AI query interaction into the audit log.
 * Never logs sensitive PII or raw authentication keys.
 */
export async function logAIInteraction(params: CreateAuditLogParams): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // Safe console audit log
  console.log(`[AI-AUDIT] [${timestamp}] User:${params.userId} Role:${params.roleCode} Property:${params.propertyId} Tools:[${params.toolsUsed.join(",")}] Status:${params.status} (${params.durationMs}ms)`);

  try {
    const supabase = await createClient();
    
    // Attempt inserting into ai_audit_logs if available in PostgreSQL
    await supabase.from("ai_audit_logs").insert({
      property_id: params.propertyId,
      user_id: params.userId,
      role_code: params.roleCode,
      prompt_summary: params.promptSummary.slice(0, 255),
      tools_used: params.toolsUsed,
      status: params.status,
      duration_ms: params.durationMs,
      provider: params.provider,
      created_at: timestamp,
    });
  } catch {
    // Non-blocking catch
  }
}
