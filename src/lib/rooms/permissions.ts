/**
 * STAYHUB - Room Permissions Matrix
 * Phase 6: Room Management & Room Inventory Engine
 * 
 * Centralized role-based access control for room management operations.
 */

export type RoomPermission =
  | "ROOM_VIEW"
  | "ROOM_CREATE"
  | "ROOM_UPDATE"
  | "ROOM_DELETE"
  | "ROOM_STATUS_UPDATE"
  | "ROOM_HOUSEKEEPING_UPDATE"
  | "ROOM_TYPE_MANAGE"
  | "FLOOR_MANAGE";

const ROLE_PERMISSIONS: Record<string, RoomPermission[]> = {
  SUPER_ADMIN: [
    "ROOM_VIEW",
    "ROOM_CREATE",
    "ROOM_UPDATE",
    "ROOM_DELETE",
    "ROOM_STATUS_UPDATE",
    "ROOM_HOUSEKEEPING_UPDATE",
    "ROOM_TYPE_MANAGE",
    "FLOOR_MANAGE",
  ],
  HOTEL_OWNER: [
    "ROOM_VIEW",
    "ROOM_CREATE",
    "ROOM_UPDATE",
    "ROOM_DELETE",
    "ROOM_STATUS_UPDATE",
    "ROOM_HOUSEKEEPING_UPDATE",
    "ROOM_TYPE_MANAGE",
    "FLOOR_MANAGE",
  ],
  GENERAL_MANAGER: [
    "ROOM_VIEW",
    "ROOM_CREATE",
    "ROOM_UPDATE",
    "ROOM_STATUS_UPDATE",
    "ROOM_HOUSEKEEPING_UPDATE",
    "ROOM_TYPE_MANAGE",
    "FLOOR_MANAGE",
  ],
  FRONT_DESK: [
    "ROOM_VIEW",
    "ROOM_STATUS_UPDATE",
    "ROOM_HOUSEKEEPING_UPDATE",
  ],
  RECEPTIONIST: [
    "ROOM_VIEW",
    "ROOM_STATUS_UPDATE",
    "ROOM_HOUSEKEEPING_UPDATE",
  ],
  HOUSEKEEPING: [
    "ROOM_VIEW",
    "ROOM_HOUSEKEEPING_UPDATE",
  ],
  MAINTENANCE: [
    "ROOM_VIEW",
    "ROOM_STATUS_UPDATE",
  ],
  ACCOUNTANT: [
    "ROOM_VIEW",
  ],
  RESTAURANT_STAFF: [],
  KITCHEN_STAFF: [],
};

/**
 * Check if a role possesses a specific room management permission
 */
export function hasRoomPermission(
  roleCode: string | null | undefined,
  permission: RoomPermission
): boolean {
  if (!roleCode) return false;
  const permissions = ROLE_PERMISSIONS[roleCode.toUpperCase()] || [];
  return permissions.includes(permission);
}

/**
 * Convenience helper to verify if user can manage room inventory/configuration
 */
export function canConfigureRooms(roleCode: string | null | undefined): boolean {
  return hasRoomPermission(roleCode, "ROOM_CREATE") || hasRoomPermission(roleCode, "ROOM_UPDATE");
}

/**
 * Convenience helper to verify if user can update room operational status
 */
export function canUpdateOperationalStatus(roleCode: string | null | undefined): boolean {
  return hasRoomPermission(roleCode, "ROOM_STATUS_UPDATE");
}
