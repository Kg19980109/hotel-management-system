/**
 * Centralized Role-to-Permissions Matrix for Guest Food Ordering
 */

export type GuestOrderPermission =
  | "GUEST_ORDER_VIEW"
  | "GUEST_ORDER_CREATE"
  | "GUEST_ORDER_CANCEL";

export const ROLE_GUEST_ORDER_PERMISSIONS: Record<string, GuestOrderPermission[]> = {
  SUPER_ADMIN: ["GUEST_ORDER_VIEW", "GUEST_ORDER_CREATE", "GUEST_ORDER_CANCEL"],
  HOTEL_OWNER: ["GUEST_ORDER_VIEW", "GUEST_ORDER_CREATE", "GUEST_ORDER_CANCEL"],
  GENERAL_MANAGER: ["GUEST_ORDER_VIEW", "GUEST_ORDER_CREATE", "GUEST_ORDER_CANCEL"],
  FRONT_DESK: ["GUEST_ORDER_VIEW", "GUEST_ORDER_CREATE", "GUEST_ORDER_CANCEL"],
  RECEPTIONIST: ["GUEST_ORDER_VIEW", "GUEST_ORDER_CREATE"],
  RESTAURANT_STAFF: ["GUEST_ORDER_VIEW", "GUEST_ORDER_CREATE", "GUEST_ORDER_CANCEL"],
  KITCHEN_STAFF: ["GUEST_ORDER_VIEW"],
  HOUSEKEEPING: ["GUEST_ORDER_VIEW"],
  MAINTENANCE: [],
  ACCOUNTANT: ["GUEST_ORDER_VIEW"],
};

export function hasGuestOrderPermission(
  role: string | null | undefined,
  permission: GuestOrderPermission
): boolean {
  if (!role) return false;
  const permissions = ROLE_GUEST_ORDER_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
