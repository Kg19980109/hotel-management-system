"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { hashToken } from "@/lib/guest-portal/types";
import {
  ServiceRequestCategory,
  ServiceRequestPriority,
} from "./types";
import {
  hasGuestRequestPermission,
  GuestRequestPermission,
} from "./permissions";

const GUEST_SESSION_COOKIE_NAME = "stayhub_guest_session";

/**
 * Server-side authorization check for staff operations on guest service requests
 */
async function checkStaffAuth(
  propertyId: string,
  requiredPermission?: GuestRequestPermission
): Promise<{ error?: string; userId?: string; roleCode?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required. Please sign in." };
  }

  const { data: membership } = await supabase
    .from("property_memberships")
    .select("role:roles(code), status")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership || !membership.role) {
    return { error: "Access denied: No active membership for this property." };
  }

  const roleCode = (membership.role as unknown as { code: string })?.code;

  if (requiredPermission && !hasGuestRequestPermission(roleCode, requiredPermission)) {
    return {
      error: `Access denied. Your role (${roleCode}) lacks '${requiredPermission}' permission.`,
    };
  }

  return { userId: user.id, roleCode };
}

// ------------------------------------------------------------
// GUEST ACTIONS
// ------------------------------------------------------------

export interface CreateGuestServiceRequestInput {
  category: ServiceRequestCategory;
  requestType: string;
  title: string;
  description?: string;
  priority?: ServiceRequestPriority;
}

/**
 * Submit service request from verified guest portal session
 */
export async function createGuestServiceRequestAction(
  input: CreateGuestServiceRequestInput
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(GUEST_SESSION_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return {
      success: false,
      error: "No active guest session found. Please scan your room QR code.",
    };
  }

  const supabase = await createClient();
  const sessionTokenHash = hashToken(sessionCookie.value);

  const { data, error } = await supabase.rpc("create_guest_service_request", {
    p_session_token_hash: sessionTokenHash,
    p_category: input.category,
    p_request_type: input.requestType,
    p_title: input.title,
    p_description: input.description || null,
    p_priority: input.priority || "MEDIUM",
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to submit request.",
    };
  }

  revalidatePath("/guest/requests");
  revalidatePath("/guest/services");
  revalidatePath("/guest-requests");

  return {
    success: true,
    requestId: data.request_id,
    propertyId: data.property_id,
    roomNumber: data.room_number,
    guestName: data.guest_name,
    title: data.title,
    status: data.status,
    category: data.category,
    description: data.description,
    priority: data.priority,
  };
}

/**
 * Cancel own service request from guest portal
 */
export async function cancelGuestServiceRequestAction(
  requestId: string,
  reason?: string
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(GUEST_SESSION_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return {
      success: false,
      error: "No active guest session found.",
    };
  }

  const supabase = await createClient();
  const sessionTokenHash = hashToken(sessionCookie.value);

  const { data, error } = await supabase.rpc("cancel_guest_service_request", {
    p_session_token_hash: sessionTokenHash,
    p_request_id: requestId,
    p_reason: reason || null,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to cancel request.",
    };
  }

  revalidatePath("/guest/requests");
  revalidatePath(`/guest/requests/${requestId}`);
  revalidatePath("/guest-requests");
  revalidatePath(`/guest-requests/${requestId}`);
  return { success: true };
}

// ------------------------------------------------------------
// GUEST LIVE POLLING (secure — reads httpOnly session cookie server-side)
// Direct realtime on guest_service_requests is RLS-blocked for anon guests,
// so the guest UI polls this action. Returns only guest-safe fields.
// ------------------------------------------------------------
export async function getGuestRequestLiveStatusAction(requestId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(GUEST_SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return { success: false as const, error: "No guest session." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_guest_service_request_detail", {
    p_session_token_hash: hashToken(sessionCookie.value),
    p_request_id: requestId,
  });

  if (error || !data?.success || !data.request) {
    return { success: false as const, error: error?.message || data?.error || "Not found." };
  }

  const r = data.request as {
    status: string;
    guest_visible_notes?: string | null;
    events?: { id?: string; to_status?: string; created_at?: string }[];
  };
  return {
    success: true as const,
    status: r.status,
    guest_visible_notes: r.guest_visible_notes ?? null,
    eventCount: r.events?.length ?? 0,
    lastEvent: r.events?.[r.events.length - 1]?.to_status ?? null,
  };
}

