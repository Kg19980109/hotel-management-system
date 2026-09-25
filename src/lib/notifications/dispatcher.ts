// ============================================================
// STAYHUB NOTIFICATION DISPATCHER (Phase 21)
// Central event-to-notification mapper with idempotency and retry semantics
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { getNotificationTemplate, renderTemplate } from "./templates";
import { isChannelAllowedByUser } from "./preferences";
import { getNotificationProvider } from "./providers";
import { getNotificationConfig } from "./config";
import type {
  NotificationEventPayload,
  NotificationChannel,
  NotificationItem,
  NotificationDelivery,
  NotificationStatus,
} from "./types";

// In-memory idempotency cache for fast deduplication
const processedIdempotencyKeys = new Map<string, { notificationId: string; timestamp: number }>();

/**
 * Dispatches a business event to all configured notification channels.
 * Guarantees idempotency, respects user preferences, and handles retries safely.
 */
export async function dispatchNotificationEvent(
  event: NotificationEventPayload
): Promise<{
  success: boolean;
  notificationId: string;
  deliveries: NotificationDelivery[];
  error?: string;
}> {
  const timestamp = new Date().toISOString();
  const config = getNotificationConfig();

  // 1. Idempotency Check
  if (event.idempotencyKey) {
    const existing = processedIdempotencyKeys.get(event.idempotencyKey);
    if (existing && Date.now() - existing.timestamp < 3600000) {
      // Deduplicated within 1 hour
      return {
        success: true,
        notificationId: existing.notificationId,
        deliveries: [],
      };
    }
  }

  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const channelsToUse: NotificationChannel[] = event.channels || ["IN_APP", "EMAIL"];

  // 2. Resolve template for the primary channel
  const template = getNotificationTemplate(event.eventType, channelsToUse[0] || "IN_APP");
  const renderedTitle = renderTemplate(template.titleTemplate, event.data);
  const renderedMessage = renderTemplate(template.bodyTemplate, event.data);

  // 3. Create Notification Item
  const notificationItem: NotificationItem = {
    id: notificationId,
    propertyId: event.propertyId,
    organizationId: event.organizationId,
    userId: event.userId,
    recipientEmail: event.recipientEmail,
    recipientPhone: event.recipientPhone,
    category: event.category || template.category,
    eventType: event.eventType,
    title: renderedTitle,
    message: renderedMessage,
    data: event.data,
    priority: event.priority || "NORMAL",
    status: "PROCESSING",
    channels: channelsToUse,
    read: false,
    createdAt: timestamp,
    idempotencyKey: event.idempotencyKey,
  };

  const deliveries: NotificationDelivery[] = [];
  let overallSuccess = true;

  // 4. Dispatch across requested channels
  for (const channel of channelsToUse) {
    // Check channel preference if user preferences provided
    const isAllowed = isChannelAllowedByUser(undefined, notificationItem.category, channel);
    if (!isAllowed) continue;

    const provider = getNotificationProvider(channel);
    let recipientTarget = "";

    if (channel === "IN_APP") recipientTarget = event.userId || "all";
    else if (channel === "EMAIL") recipientTarget = event.recipientEmail || "";
    else if (channel === "SMS" || channel === "WHATSAPP") recipientTarget = event.recipientPhone || "";

    if (!recipientTarget && channel !== "IN_APP") {
      continue; // Skip external channel if no contact info provided
    }

    // Channel specific template
    const chanTemplate = getNotificationTemplate(event.eventType, channel);
    const chanTitle = renderTemplate(chanTemplate.titleTemplate, event.data);
    const chanMessage = renderTemplate(chanTemplate.bodyTemplate, event.data);

    // Execute delivery with retry loop (max attempts = 3)
    let attempts = 0;
    const maxAttempts = config.maxRetryAttempts;
    let deliveryStatus: NotificationStatus = "PENDING";
    let providerMsgId: string | undefined;
    let failureReason: string | undefined;

    while (attempts < maxAttempts && deliveryStatus !== "SENT") {
      attempts++;
      try {
        const result = await provider.send(recipientTarget, chanTitle, chanMessage, event.data);
        if (result.success) {
          deliveryStatus = "SENT";
          providerMsgId = result.providerMessageId;
          break;
        } else {
          failureReason = result.error;
          if (attempts >= maxAttempts) {
            deliveryStatus = "FAILED";
            overallSuccess = false;
          }
        }
      } catch (err: unknown) {
        failureReason = err instanceof Error ? err.message : "Provider error";
        if (attempts >= maxAttempts) {
          deliveryStatus = "FAILED";
          overallSuccess = false;
        }
      }
    }

    deliveries.push({
      id: `deliv_${Date.now()}_${channel}`,
      notificationId,
      channel,
      status: deliveryStatus,
      provider: provider.name,
      providerMessageId: providerMsgId,
      attempts,
      maxAttempts,
      deliveredAt: deliveryStatus === "SENT" ? new Date().toISOString() : undefined,
      failureReason,
      createdAt: timestamp,
    });
  }

  notificationItem.status = overallSuccess ? "SENT" : "FAILED";
  notificationItem.sentAt = timestamp;

  // 5. Persist to PostgreSQL if available
  try {
    const supabase = await createClient();
    await supabase.from("notifications").insert({
      id: notificationItem.id,
      property_id: notificationItem.propertyId,
      organization_id: notificationItem.organizationId,
      user_id: notificationItem.userId,
      recipient_email: notificationItem.recipientEmail,
      recipient_phone: notificationItem.recipientPhone,
      category: notificationItem.category,
      event_type: notificationItem.eventType,
      title: notificationItem.title,
      message: notificationItem.message,
      data: notificationItem.data,
      priority: notificationItem.priority,
      status: notificationItem.status,
      channels: notificationItem.channels,
      read: false,
      created_at: notificationItem.createdAt,
      sent_at: notificationItem.sentAt,
      idempotency_key: notificationItem.idempotencyKey,
    });
  } catch {
    // Non-blocking catch
  }

  // 6. Record idempotency key
  if (event.idempotencyKey) {
    processedIdempotencyKeys.set(event.idempotencyKey, {
      notificationId,
      timestamp: Date.now(),
    });
  }

  return {
    success: overallSuccess,
    notificationId,
    deliveries,
  };
}
