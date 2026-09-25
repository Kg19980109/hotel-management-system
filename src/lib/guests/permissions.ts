// ============================================================
// STAYHUB GUEST CRM PERMISSION DEFINITIONS & RBAC MATRIX (Phase 9)
// ============================================================

export type GuestPermission =
  | "GUEST_VIEW"
  | "GUEST_CREATE"
  | "GUEST_UPDATE"
  | "GUEST_DEACTIVATE"
  | "GUEST_VIEW_HISTORY"
  | "GUEST_MANAGE_PREFERENCES"
  | "GUEST_MANAGE_NOTES";

/**
 * Role-to-Permissions Mapping for Guest CRM
 */
export const GUEST_ROLE_PERMISSIONS: Record<string, GuestPermission[]> = {
  SUPER_ADMIN: [
    "GUEST_VIEW",
    "GUEST_CREATE",
    "GUEST_UPDATE",
    "GUEST_DEACTIVATE",
    "GUEST_VIEW_HISTORY",
    "GUEST_MANAGE_PREFERENCES",
    "GUEST_MANAGE_NOTES",
  ],
  HOTEL_OWNER: [
    "GUEST_VIEW",
    "GUEST_CREATE",
    "GUEST_UPDATE",
    "GUEST_DEACTIVATE",
    "GUEST_VIEW_HISTORY",
    "GUEST_MANAGE_PREFERENCES",
    "GUEST_MANAGE_NOTES",
  ],
  GENERAL_MANAGER: [
    "GUEST_VIEW",
    "GUEST_CREATE",
    "GUEST_UPDATE",
    "GUEST_DEACTIVATE",
    "GUEST_VIEW_HISTORY",
    "GUEST_MANAGE_PREFERENCES",
    "GUEST_MANAGE_NOTES",
  ],
  FRONT_DESK: [
    "GUEST_VIEW",
    "GUEST_CREATE",
    "GUEST_UPDATE",
    "GUEST_DEACTIVATE",
    "GUEST_VIEW_HISTORY",
    "GUEST_MANAGE_PREFERENCES",
    "GUEST_MANAGE_NOTES",
  ],
  RECEPTIONIST: [
    "GUEST_VIEW",
    "GUEST_CREATE",
    "GUEST_UPDATE",
    "GUEST_DEACTIVATE",
    "GUEST_VIEW_HISTORY",
    "GUEST_MANAGE_PREFERENCES",
    "GUEST_MANAGE_NOTES",
  ],
  HOUSEKEEPING: [
    "GUEST_VIEW",
    "GUEST_VIEW_HISTORY",
  ],
  MAINTENANCE: [
    "GUEST_VIEW",
  ],
  RESTAURANT_STAFF: [
    "GUEST_VIEW",
    "GUEST_VIEW_HISTORY",
  ],
  KITCHEN_STAFF: [],
  ACCOUNTANT: [
    "GUEST_VIEW",
    "GUEST_VIEW_HISTORY",
  ],
};

/**
 * Helper to test if a given user role possesses a specific Guest CRM permission
 */
export function hasGuestPermission(
  roles: string[] | string | undefined | null,
  permission: GuestPermission
): boolean {
  if (!roles) return false;
  const roleList = Array.isArray(roles) ? roles : [roles];
  return roleList.some((role) => {
    const permissions = GUEST_ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  });
}
