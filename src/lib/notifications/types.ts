// ============================================================
// STAYHUB NOTIFICATIONS TYPES (Phase 21)
// ============================================================

export type NotificationCategory =
  | "BOOKING"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "PAYMENT"
  | "INVOICE"
  | "FOLIO"
  | "HOUSEKEEPING"
  | "MAINTENANCE"
  | "RESTAURANT"
  | "KITCHEN"
  | "GUEST_SERVICE"
  | "INVENTORY"
  | "STAFF"
  | "SYSTEM";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";

export type NotificationStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface NotificationItem {
  id: string;
  propertyId: string;
  organizationId?: string;
  userId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  category: NotificationCategory;
  eventType: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  status: NotificationStatus;
  channels: NotificationChannel[];
  read: boolean;
  readAt?: string;
  createdAt: string;
  sentAt?: string;
  failureReason?: string;
  idempotencyKey?: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  propertyId: string;
  category: NotificationCategory;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  inAppEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTemplate {
  id: string;
  propertyId?: string; // Nullable for system-wide defaults
  eventType: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  titleTemplate: string;
  bodyTemplate: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  provider: string;
  providerMessageId?: string;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  createdAt: string;
}

export interface NotificationEventPayload {
  propertyId: string;
  organizationId?: string;
  eventType: string;
  category: NotificationCategory;
  userId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  data: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  idempotencyKey?: string;
}

export type NotificationPermission =
  | "NOTIFICATIONS_VIEW"
  | "NOTIFICATIONS_MANAGE"
  | "NOTIFICATION_TEMPLATES_MANAGE"
  | "NOTIFICATION_PREFERENCES_MANAGE";
