/**
 * Centralized Role-to-Permissions Matrix for Guest Portal & QR Access Management
 */

export type GuestPortalPermission =
  | "GUEST_PORTAL_VIEW"
  | "GUEST_PORTAL_MANAGE"
  | "GUEST_QR_CREATE"
  | "GUEST_QR_REVOKE"
  | "GUEST_QR_ROTATE"
  | "GUEST_SESSION_VIEW"
  | "GUEST_SESSION_REVOKE";

export const ROLE_GUEST_PORTAL_PERMISSIONS: Record<string, GuestPortalPermission[]> = {
  SUPER_ADMIN: [
    "GUEST_PORTAL_VIEW",
    "GUEST_PORTAL_MANAGE",
    "GUEST_QR_CREATE",
    "GUEST_QR_REVOKE",
    "GUEST_QR_ROTATE",
    "GUEST_SESSION_VIEW",
    "GUEST_SESSION_REVOKE",
  ],
  HOTEL_OWNER: [
    "GUEST_PORTAL_VIEW",
    "GUEST_PORTAL_MANAGE",
    "GUEST_QR_CREATE",
    "GUEST_QR_REVOKE",
    "GUEST_QR_ROTATE",
    "GUEST_SESSION_VIEW",
    "GUEST_SESSION_REVOKE",
  ],
  GENERAL_MANAGER: [
    "GUEST_PORTAL_VIEW",
    "GUEST_PORTAL_MANAGE",
    "GUEST_QR_CREATE",
    "GUEST_QR_REVOKE",
    "GUEST_QR_ROTATE",
    "GUEST_SESSION_VIEW",
    "GUEST_SESSION_REVOKE",
  ],
  FRONT_DESK: [
    "GUEST_PORTAL_VIEW",
    "GUEST_PORTAL_MANAGE",
    "GUEST_QR_CREATE",
    "GUEST_QR_REVOKE",
    "GUEST_QR_ROTATE",
    "GUEST_SESSION_VIEW",
    "GUEST_SESSION_REVOKE",
  ],
  RECEPTIONIST: [
    "GUEST_PORTAL_VIEW",
    "GUEST_QR_CREATE",
    "GUEST_QR_ROTATE",
    "GUEST_SESSION_VIEW",
  ],
  HOUSEKEEPING: [],
  MAINTENANCE: [],
  RESTAURANT_STAFF: [],
  KITCHEN_STAFF: [],
  ACCOUNTANT: ["GUEST_PORTAL_VIEW"],
};

export function hasGuestPortalPermission(role: string | null | undefined, permission: GuestPortalPermission): boolean {
  if (!role) return false;
  const permissions = ROLE_GUEST_PORTAL_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
