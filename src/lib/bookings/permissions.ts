// ============================================================
// STAYHUB RESERVATION & BOOKING PERMISSIONS (Phase 7)
// ============================================================

import { RoleCode } from "@/lib/auth/roles";

export type BookingPermission =
  | "BOOKING_VIEW"
  | "BOOKING_CREATE"
  | "BOOKING_UPDATE"
  | "BOOKING_CANCEL"
  | "BOOKING_ASSIGN_ROOM"
  | "BOOKING_CHANGE_STATUS"
  | "BOOKING_VIEW_FINANCIALS";

export const BOOKING_ROLE_PERMISSIONS: Record<RoleCode, BookingPermission[]> = {
  SUPER_ADMIN: [
    "BOOKING_VIEW",
    "BOOKING_CREATE",
    "BOOKING_UPDATE",
    "BOOKING_CANCEL",
    "BOOKING_ASSIGN_ROOM",
    "BOOKING_CHANGE_STATUS",
    "BOOKING_VIEW_FINANCIALS",
  ],
  HOTEL_OWNER: [
    "BOOKING_VIEW",
    "BOOKING_CREATE",
    "BOOKING_UPDATE",
    "BOOKING_CANCEL",
    "BOOKING_ASSIGN_ROOM",
    "BOOKING_CHANGE_STATUS",
    "BOOKING_VIEW_FINANCIALS",
  ],
  GENERAL_MANAGER: [
    "BOOKING_VIEW",
    "BOOKING_CREATE",
    "BOOKING_UPDATE",
    "BOOKING_CANCEL",
    "BOOKING_ASSIGN_ROOM",
    "BOOKING_CHANGE_STATUS",
    "BOOKING_VIEW_FINANCIALS",
  ],
  FRONT_DESK: [
    "BOOKING_VIEW",
    "BOOKING_CREATE",
    "BOOKING_UPDATE",
    "BOOKING_CANCEL",
    "BOOKING_ASSIGN_ROOM",
    "BOOKING_CHANGE_STATUS",
    "BOOKING_VIEW_FINANCIALS",
  ],
  RECEPTIONIST: [
    "BOOKING_VIEW",
    "BOOKING_CREATE",
    "BOOKING_UPDATE",
    "BOOKING_CANCEL",
    "BOOKING_ASSIGN_ROOM",
    "BOOKING_CHANGE_STATUS",
    "BOOKING_VIEW_FINANCIALS",
  ],
  HOUSEKEEPING: [
    "BOOKING_VIEW", // Needed to know occupancy schedules & expected check-outs
  ],
  MAINTENANCE: [
    "BOOKING_VIEW", // Needed to plan room maintenance around reservations
  ],
  ACCOUNTANT: [
    "BOOKING_VIEW",
    "BOOKING_VIEW_FINANCIALS",
  ],
  RESTAURANT_STAFF: [
    "BOOKING_VIEW", // Needed for guest name verification & room charges
  ],
  KITCHEN_STAFF: [],
};

/**
 * Checks whether the given user roles have a specific booking permission
 */
export function hasBookingPermission(
  roles: RoleCode[] | string[] | undefined,
  permission: BookingPermission
): boolean {
  if (!roles || roles.length === 0) return false;

  return roles.some((role) => {
    const permissions = BOOKING_ROLE_PERMISSIONS[role as RoleCode] || [];
    return permissions.includes(permission);
  });
}
