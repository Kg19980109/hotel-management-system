// ============================================================
// STAYHUB AI SAFETY, SANITIZATION & INJECTION DEFENSE (Phase 20)
// ============================================================

import type { ChatMessage } from "./types";

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+prompt/i,
  /reveal\s+(internal|system|database)\s+prompt/i,
  /drop\s+table/i,
  /select\s+\*\s+from/i,
  /update\s+\w+\s+set/i,
  /delete\s+from/i,
  /insert\s+into/i,
  /service_role_key/i,
  /supabase_service/i,
  /bypass\s+security/i,
  /elevation\s+of\s+privilege/i,
];

const WRITE_ACTION_PATTERNS = [
  /\b(create|book|reserve)\s+(a\s+)?(room|booking|reservation)\b/i,
  /\b(cancel|delete)\s+(a\s+)?(booking|reservation)\b/i,
  /\b(issue|process)\s+(a\s+)?(refund|payment)\b/i,
  /\b(change|set)\s+(room\s+)?status\b/i,
  /\b(modify|update)\s+(inventory|stock)\b/i,
  /\b(approve|reject)\s+(expense|leave)\b/i,
];

/**
 * Sanitize raw user input string, detect injection attempts, and ensure safety.
 */
export function sanitizeUserPrompt(prompt: string): {
  cleanPrompt: string;
  isFlagged: boolean;
  reason?: string;
} {
  if (!prompt || typeof prompt !== "string") {
    return { cleanPrompt: "", isFlagged: false };
  }

  const trimmed = prompt.trim();

  // 1. Length constraint (max 2000 chars per prompt)
  const bounded = trimmed.slice(0, 2000);

  // 2. Check for known injection patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(bounded)) {
      return {
        cleanPrompt: bounded,
        isFlagged: true,
        reason: "Prompt contains restricted keywords or instruction override attempts.",
      };
    }
  }

  // 3. Check for attempted write actions (Phase 20 is read-only)
  for (const pattern of WRITE_ACTION_PATTERNS) {
    if (pattern.test(bounded)) {
      return {
        cleanPrompt: bounded,
        isFlagged: false, // Don't block, but will be safely handled as read-only notice
      };
    }
  }

  return { cleanPrompt: bounded, isFlagged: false };
}

/**
 * Redact sensitive PII and credential patterns from text or JSON payloads.
 */
export function scrubSensitiveData(text: string): string {
  if (!text) return "";

  return text
    // Credit card numbers
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, "[REDACTED_CARD]")
    // Password strings
    .replace(/password\s*[:=]\s*["']?[^"'\s]+["']?/gi, "password: [REDACTED]")
    // Secret keys / bearer tokens
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g, "[REDACTED_JWT]");
}

/**
 * Bound conversation history to the most recent N messages to control token expenditure.
 */
export function boundConversationHistory(
  messages: ChatMessage[],
  maxTurns = 10
): ChatMessage[] {
  if (!messages || messages.length <= maxTurns) {
    return messages || [];
  }
  return messages.slice(-maxTurns);
}

export function truncateConversation(
  messages: ChatMessage[],
  maxTurns = 10
): ChatMessage[] {
  return boundConversationHistory(messages, maxTurns);
}

export function sanitizePromptInput(input: string): string {
  return sanitizeUserPrompt(input).cleanPrompt;
}

export function detectPromptInjection(prompt: string): {
  isSuspicious: boolean;
  reason?: string;
} {
  const result = sanitizeUserPrompt(prompt);
  return {
    isSuspicious: result.isFlagged,
    reason: result.reason,
  };
}
