// ============================================================
// STAYHUB MAINTENANCE PERMISSIONS (Phase 11)
// ============================================================

import { RoleCode } from "@/lib/auth/roles";

export type MaintenancePermission =
  | "MAINTENANCE_VIEW"
  | "MAINTENANCE_CREATE"
  | "MAINTENANCE_ASSIGN"
  | "MAINTENANCE_START"
  | "MAINTENANCE_UPDATE"
  | "MAINTENANCE_RESOLVE"
  | "MAINTENANCE_CLOSE"
  | "MAINTENANCE_CANCEL"
  | "MAINTENANCE_MANAGE"
  | "MAINTENANCE_TAKE_ROOM_OUT_OF_SERVICE";

export const MAINTENANCE_ROLE_PERMISSIONS: Record<RoleCode, MaintenancePermission[]> = {
  SUPER_ADMIN: [
    "MAINTENANCE_VIEW",
    "MAINTENANCE_CREATE",
    "MAINTENANCE_ASSIGN",
    "MAINTENANCE_START",
    "MAINTENANCE_UPDATE",
    "MAINTENANCE_RESOLVE",
    "MAINTENANCE_CLOSE",
    "MAINTENANCE_CANCEL",
    "MAINTENANCE_MANAGE",
    "MAINTENANCE_TAKE_ROOM_OUT_OF_SERVICE",
  ],
  HOTEL_OWNER: [
    "MAINTENANCE_VIEW",
    "MAINTENANCE_CREATE",
    "MAINTENANCE_ASSIGN",
    "MAINTENANCE_START",
    "MAINTENANCE_UPDATE",
    "MAINTENANCE_RESOLVE",
    "MAINTENANCE_CLOSE",
    "MAINTENANCE_CANCEL",
    "MAINTENANCE_MANAGE",
    "MAINTENANCE_TAKE_ROOM_OUT_OF_SERVICE",
  ],
  GENERAL_MANAGER: [
    "MAINTENANCE_VIEW",
    "MAINTENANCE_CREATE",
    "MAINTENANCE_ASSIGN",
    "MAINTENANCE_START",
    "MAINTENANCE_UPDATE",
    "MAINTENANCE_RESOLVE",
    "MAINTENANCE_CLOSE",
    "MAINTENANCE_CANCEL",
    "MAINTENANCE_MANAGE",
    "MAINTENANCE_TAKE_ROOM_OUT_OF_SERVICE",
  ],
  MAINTENANCE: [
    "MAINTENANCE_VIEW",
    "MAINTENANCE_CREATE",
    "MAINTENANCE_ASSIGN",
    "MAINTENANCE_START",
    "MAINTENANCE_UPDATE",
    "MAINTENANCE_RESOLVE",
    "MAINTENANCE_CANCEL",
  ],
  FRONT_DESK: [
    "MAINTENANCE_VIEW",
    "MAINTENANCE_CREATE",
    "MAINTENANCE_ASSIGN",
    "MAINTENANCE_CANCEL",
  ],
  RECEPTIONIST: [
    "MAINTENANCE_VIEW",
    "MAINTENANCE_CREATE",
  ],
  HOUSEKEEPING: [
    "MAINTENANCE_VIEW",
    "MAINTENANCE_CREATE",
  ],
  ACCOUNTANT: [
    "MAINTENANCE_VIEW",
  ],
  RESTAURANT_STAFF: [
    "MAINTENANCE_VIEW",
    "MAINTENANCE_CREATE",
  ],
  KITCHEN_STAFF: [],
};

/**
 * Checks whether the given user roles have a specific maintenance permission
 */
export function hasMaintenancePermission(
  roles: RoleCode[] | string[] | undefined,
  permission: MaintenancePermission
): boolean {
  if (!roles || roles.length === 0) return false;

  return roles.some((role) => {
    const permissions = MAINTENANCE_ROLE_PERMISSIONS[role as RoleCode] || [];
    return permissions.includes(permission);
  });
}
