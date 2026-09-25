// ============================================================
// STAYHUB NOTIFICATION PERMISSIONS & RBAC (Phase 21)
// ============================================================

import type { NotificationPermission } from "./types";

export const NOTIFICATION_ROLE_PERMISSIONS: Record<string, NotificationPermission[]> = {
  SUPER_ADMIN: [
    "NOTIFICATIONS_VIEW",
    "NOTIFICATIONS_MANAGE",
    "NOTIFICATION_TEMPLATES_MANAGE",
    "NOTIFICATION_PREFERENCES_MANAGE",
  ],
  HOTEL_OWNER: [
    "NOTIFICATIONS_VIEW",
    "NOTIFICATIONS_MANAGE",
    "NOTIFICATION_TEMPLATES_MANAGE",
    "NOTIFICATION_PREFERENCES_MANAGE",
  ],
  GENERAL_MANAGER: [
    "NOTIFICATIONS_VIEW",
    "NOTIFICATIONS_MANAGE",
    "NOTIFICATION_TEMPLATES_MANAGE",
    "NOTIFICATION_PREFERENCES_MANAGE",
  ],
  FRONT_DESK: [
    "NOTIFICATIONS_VIEW",
    "NOTIFICATION_PREFERENCES_MANAGE",
  ],
  HOUSEKEEPING: [
    "NOTIFICATIONS_VIEW",
    "NOTIFICATION_PREFERENCES_MANAGE",
  ],
  MAINTENANCE: [
    "NOTIFICATIONS_VIEW",
    "NOTIFICATION_PREFERENCES_MANAGE",
  ],
  RESTAURANT_STAFF: [
    "NOTIFICATIONS_VIEW",
    "NOTIFICATION_PREFERENCES_MANAGE",
  ],
  KITCHEN_STAFF: [
    "NOTIFICATIONS_VIEW",
    "NOTIFICATION_PREFERENCES_MANAGE",
  ],
  ACCOUNTANT: [
    "NOTIFICATIONS_VIEW",
    "NOTIFICATION_PREFERENCES_MANAGE",
  ],
  NIGHT_AUDITOR: [
    "NOTIFICATIONS_VIEW",
    "NOTIFICATION_PREFERENCES_MANAGE",
  ],
};

export function hasNotificationPermission(
  roleCode: string | null | undefined,
  permission: NotificationPermission
): boolean {
  if (!roleCode) return false;
  const permissions = NOTIFICATION_ROLE_PERMISSIONS[roleCode] || [];
  return permissions.includes(permission);
}
