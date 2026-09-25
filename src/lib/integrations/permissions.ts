// ============================================================
// STAYHUB INTEGRATION PERMISSIONS (Phase 21)
// ============================================================

import type { IntegrationPermission } from "./types";

export const INTEGRATION_ROLE_PERMISSIONS: Record<string, IntegrationPermission[]> = {
  SUPER_ADMIN: ["INTEGRATIONS_VIEW", "INTEGRATIONS_MANAGE"],
  HOTEL_OWNER: ["INTEGRATIONS_VIEW", "INTEGRATIONS_MANAGE"],
  GENERAL_MANAGER: ["INTEGRATIONS_VIEW", "INTEGRATIONS_MANAGE"],
  ACCOUNTANT: ["INTEGRATIONS_VIEW"],
  FRONT_DESK: [],
  HOUSEKEEPING: [],
  MAINTENANCE: [],
  RESTAURANT_STAFF: [],
  KITCHEN_STAFF: [],
  NIGHT_AUDITOR: [],
};

export function hasIntegrationPermission(
  roleCode: string | null | undefined,
  permission: IntegrationPermission
): boolean {
  if (!roleCode) return false;
  const permissions = INTEGRATION_ROLE_PERMISSIONS[roleCode] || [];
  return permissions.includes(permission);
}
