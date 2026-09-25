// ============================================================
// STAYHUB AI SYSTEM PROMPTS & INSTRUCTIONS (Phase 20)
// ============================================================

import type { AIExecutionContext } from "./types";

export function getSystemPrompt(context: AIExecutionContext): string {
  return `You are the StayHub AI Business Buddy, an executive hotel management intelligence copilot.
You assist authorized hotel operators and staff by analyzing operational data, summarizing performance, and answering business questions.

CURRENT HOTEL CONTEXT:
- Property: "${context.propertyName}" (ID: ${context.propertyId})
- User Role: ${context.roleCode}
- Timezone: ${context.timezone}
- Currency: ${context.currency}

CORE OPERATING PRINCIPLES:
1. STRICT TRUTHFULNESS: Only state facts, numbers, and metrics that come directly from executed StayHub business tools. NEVER invent, extrapolate, or fabricate business metrics.
2. DATA UNAVAILABILITY: If a requested metric or tool result is empty or unavailable, explicitly state that the authoritative data is not recorded or available for that period.
3. READ-ONLY ENFORCEMENT: Phase 20 is strictly READ-ONLY. You cannot make bookings, issue refunds, alter room statuses, modify inventory, or change staff records. If asked to perform a write action, politely explain that actions must be performed through the respective StayHub module directly.
4. TENANT ISOLATION: You only have access to "${context.propertyName}". Never attempt to access or mention data from other properties or organizations.
5. SENSITIVE DATA PROTECTION: Never output credit cards, passwords, access tokens, or unnecessary guest/staff private personal data.
6. NO ARBITRARY SQL: Never output or attempt to execute raw SQL queries.
7. CLEAR EXECUTIVE PRESENTATION: Use clean Markdown formatting with clear section headers, bullet points, and concise executive summaries. Include relevant comparative context (e.g. versus prior period) when provided by tools.
8. CITATION & SOURCES: Briefly mention the source report (e.g. "Based on the Occupancy & ADR Report...") when reporting figures.`;
}

export function getSuggestedPrompts(roleCode: string): Array<{
  id: string;
  category: "overview" | "financial" | "operations" | "inventory" | "staff";
  title: string;
  prompt: string;
}> {
  const isManagement = ["SUPER_ADMIN", "HOTEL_OWNER", "GENERAL_MANAGER"].includes(roleCode);
  const isAccountant = roleCode === "ACCOUNTANT";
  const isFrontDesk = ["FRONT_DESK", "RECEPTIONIST"].includes(roleCode);
  const isHousekeeping = roleCode === "HOUSEKEEPING";
  const isRestaurant = ["RESTAURANT_STAFF", "KITCHEN_STAFF"].includes(roleCode);
  const prompts: Array<{
    id: string;
    category: "overview" | "financial" | "operations" | "inventory" | "staff";
    title: string;
    prompt: string;
  }> = [
    {
      id: "p1",
      category: "overview" as const,
      title: "Today's Operational Summary",
      prompt: "Give me an operational summary for today including arrivals, departures, and in-house guests.",
    },
    {
      id: "p2",
      category: "operations" as const,
      title: "Occupancy This Month",
      prompt: "What is our occupancy rate and ADR for this month?",
    },
    {
      id: "p3",
      category: "operations" as const,
      title: "Rooms Requiring Attention",
      prompt: "How many rooms are currently dirty, out of order, or out of service?",
    },
  ];

  if (isManagement || isAccountant) {
    prompts.push(
      {
        id: "p4",
        category: "financial" as const,
        title: "Monthly Revenue Breakdown",
        prompt: "How much net revenue did we generate this month across rooms, dining, and services?",
      },
      {
        id: "p5",
        category: "financial" as const,
        title: "Outstanding Folio Balances",
        prompt: "What is our current total outstanding folio balance across open stays?",
      },
      {
        id: "p6",
        category: "financial" as const,
        title: "Staff Expense Spend",
        prompt: "How much did we spend on staff expenses this month and what is pending approval?",
      }
    );
  }

  if (isManagement || isFrontDesk) {
    prompts.push({
      id: "p7",
      category: "operations" as const,
      title: "Arrivals & Departures Today",
      prompt: "List our expected arrivals and departures for today.",
    });
  }

  if (isManagement || isHousekeeping) {
    prompts.push({
      id: "p8",
      category: "operations" as const,
      title: "Housekeeping Status",
      prompt: "What is our housekeeping task completion rate and inspection pass rate?",
    });
  }

  if (isManagement || isRestaurant) {
    prompts.push({
      id: "p9",
      category: "operations" as const,
      title: "Restaurant Sales & KDS",
      prompt: "What were our restaurant gross sales and average kitchen prep time this week?",
    });
  }

  if (isManagement) {
    prompts.push(
      {
        id: "p10",
        category: "inventory" as const,
        title: "Low Stock Alerts",
        prompt: "Which inventory items are currently low in stock or out of stock?",
      },
      {
        id: "p11",
        category: "staff" as const,
        title: "Staff Attendance Today",
        prompt: "What is our staff attendance rate today and who is on leave?",
      }
    );
  }

  return prompts.slice(0, 6);
}

export function buildSystemPrompt(context: AIExecutionContext): string {
  return getSystemPrompt(context);
}

export function getSuggestedPromptsForRole(roleCode: string) {
  return getSuggestedPrompts(roleCode);
}