// ------------------------------------------------------------
// STAFF ACTIONS
// ------------------------------------------------------------

export async function staffAcknowledgeGuestRequestAction(
  propertyId: string,
  requestId: string,
  notes?: string
) {
  const auth = await checkStaffAuth(propertyId, "GUEST_REQUEST_UPDATE");
  if (auth.error) return { success: false, error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "staff_acknowledge_guest_request",
    {
      p_property_id: propertyId,
      p_request_id: requestId,
      p_notes: notes || null,
    }
  );

  if (error || !data?.success) {
    // Direct database update fallback
    const { error: updateError } = await supabase
      .from("guest_service_requests")
      .update({
        status: "ACKNOWLEDGED",
        acknowledged_at: new Date().toISOString(),
        staff_notes: notes || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("property_id", propertyId);

    if (updateError) {
      return {
        success: false,
        error: error?.message || data?.error || updateError.message || "Failed to accept request.",
      };
    }
  }

  revalidatePath("/guest-requests");
  revalidatePath(`/guest-requests/${requestId}`);
  revalidatePath("/housekeeping");
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  return { success: true };
}

export const staffAcceptGuestRequestAction = staffAcknowledgeGuestRequestAction;

/**
 * Universal Accept action for both Food Orders and Service Requests
 */
export async function staffAcceptOperationalAlertAction(
  propertyId: string,
  alertId: string,
  alertType?: "SERVICE_REQUEST" | "FOOD_ORDER"
) {
  const supabase = await createClient();

  // If it's a food order or if alertType is FOOD_ORDER, fire KDS ticket & confirm order
  if (alertType === "FOOD_ORDER") {
    try {
      const { data, error } = await supabase.rpc("create_or_fire_kitchen_ticket", {
        p_order_id: alertId,
        p_property_id: propertyId,
        p_priority: "NORMAL",
      });

      if (error) {
        console.error("KDS firing error on accept:", error);
      }

      // Update order status to PREPARING
      await supabase
        .from("restaurant_orders")
        .update({ status: "PREPARING" })
        .eq("id", alertId)
        .eq("property_id", propertyId);

      revalidatePath("/kitchen");
      revalidatePath("/restaurant/kds");
      revalidatePath("/restaurant/orders");
      revalidatePath(`/restaurant/orders/${alertId}`);
      revalidatePath("/guest/orders");
      revalidatePath("/pos");
      return { success: true, data };
    } catch (err) {
      console.error("Failed to accept food order:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to accept food order." };
    }
  }

  // Check if this ID belongs to a restaurant order or a service request
  const { data: maybeOrder } = await supabase
    .from("restaurant_orders")
    .select("id")
    .eq("id", alertId)
    .maybeSingle();

  if (maybeOrder) {
    try {
      await supabase.rpc("create_or_fire_kitchen_ticket", {
        p_order_id: alertId,
        p_property_id: propertyId,
        p_priority: "NORMAL",
      });
      revalidatePath("/kitchen");
      revalidatePath("/restaurant/kds");
      revalidatePath("/restaurant/orders");
      revalidatePath("/guest/orders");
      return { success: true };
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback to service request acknowledge
  return await staffAcknowledgeGuestRequestAction(propertyId, alertId);
}

export async function staffAssignGuestRequestAction(
  propertyId: string,
  requestId: string,
  assignedTo?: string,
  assignedDepartment?: string,
  notes?: string
) {
  const auth = await checkStaffAuth(propertyId, "GUEST_REQUEST_ASSIGN");
  if (auth.error) return { success: false, error: auth.error };

  const supabase = await createClient();

  if (assignedTo) {
    const { data: targetMem } = await supabase
      .from("property_memberships")
      .select("id")
      .eq("property_id", propertyId)
      .eq("user_id", assignedTo)
      .eq("status", "active")
      .maybeSingle();

    if (!targetMem) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("auth_user_id")
        .eq("id", assignedTo)
        .maybeSingle();

      if (profile) {
        const { data: mem } = await supabase
          .from("property_memberships")
          .select("id")
          .eq("property_id", propertyId)
          .eq("user_id", profile.auth_user_id)
          .eq("status", "active")
          .maybeSingle();

        if (!mem) {
          return {
            success: false,
            error: "Cannot assign request: Target staff member does not have active membership for this property.",
          };
        }
      }
    }
  }

  const { data, error } = await supabase.rpc("staff_assign_guest_request", {
    p_property_id: propertyId,
    p_request_id: requestId,
    p_assigned_to: assignedTo || null,
    p_assigned_department: assignedDepartment || null,
    p_notes: notes || null,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to assign request.",
    };
  }

  revalidatePath("/guest-requests");
  revalidatePath(`/guest-requests/${requestId}`);
  return { success: true };
}

export async function staffStartGuestRequestAction(
  propertyId: string,
  requestId: string,
  notes?: string
) {
  const auth = await checkStaffAuth(propertyId, "GUEST_REQUEST_UPDATE");
  if (auth.error) return { success: false, error: auth.error };

  const supabase = await createClient();

  const { data: req, error: reqErr } = await supabase
    .from("guest_service_requests")
    .select("id, property_id, assigned_to, status")
    .eq("id", requestId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (reqErr || !req) {
    return { success: false, error: "Guest service request not found for this property." };
  }

  const isManager = ["SUPER_ADMIN", "HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "RECEPTIONIST"].includes(
    auth.roleCode || ""
  );
  if (!isManager && req.assigned_to && req.assigned_to !== auth.userId) {
    return { success: false, error: "Access denied: This request is assigned to another staff member." };
  }

  const { data, error } = await supabase.rpc("staff_start_guest_request", {
    p_property_id: propertyId,
    p_request_id: requestId,
    p_notes: notes || null,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to start request.",
    };
  }

  revalidatePath("/guest-requests");
  revalidatePath(`/guest-requests/${requestId}`);
  return { success: true };
}

export async function staffCompleteGuestRequestAction(
  propertyId: string,
  requestId: string,
  guestNotes?: string,
  staffNotes?: string
) {
  const auth = await checkStaffAuth(propertyId, "GUEST_REQUEST_COMPLETE");
  if (auth.error) return { success: false, error: auth.error };

  const supabase = await createClient();

  const { data: req, error: reqErr } = await supabase
    .from("guest_service_requests")
    .select("id, property_id, assigned_to, status")
    .eq("id", requestId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (reqErr || !req) {
    return { success: false, error: "Guest service request not found for this property." };
  }

  const isManager = ["SUPER_ADMIN", "HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "RECEPTIONIST"].includes(
    auth.roleCode || ""
  );
  if (!isManager && req.assigned_to && req.assigned_to !== auth.userId) {
    return { success: false, error: "Access denied: You can only complete requests assigned to you." };
  }

  const { data, error } = await supabase.rpc("staff_complete_guest_request", {
    p_property_id: propertyId,
    p_request_id: requestId,
    p_guest_notes: guestNotes || null,
    p_staff_notes: staffNotes || null,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to complete request.",
    };
  }

  revalidatePath("/guest-requests");
  revalidatePath(`/guest-requests/${requestId}`);
  return { success: true };
}

export async function staffCancelGuestRequestAction(
  propertyId: string,
  requestId: string,
  reason?: string
) {
  const auth = await checkStaffAuth(propertyId, "GUEST_REQUEST_CANCEL");
  if (auth.error) return { success: false, error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_cancel_guest_request", {
    p_property_id: propertyId,
    p_request_id: requestId,
    p_reason: reason || null,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to cancel request.",
    };
  }

  revalidatePath("/guest-requests");
  revalidatePath(`/guest-requests/${requestId}`);
  return { success: true };
}

export async function staffRejectGuestRequestAction(
  propertyId: string,
  requestId: string,
  reason?: string
) {
  const auth = await checkStaffAuth(propertyId, "GUEST_REQUEST_UPDATE");
  if (auth.error) return { success: false, error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_reject_guest_request", {
    p_property_id: propertyId,
    p_request_id: requestId,
    p_reason: reason || null,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to reject request.",
    };
  }

  revalidatePath("/guest-requests");
  revalidatePath(`/guest-requests/${requestId}`);
  return { success: true };
}
