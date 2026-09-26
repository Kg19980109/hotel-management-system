import { createClient } from "@/lib/supabase/client";
import { hashToken } from "@/lib/guest-portal/types";
import {
  GuestServiceRequestSummary,
  GuestServiceRequestDetail,
  StaffGuestServiceRequest,
  StaffGuestServiceRequestEvent,
} from "./types";

/**
 * Fetch guest's service requests via validated session token
 */
export async function getGuestServiceRequests(
  rawSessionToken?: string
): Promise<GuestServiceRequestSummary[]> {
  if (!rawSessionToken) {
    return [];
  }

  const supabase = createClient();
  const sessionTokenHash = hashToken(rawSessionToken);

  const { data, error } = await supabase.rpc("get_guest_service_requests", {
    p_session_token_hash: sessionTokenHash,
  });

  if (error || !data?.success) {
    return [];
  }

  return (data.requests || []) as GuestServiceRequestSummary[];
}

/**
 * Fetch detail of a guest's specific service request via validated session token
 */
export async function getGuestServiceRequestDetail(
  requestId: string,
  rawSessionToken?: string
): Promise<GuestServiceRequestDetail | null> {
  if (!rawSessionToken) {
    return null;
  }

  const supabase = createClient();
  const sessionTokenHash = hashToken(rawSessionToken);

  const { data, error } = await supabase.rpc(
    "get_guest_service_request_detail",
    {
      p_session_token_hash: sessionTokenHash,
      p_request_id: requestId,
    }
  );

  if (error || !data?.success || !data.request) {
    return null;
  }

  return data.request as GuestServiceRequestDetail;
}

/**
 * Fetch staff-facing list of guest service requests for a property
 */
export async function getStaffGuestServiceRequests(
  propertyId: string,
  filters?: {
    category?: string;
    status?: string;
    priority?: string;
    search?: string;
  }
): Promise<StaffGuestServiceRequest[]> {
  const supabase = createClient();

  let query = supabase
    .from("guest_service_requests")
    .select(
      `
      id,
      property_id,
      guest_id,
      stay_id,
      room_id,
      category,
      request_type,
      title,
      description,
      priority,
      status,
      requested_at,
      acknowledged_at,
      acknowledged_by,
      assigned_to,
      assigned_department,
      started_at,
      completed_at,
      cancelled_at,
      guest_visible_notes,
      staff_notes,
      created_at,
      updated_at,
      created_by,
      updated_by,
      guest:guests(id, first_name, last_name, email, phone),
      room:rooms(id, room_number),
      stay:stays(id, status, check_in_date, check_out_date),
      assignee:profiles!guest_service_requests_assigned_to_fkey(id, full_name, email)
    `
    )
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (filters?.category && filters.category !== "ALL") {
    query = query.eq("category", filters.category);
  }
  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters?.priority && filters.priority !== "ALL") {
    query = query.eq("priority", filters.priority);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("Error fetching staff guest requests:", error);
    return [];
  }

  return (data || []) as unknown as StaffGuestServiceRequest[];
}

/**
 * Fetch staff-facing detail of a specific guest service request
 */
export async function getStaffGuestServiceRequestDetail(
  propertyId: string,
  requestId: string
): Promise<StaffGuestServiceRequest | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("guest_service_requests")
    .select(
      `
      id,
      property_id,
      guest_id,
      stay_id,
      room_id,
      category,
      request_type,
      title,
      description,
      priority,
      status,
      requested_at,
      assigned_to,
      assigned_department,
      started_at,
      completed_at,
      cancelled_at,
      guest_visible_notes,
      staff_notes,
      created_at,
      updated_at,
      created_by,
      updated_by,
      guest:guests(id, first_name, last_name, email, phone),
      room:rooms(id, room_number),
      stay:stays(id, status, check_in_date, check_out_date),
      assignee:profiles!guest_service_requests_assigned_to_fkey(id, full_name, email)
    `
    )
    .eq("property_id", propertyId)
    .eq("id", requestId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as StaffGuestServiceRequest;
}

/**
 * Fetch staff-facing event history for a request
 */
export async function getStaffGuestServiceRequestEvents(
  propertyId: string,
  requestId: string
): Promise<StaffGuestServiceRequestEvent[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("guest_service_request_events")
    .select(
      `
      id,
      property_id,
      request_id,
      event_type,
      from_status,
      to_status,
      actor_type,
      actor_profile_id,
      event_note,
      created_at,
      actor:profiles(id, full_name, email)
    `
    )
    .eq("property_id", propertyId)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data || []) as unknown as StaffGuestServiceRequestEvent[];
}
