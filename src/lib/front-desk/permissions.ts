// ============================================================
// STAYHUB FRONT DESK & STAY PERMISSIONS (Phase 8)
// ============================================================

import { RoleCode } from "@/lib/auth/roles";

export type FrontDeskPermission =
  | "FRONT_DESK_VIEW"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "STAY_VIEW"
  | "NO_SHOW"
  | "ROOM_REASSIGN";

export const FRONT_DESK_ROLE_PERMISSIONS: Record<RoleCode, FrontDeskPermission[]> = {
  SUPER_ADMIN: [
    "FRONT_DESK_VIEW",
    "CHECK_IN",
    "CHECK_OUT",
    "STAY_VIEW",
    "NO_SHOW",
    "ROOM_REASSIGN",
  ],
  HOTEL_OWNER: [
    "FRONT_DESK_VIEW",
    "CHECK_IN",
    "CHECK_OUT",
    "STAY_VIEW",
    "NO_SHOW",
    "ROOM_REASSIGN",
  ],
  GENERAL_MANAGER: [
    "FRONT_DESK_VIEW",
    "CHECK_IN",
    "CHECK_OUT",
    "STAY_VIEW",
    "NO_SHOW",
    "ROOM_REASSIGN",
  ],
  FRONT_DESK: [
    "FRONT_DESK_VIEW",
    "CHECK_IN",
    "CHECK_OUT",
    "STAY_VIEW",
    "NO_SHOW",
    "ROOM_REASSIGN",
  ],
  RECEPTIONIST: [
    "FRONT_DESK_VIEW",
    "CHECK_IN",
    "CHECK_OUT",
    "STAY_VIEW",
    "NO_SHOW",
    "ROOM_REASSIGN",
  ],
  HOUSEKEEPING: [
    "FRONT_DESK_VIEW",
    "STAY_VIEW",
  ],
  MAINTENANCE: [
    "FRONT_DESK_VIEW",
    "STAY_VIEW",
  ],
  ACCOUNTANT: [
    "FRONT_DESK_VIEW",
    "STAY_VIEW",
  ],
  RESTAURANT_STAFF: [
    "FRONT_DESK_VIEW",
    "STAY_VIEW",
  ],
  KITCHEN_STAFF: [],
};

/**
 * Checks whether the given user roles have a specific front desk permission
 */
export function hasFrontDeskPermission(
  roles: RoleCode[] | string[] | undefined,
  permission: FrontDeskPermission
): boolean {
  if (!roles || roles.length === 0) return false;

  return roles.some((role) => {
    const permissions = FRONT_DESK_ROLE_PERMISSIONS[role as RoleCode] || [];
    return permissions.includes(permission);
  });
}
