// ============================================================
// STAYHUB HOUSEKEEPING PERMISSIONS (Phase 10)
// ============================================================

import { RoleCode } from "@/lib/auth/roles";

export type HousekeepingPermission =
  | "HOUSEKEEPING_VIEW"
  | "HOUSEKEEPING_ASSIGN"
  | "HOUSEKEEPING_START"
  | "HOUSEKEEPING_COMPLETE"
  | "HOUSEKEEPING_INSPECT"
  | "HOUSEKEEPING_MANAGE";

export const HOUSEKEEPING_ROLE_PERMISSIONS: Record<RoleCode, HousekeepingPermission[]> = {
  SUPER_ADMIN: [
    "HOUSEKEEPING_VIEW",
    "HOUSEKEEPING_ASSIGN",
    "HOUSEKEEPING_START",
    "HOUSEKEEPING_COMPLETE",
    "HOUSEKEEPING_INSPECT",
    "HOUSEKEEPING_MANAGE",
  ],
  HOTEL_OWNER: [
    "HOUSEKEEPING_VIEW",
    "HOUSEKEEPING_ASSIGN",
    "HOUSEKEEPING_START",
    "HOUSEKEEPING_COMPLETE",
    "HOUSEKEEPING_INSPECT",
    "HOUSEKEEPING_MANAGE",
  ],
  GENERAL_MANAGER: [
    "HOUSEKEEPING_VIEW",
    "HOUSEKEEPING_ASSIGN",
    "HOUSEKEEPING_START",
    "HOUSEKEEPING_COMPLETE",
    "HOUSEKEEPING_INSPECT",
    "HOUSEKEEPING_MANAGE",
  ],
  FRONT_DESK: [
    "HOUSEKEEPING_VIEW",
    "HOUSEKEEPING_ASSIGN",
    "HOUSEKEEPING_INSPECT",
    "HOUSEKEEPING_MANAGE",
  ],
  RECEPTIONIST: [
    "HOUSEKEEPING_VIEW",
    "HOUSEKEEPING_ASSIGN",
    "HOUSEKEEPING_INSPECT",
  ],
  HOUSEKEEPING: [
    "HOUSEKEEPING_VIEW",
    "HOUSEKEEPING_ASSIGN",
    "HOUSEKEEPING_START",
    "HOUSEKEEPING_COMPLETE",
    "HOUSEKEEPING_INSPECT",
  ],
  MAINTENANCE: [
    "HOUSEKEEPING_VIEW",
  ],
  ACCOUNTANT: [
    "HOUSEKEEPING_VIEW",
  ],
  RESTAURANT_STAFF: [
    "HOUSEKEEPING_VIEW",
  ],
  KITCHEN_STAFF: [],
};

/**
 * Checks whether the given user roles have a specific housekeeping permission
 */
export function hasHousekeepingPermission(
  roles: RoleCode[] | string[] | undefined,
  permission: HousekeepingPermission
): boolean {
  if (!roles || roles.length === 0) return false;

  return roles.some((role) => {
    const permissions = HOUSEKEEPING_ROLE_PERMISSIONS[role as RoleCode] || [];
    return permissions.includes(permission);
  });
}
