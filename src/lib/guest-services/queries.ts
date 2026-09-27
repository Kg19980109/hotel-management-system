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
      stay:stays(id, status, actual_check_in_at, expected_check_out_date),
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
      stay:stays(id, status, actual_check_in_at, expected_check_out_date),
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

export interface PayableServiceItem {
  id: string;
  name: string;
  category_name: string;
  price: number;
  description: string | null;
  is_available: boolean;
}

/**
 * Fetch payable services configured in POS for guests to view transparently
 */
export async function getGuestPayableServices(
  propertyId: string
): Promise<PayableServiceItem[]> {
  if (!propertyId) return [];

  const supabase = createClient();

  const { data, error } = await supabase
    .from("menu_items")
    .select(`
      id,
      name,
      price,
      description,
      is_available,
      category:category_id (
        name
      ),
      restaurant:restaurant_id (
        property_id
      )
    `)
    .eq("restaurant.property_id", propertyId)
    .eq("is_available", true);

  if (error || !data) {
    return [];
  }

  const services: PayableServiceItem[] = [];
  for (const item of data as any[]) {
    if (!item.restaurant || item.restaurant.property_id !== propertyId) continue;
    const catName = item.category?.name || "Services";
    const catLower = catName.toLowerCase();
    const nameLower = item.name.toLowerCase();

    // Filter for services, laundry, spa, room amenities, tariffs, transport
    const isService =
      catLower.includes("service") ||
      catLower.includes("laundry") ||
      catLower.includes("spa") ||
      catLower.includes("amenity") ||
      catLower.includes("amenities") ||
      catLower.includes("tariff") ||
      catLower.includes("room") ||
      nameLower.includes("laundry") ||
      nameLower.includes("spa") ||
      nameLower.includes("wash") ||
      nameLower.includes("dry clean") ||
      nameLower.includes("iron") ||
      nameLower.includes("massage") ||
      nameLower.includes("cab") ||
      nameLower.includes("taxi");

    if (isService) {
      services.push({
        id: item.id,
        name: item.name,
        category_name: catName,
        price: Number(item.price) || 0,
        description: item.description || null,
        is_available: Boolean(item.is_available),
      });
    }
  }

  return services;
}
