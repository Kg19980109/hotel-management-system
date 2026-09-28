"use server";

// ============================================================
// STAYHUB NOTIFICATION SERVER ACTIONS (Phase 21)
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { hasNotificationPermission } from "./permissions";
import { getDefaultPreferences } from "./preferences";
import type {
  NotificationItem,
  NotificationCategory,
  NotificationPreference,
} from "./types";

interface AuthCheckResult {
  userId: string;
  roleCode: string;
}

async function checkNotificationAuth(propertyId: string): Promise<{ error?: string; user?: AuthCheckResult }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required." };
    }

    const { data: membership } = await supabase
      .from("property_memberships")
      .select("role:roles(code), status")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    let roleCode = "GENERAL_MANAGER";
    if (membership?.role) {
      roleCode = (membership.role as unknown as { code: string })?.code || "GENERAL_MANAGER";
    }

    if (!hasNotificationPermission(roleCode, "NOTIFICATIONS_VIEW")) {
      return { error: `Access denied. Role ${roleCode} cannot view notifications.` };
    }

    return { user: { userId: user.id, roleCode } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify notification session.";
    return { error: message };
  }
}

export interface LiveNotificationItem {
  id: string;
  category: "booking" | "housekeeping" | "maintenance" | "billing" | "service" | "restaurant" | "system";
  title: string;
  description: string;
  timestamp: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  link: string;
  statusBadge?: string;
  read: boolean;
}

/**
 * Fetch unified real-time operational notifications for the active property
 */
