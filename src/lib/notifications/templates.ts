// ============================================================
// STAYHUB NOTIFICATION TEMPLATES (Phase 21)
// Reusable, secure template rendering engine with variable interpolation
// ============================================================

import type { NotificationCategory, NotificationChannel, NotificationTemplate } from "./types";

export const DEFAULT_NOTIFICATION_TEMPLATES: Array<Omit<NotificationTemplate, "id" | "createdAt" | "updatedAt">> = [
  {
    eventType: "BOOKING_CONFIRMATION",
    category: "BOOKING",
    channel: "EMAIL",
    titleTemplate: "Booking Confirmed: {{confirmation_number}} - {{hotel_name}}",
    bodyTemplate: "Dear {{guest_name}},\n\nThank you for choosing {{hotel_name}}. Your reservation (Confirmation #{{confirmation_number}}) is confirmed.\n\nCheck-in: {{check_in_date}}\nCheck-out: {{check_out_date}}\nRoom Type: {{room_type}}\nTotal: {{amount}}\n\nWe look forward to welcoming you!",
    variables: ["guest_name", "hotel_name", "confirmation_number", "check_in_date", "check_out_date", "room_type", "amount"],
    isActive: true,
  },
  {
    eventType: "BOOKING_CONFIRMATION",
    category: "BOOKING",
    channel: "SMS",
    titleTemplate: "Booking Confirmed",
    bodyTemplate: "{{hotel_name}}: Your booking {{confirmation_number}} is confirmed for {{check_in_date}}. Total: {{amount}}. See you soon!",
    variables: ["hotel_name", "confirmation_number", "check_in_date", "amount"],
    isActive: true,
  },
  {
    eventType: "BOOKING_CANCELLED",
    category: "BOOKING",
    channel: "EMAIL",
    titleTemplate: "Booking Cancelled: {{confirmation_number}} - {{hotel_name}}",
    bodyTemplate: "Dear {{guest_name}},\n\nYour reservation {{confirmation_number}} at {{hotel_name}} has been cancelled.\n\nIf you have any questions, please contact our front desk.",
    variables: ["guest_name", "hotel_name", "confirmation_number"],
    isActive: true,
  },
  {
    eventType: "CHECK_IN_REMINDER",
    category: "CHECK_IN",
    channel: "EMAIL",
    titleTemplate: "Upcoming Stay at {{hotel_name}} on {{check_in_date}}",
    bodyTemplate: "Dear {{guest_name}},\n\nWe are getting ready for your arrival on {{check_in_date}} at {{hotel_name}}. Check-in starts at {{check_in_time}}.\n\nConfirmation #{{confirmation_number}}.",
    variables: ["guest_name", "hotel_name", "check_in_date", "check_in_time", "confirmation_number"],
    isActive: true,
  },
  {
    eventType: "CHECK_IN_WELCOME",
    category: "CHECK_IN",
    channel: "WHATSAPP",
    titleTemplate: "Welcome to {{hotel_name}}",
    bodyTemplate: "Welcome to {{hotel_name}}, {{guest_name}}! Your room is {{room_number}}. Scan your in-room QR code to order dining or request guest services at any time.",
    variables: ["guest_name", "hotel_name", "room_number"],
    isActive: true,
  },
  {
    eventType: "CHECK_OUT_THANKS",
    category: "CHECK_OUT",
    channel: "EMAIL",
    titleTemplate: "Thank you for staying at {{hotel_name}}",
    bodyTemplate: "Dear {{guest_name}},\n\nThank you for staying with us at {{hotel_name}}. We hope you had a pleasant stay and look forward to welcoming you again soon.",
    variables: ["guest_name", "hotel_name"],
    isActive: true,
  },
  {
    eventType: "PAYMENT_RECEIVED",
    category: "PAYMENT",
    channel: "EMAIL",
    titleTemplate: "Payment Receipt: {{amount}} for Folio #{{folio_number}}",
    bodyTemplate: "Dear {{guest_name}},\n\nWe have received your payment of {{amount}} for {{hotel_name}} (Invoice #{{invoice_number}}). Thank you!",
    variables: ["guest_name", "amount", "folio_number", "hotel_name", "invoice_number"],
    isActive: true,
  },
  {
    eventType: "HOUSEKEEPING_TASK_ASSIGNED",
    category: "HOUSEKEEPING",
    channel: "IN_APP",
    titleTemplate: "Cleaning Task: Room {{room_number}}",
    bodyTemplate: "Room {{room_number}} has been marked {{room_status}} and assigned to you for cleaning. Priority: {{priority}}.",
    variables: ["room_number", "room_status", "priority"],
    isActive: true,
  },
  {
    eventType: "MAINTENANCE_WORK_ORDER_ASSIGNED",
    category: "MAINTENANCE",
    channel: "IN_APP",
    titleTemplate: "Work Order: Room {{room_number}} - {{issue_type}}",
    bodyTemplate: "New maintenance ticket: {{issue_description}} in Room {{room_number}}. Priority: {{priority}}.",
    variables: ["room_number", "issue_type", "issue_description", "priority"],
    isActive: true,
  },
  {
    eventType: "GUEST_SERVICE_REQUEST_CREATED",
    category: "GUEST_SERVICE",
    channel: "IN_APP",
    titleTemplate: "Guest Request: Room {{room_number}} - {{service_type}}",
    bodyTemplate: "Guest in Room {{room_number}} requested: {{service_details}}.",
    variables: ["room_number", "service_type", "service_details"],
    isActive: true,
  },
  {
    eventType: "LOW_INVENTORY_ALERT",
    category: "INVENTORY",
    channel: "IN_APP",
    titleTemplate: "Low Stock Alert: {{item_name}}",
    bodyTemplate: "Item '{{item_name}}' is below its reorder point (Current: {{current_stock}} {{uom}}, Reorder Level: {{reorder_level}} {{uom}}).",
    variables: ["item_name", "current_stock", "reorder_level", "uom"],
    isActive: true,
  },
];

/**
 * Escapes unsafe HTML characters to prevent XSS in rendered notifications
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Render a template string with variable substitution
 */
export function renderTemplate(
  templateString: string,
  variables: Record<string, unknown>,
  shouldEscapeHtml = false
): string {
  if (!templateString) return "";
  
  return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, varName) => {
    const val = variables[varName];
    if (val === undefined || val === null) {
      return "";
    }
    const strVal = String(val);
    return shouldEscapeHtml ? escapeHtml(strVal) : strVal;
  });
}

/**
 * Resolves a template by eventType and channel
 */
export function getNotificationTemplate(
  eventType: string,
  channel: NotificationChannel
): { titleTemplate: string; bodyTemplate: string; category: NotificationCategory } {
  const matched = DEFAULT_NOTIFICATION_TEMPLATES.find(
    (t) => t.eventType === eventType && t.channel === channel
  );

  if (matched) {
    return {
      titleTemplate: matched.titleTemplate,
      bodyTemplate: matched.bodyTemplate,
      category: matched.category,
    };
  }

  // Generic fallback template
  return {
    titleTemplate: `Notification: ${eventType.replace(/_/g, " ")}`,
    bodyTemplate: "{{message}}",
    category: "SYSTEM",
  };
}
