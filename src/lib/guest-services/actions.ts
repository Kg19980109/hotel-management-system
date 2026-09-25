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
    .select("role:roles(code), is_active")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .eq("is_active", true)
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
    title: data.title,
    status: data.status,
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

  return { success: true };
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
    return {
      success: false,
      error: error?.message || data?.error || "Failed to acknowledge request.",
    };
  }

  revalidatePath("/guest-requests");
  revalidatePath(`/guest-requests/${requestId}`);
  return { success: true };
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