export async function fetchLiveNotificationsAction(
  propertyId: string
): Promise<{ error: string | null; notifications: LiveNotificationItem[] }> {
  const auth = await checkNotificationAuth(propertyId);
  if (auth.error) {
    return { error: auth.error, notifications: [] };
  }

  try {
    const supabase = await createClient();

    const [resList, reqList, ordList, maintList, hkList, payList, notifList] = await Promise.all([
      supabase
        .from("reservations")
        .select(`
          id, confirmation_number, total_amount, created_at, status, check_in_date, check_out_date,
          primary_guest:guests(first_name, last_name),
          rooms:reservation_rooms(room:rooms(room_number), room_type:room_types(name))
        `)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(10),

      supabase
        .from("guest_service_requests")
        .select(`
          id, title, description, category, status, priority, created_at,
          room:rooms(room_number),
          guest:guests(first_name, last_name)
        `)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(10),

      supabase
        .from("restaurant_orders")
        .select(`
          id, order_number, total_amount, status, order_type, created_at,
          restaurant:restaurants(name)
        `)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(10),

      supabase
        .from("maintenance_work_orders")
        .select(`
          id, title, description, priority, status, created_at,
          room:rooms(room_number)
        `)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(6),

      supabase
        .from("housekeeping_tasks")
        .select(`
          id, task_type, status, created_at,
          room:rooms(room_number)
        `)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(6),

      supabase
        .from("folio_payments")
        .select(`
          id, amount, payment_method, created_at,
          folio:guest_folios!inner(folio_number, property_id, reservation:reservations(confirmation_number, primary_guest:guests(first_name, last_name)))
        `)
        .eq("folio.property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(8),

      supabase
        .from("notifications")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const items: LiveNotificationItem[] = [];

    // 1. Direct Notifications
    (notifList.data || []).forEach((n) => {
      items.push({
        id: `notif-${n.id}`,
        category: (String(n.category || "system").toLowerCase()) as LiveNotificationItem["category"],
        title: n.title || "Notification",
        description: n.message || "",
        timestamp: n.created_at || new Date().toISOString(),
        read: Boolean(n.read),
        priority: n.priority as LiveNotificationItem["priority"],
        link: (n.data as Record<string, unknown>)?.link as string || "/dashboard",
      });
    });

    // 2. Reservations
    (resList.data || []).forEach((r) => {
      const g = r.primary_guest as unknown as { first_name?: string; last_name?: string } | null;
      const name = g ? `${g.first_name || ""} ${g.last_name || ""}`.trim() : "Guest";
      const roomObj = (r.rooms as unknown as Array<{ room?: { room_number?: string }; room_type?: { name?: string } }>)?.[0];
      const roomStr = roomObj?.room?.room_number
        ? `Room ${roomObj.room.room_number}`
        : roomObj?.room_type?.name || "Room";

      items.push({
        id: `res-${r.id}`,
        category: "booking",
        title: "New Booking Received",
        description: `${name} booked ${roomStr} (#${r.confirmation_number} • ₹${r.total_amount || 0})`,
        timestamp: r.created_at,
        link: `/bookings/${r.id}`,
        statusBadge: r.status,
        read: false,
      });
    });

    // 3. Guest Service Requests & Room Service
    (reqList.data || []).forEach((req) => {
      const rm = (req.room as unknown as { room_number?: string })?.room_number ? `Room ${(req.room as unknown as { room_number?: string }).room_number}` : "Guest Service";
      const g = req.guest as unknown as { first_name?: string; last_name?: string } | null;
      const name = g ? `${g.first_name || ""} ${g.last_name || ""}`.trim() : "";
      const isFood = req.category === "ROOM_SERVICE" || req.title?.toLowerCase().includes("food");

      items.push({
        id: `req-${req.id}`,
        category: isFood
          ? "restaurant"
          : req.category === "MAINTENANCE"
          ? "maintenance"
          : req.category === "HOUSEKEEPING"
          ? "housekeeping"
          : "service",
        title: req.title || "Guest Service Request",
        description: `${rm}${name ? " (" + name + ")" : ""}: ${req.description?.split("\n")[0] || req.title}`,
        timestamp: req.created_at,
        link: "/guest-requests",
        statusBadge: req.status,
        priority: req.priority as LiveNotificationItem["priority"],
        read: false,
      });
    });

    // 4. Restaurant Orders
    (ordList.data || []).forEach((o) => {
      const restName = (o.restaurant as unknown as { name?: string })?.name || "Restaurant";
      items.push({
        id: `ord-${o.id}`,
        category: "restaurant",
        title: `Order #${o.order_number}`,
        description: `${restName} • ₹${o.total_amount} [${o.status}]`,
        timestamp: o.created_at,
        link: "/restaurant/orders",
        statusBadge: o.status,
        read: false,
      });
    });

    // 5. Folio Payments
    (payList.data || []).forEach((p) => {
      const f = p.folio as unknown as {
        folio_number?: string;
        reservation?: { primary_guest?: { first_name?: string; last_name?: string } };
      } | null;
      const g = f?.reservation?.primary_guest;
      const name = g ? `${g.first_name || ""} ${g.last_name || ""}`.trim() : "";

      items.push({
        id: `pay-${p.id}`,
        category: "billing",
        title: "Payment Processed",
        description: `₹${p.amount} received via ${p.payment_method} for ${f?.folio_number || "Folio"}${name ? " • " + name : ""}`,
        timestamp: p.created_at,
        link: "/billing/payments",
        statusBadge: p.payment_method,
        read: false,
      });
    });

    // 6. Maintenance Work Orders
    (maintList.data || []).forEach((m) => {
      const rm = (m.room as unknown as { room_number?: string })?.room_number ? `Room ${(m.room as unknown as { room_number?: string }).room_number}` : "Hotel Facility";
      items.push({
        id: `maint-${m.id}`,
        category: "maintenance",
        title: `Maintenance: ${m.title}`,
        description: `${rm} • ${m.priority} priority (${m.status})`,
        timestamp: m.created_at,
        link: "/maintenance",
        statusBadge: m.status,
        priority: m.priority as LiveNotificationItem["priority"],
        read: false,
      });
    });

    // 7. Housekeeping Tasks
    (hkList.data || []).forEach((h) => {
      const rm = (h.room as unknown as { room_number?: string })?.room_number ? `Room ${(h.room as unknown as { room_number?: string }).room_number}` : "Room";
      items.push({
        id: `hk-${h.id}`,
        category: "housekeeping",
        title: `Housekeeping: ${h.task_type}`,
        description: `${rm} • Status: ${h.status}`,
        timestamp: h.created_at,
        link: "/housekeeping",
        statusBadge: h.status,
        read: false,
      });
    });

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { error: null, notifications: items.slice(0, 30) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load live notifications.";
    return { error: message, notifications: [] };
  }
}

/**
 * Fetch paginated in-app notifications for the current property
 */
export async function fetchNotificationsAction(
  propertyId: string,
  options: {
    category?: NotificationCategory;
    limit?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<{ error: string | null; notifications: NotificationItem[]; unreadCount: number }> {
  const auth = await checkNotificationAuth(propertyId);
  if (auth.error) {
    return { error: auth.error, notifications: [], unreadCount: 0 };
  }

  const limit = Math.min(options.limit || 30, 100);

  try {
    const supabase = await createClient();
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options.category) {
      query = query.eq("category", options.category);
    }
    if (options.unreadOnly) {
      query = query.eq("read", false);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message, notifications: [], unreadCount: 0 };
    }

    const items: NotificationItem[] = (data || []).map((row: Record<string, unknown>) => ({
      id: String(row.id || ""),
      propertyId: String(row.property_id || ""),
      organizationId: String(row.organization_id || ""),
      userId: row.user_id ? String(row.user_id) : undefined,
      recipientEmail: row.recipient_email ? String(row.recipient_email) : undefined,
      recipientPhone: row.recipient_phone ? String(row.recipient_phone) : undefined,
      category: (row.category || "SYSTEM") as NotificationItem["category"],
      eventType: String(row.event_type || ""),
      title: String(row.title || ""),
      message: String(row.message || ""),
      data: row.data as Record<string, unknown> | undefined,
      priority: (row.priority || "NORMAL") as NotificationItem["priority"],
      status: (row.status || "SENT") as NotificationItem["status"],
      channels: (row.channels || ["IN_APP"]) as NotificationItem["channels"],
      read: Boolean(row.read || false),
      readAt: row.read_at ? String(row.read_at) : undefined,
      createdAt: String(row.created_at || ""),
      sentAt: row.sent_at ? String(row.sent_at) : undefined,
      idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : undefined,
    }));

    const unreadCount = items.filter((n) => !n.read).length;

    return { error: null, notifications: items, unreadCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load notifications.";
    return { error: message, notifications: [], unreadCount: 0 };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationReadAction(
  notificationId: string,
  propertyId: string
): Promise<{ error: string | null; success: boolean }> {
  const auth = await checkNotificationAuth(propertyId);
  if (auth.error) return { error: auth.error, success: false };

  try {
    const supabase = await createClient();
    await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("property_id", propertyId);

    return { error: null, success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update notification status.";
    return { error: message, success: false };
  }
}

/**
 * Mark all notifications for the property as read
 */
export async function markAllNotificationsReadAction(
  propertyId: string
): Promise<{ error: string | null; success: boolean }> {
  const auth = await checkNotificationAuth(propertyId);
  if (auth.error) return { error: auth.error, success: false };

  try {
    const supabase = await createClient();
    await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("property_id", propertyId)
      .eq("read", false);

    return { error: null, success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to mark all as read.";
    return { error: message, success: false };
  }
}

/**
 * Fetch notification preferences for current user
 */
export async function fetchNotificationPreferencesAction(
  propertyId: string
): Promise<{ error: string | null; preferences: NotificationPreference[] }> {
  const auth = await checkNotificationAuth(propertyId);
  if (auth.error || !auth.user) {
    return { error: auth.error || "Authentication required", preferences: [] };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("property_id", propertyId)
      .eq("user_id", auth.user.userId);

    if (error || !data || data.length === 0) {
      return { error: null, preferences: getDefaultPreferences(auth.user.userId, propertyId) };
    }

    const prefs: NotificationPreference[] = data.map((row: Record<string, unknown>) => ({
      id: String(row.id || ""),
      userId: String(row.user_id || ""),
      propertyId: String(row.property_id || ""),
      category: row.category as NotificationPreference["category"],
      emailEnabled: Boolean(row.email_enabled ?? true),
      smsEnabled: Boolean(row.sms_enabled ?? false),
      whatsappEnabled: Boolean(row.whatsapp_enabled ?? false),
      inAppEnabled: Boolean(row.in_app_enabled ?? true),
      createdAt: String(row.created_at || ""),
      updatedAt: String(row.updated_at || ""),
    }));

    return { error: null, preferences: prefs };
  } catch {
    return { error: null, preferences: getDefaultPreferences(auth.user.userId, propertyId) };
  }
}
