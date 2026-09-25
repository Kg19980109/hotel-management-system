// ============================================================
// STAYHUB KITCHEN DISPLAY SYSTEM (KDS) PERMISSIONS (Phase 13)
// ============================================================

export type KdsPermission =
  | "KDS_VIEW"
  | "KDS_MANAGE"
  | "KDS_START"
  | "KDS_UPDATE"
  | "KDS_REMAKE"
  | "KDS_PRIORITY"
  | "KDS_STATION_MANAGE"
  | "KDS_HISTORY_VIEW";

export const ROLE_KDS_PERMISSIONS: Record<string, KdsPermission[]> = {
  SUPER_ADMIN: [
    "KDS_VIEW",
    "KDS_MANAGE",
    "KDS_START",
    "KDS_UPDATE",
    "KDS_REMAKE",
    "KDS_PRIORITY",
    "KDS_STATION_MANAGE",
    "KDS_HISTORY_VIEW",
  ],
  HOTEL_OWNER: [
    "KDS_VIEW",
    "KDS_MANAGE",
    "KDS_START",
    "KDS_UPDATE",
    "KDS_REMAKE",
    "KDS_PRIORITY",
    "KDS_STATION_MANAGE",
    "KDS_HISTORY_VIEW",
  ],
  GENERAL_MANAGER: [
    "KDS_VIEW",
    "KDS_MANAGE",
    "KDS_START",
    "KDS_UPDATE",
    "KDS_REMAKE",
    "KDS_PRIORITY",
    "KDS_STATION_MANAGE",
    "KDS_HISTORY_VIEW",
  ],
  RESTAURANT_STAFF: [
    "KDS_VIEW",
    "KDS_START",
    "KDS_UPDATE",
    "KDS_REMAKE",
    "KDS_PRIORITY",
    "KDS_HISTORY_VIEW",
  ],
  KITCHEN_STAFF: [
    "KDS_VIEW",
    "KDS_START",
    "KDS_UPDATE",
    "KDS_REMAKE",
    "KDS_PRIORITY",
    "KDS_HISTORY_VIEW",
  ],
  FRONT_DESK: [
    "KDS_VIEW",
  ],
  ACCOUNTANT: [
    "KDS_HISTORY_VIEW",
  ],
  HOUSEKEEPING_STAFF: [],
  MAINTENANCE_STAFF: [],
};

export function hasKdsPermission(role: string, permission: KdsPermission): boolean {
  const permissions = ROLE_KDS_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}
