// ============================================================
// STAYHUB NOTIFICATION PREFERENCES (Phase 21)
// Category and channel notification preference resolution
// ============================================================

import type { NotificationCategory, NotificationChannel, NotificationPreference } from "./types";

export const ALL_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "BOOKING",
  "CHECK_IN",
  "CHECK_OUT",
  "PAYMENT",
  "INVOICE",
  "FOLIO",
  "HOUSEKEEPING",
  "MAINTENANCE",
  "RESTAURANT",
  "KITCHEN",
  "GUEST_SERVICE",
  "INVENTORY",
  "STAFF",
  "SYSTEM",
];

export function getDefaultPreferences(userId: string, propertyId: string): NotificationPreference[] {
  const timestamp = new Date().toISOString();
  return ALL_NOTIFICATION_CATEGORIES.map((category) => ({
    id: `pref_${userId}_${category}`,
    userId,
    propertyId,
    category,
    emailEnabled: true,
    smsEnabled: ["BOOKING", "CHECK_IN", "PAYMENT"].includes(category),
    whatsappEnabled: ["BOOKING", "CHECK_IN", "GUEST_SERVICE"].includes(category),
    inAppEnabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

/**
 * Validates whether a specific channel is enabled according to user preference
 */
export function isChannelAllowedByUser(
  userPreferences: NotificationPreference[] | null | undefined,
  category: NotificationCategory,
  channel: NotificationChannel
): boolean {
  if (!userPreferences || userPreferences.length === 0) {
    // Default fallback allow
    if (channel === "IN_APP" || channel === "EMAIL") return true;
    if (channel === "SMS" || channel === "WHATSAPP") {
      return ["BOOKING", "CHECK_IN", "PAYMENT"].includes(category);
    }
    return true;
  }

  const pref = userPreferences.find((p) => p.category === category);
  if (!pref) return true;

  switch (channel) {
    case "IN_APP":
      return pref.inAppEnabled;
    case "EMAIL":
      return pref.emailEnabled;
    case "SMS":
      return pref.smsEnabled;
    case "WHATSAPP":
      return pref.whatsappEnabled;
    default:
      return true;
  }
}
