// ============================================================
// STAYHUB AI PERMISSIONS & ACCESS CONTROL (Phase 20)
// ============================================================

import { hasReportPermission, type ReportPermission } from "../reports/permissions";

export type AIPermission =
  | "AI_BUSINESS_BUDDY_VIEW"
  | "AI_SENSITIVE_DATA_ACCESS"
  | ReportPermission;

export const TOOL_PERMISSION_MAP: Record<string, ReportPermission | null> = {
  get_hotel_overview: "REPORTS_VIEW",
  get_occupancy_metrics: "REPORT_OCCUPANCY",
  get_room_status_summary: "REPORT_OCCUPANCY",
  get_revenue_metrics: "REPORT_REVENUE",
  get_folio_summary: "REPORT_FINANCIALS",
  get_reservation_summary: "REPORT_RESERVATIONS",
  get_front_desk_summary: "REPORT_RESERVATIONS",
  get_guest_summary: "REPORT_GUESTS",
  get_restaurant_summary: "REPORT_RESTAURANT",
  get_kitchen_summary: "REPORT_KITCHEN",
  get_housekeeping_summary: "REPORT_HOUSEKEEPING",
  get_maintenance_summary: "REPORT_MAINTENANCE",
  get_inventory_summary: "REPORT_INVENTORY",
  get_supplier_summary: "REPORT_SUPPLIERS",
  get_staff_summary: "REPORT_STAFF",
  get_expense_summary: "REPORT_EXPENSES",
  get_guest_service_summary: "REPORT_GUEST_SERVICES",
};

/**
 * Verify whether a role has permission to access the AI Business Buddy
 */
export function canAccessAIBusinessBuddy(roleCode: string | null | undefined): boolean {
  if (!roleCode) return false;
  // All authenticated hotel staff can access AI Buddy with role-scoped capabilities
  return true;
}

/**
 * Check whether a user's role allows execution of a specific AI tool
 */
export function canExecuteAITool(roleCode: string | null | undefined, toolName: string): boolean {
  if (!roleCode) return false;
  
  const requiredPermission = TOOL_PERMISSION_MAP[toolName];
  if (!requiredPermission) {
    // If no specific permission required, default to general view permission
    return hasReportPermission(roleCode, "REPORTS_VIEW");
  }

  return hasReportPermission(roleCode, requiredPermission);
}

/**
 * Filter list of tools to only those permitted for the user's role
 */
export function getPermittedToolNames(roleCode: string | null | undefined): string[] {
  if (!roleCode) return [];
  return Object.keys(TOOL_PERMISSION_MAP).filter((toolName) => canExecuteAITool(roleCode, toolName));
}

export function isToolAuthorized(toolName: string, context: { roleCode: string }): boolean {
  if (toolName === "AI_BUSINESS_BUDDY_VIEW") {
    return canAccessAIBusinessBuddy(context.roleCode);
  }
  return canExecuteAITool(context.roleCode, toolName);
}

export function getDefaultRoleForCode(roleCode?: string): string {
  return roleCode || "GENERAL_MANAGER";
}
