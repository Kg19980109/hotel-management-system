// ============================================================
// STAYHUB FRONT DESK & STAY LIFECYCLE SERVER ACTIONS (Phase 8)
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasFrontDeskPermission, FrontDeskPermission } from "./permissions";
import { CheckInInput, CheckOutInput, NoShowInput } from "./types";

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SessionAuthResult {
  userId: string;
  profileId: string;
  roleCode: string;
}

/**
 * Internal helper to authenticate and verify user membership and role in the property
 */
async function authenticateFrontDeskSession(
  propertyId: string,
  requiredPermission?: FrontDeskPermission
): Promise<{ auth?: SessionAuthResult; error?: string }> {
  if (!propertyId) {
    return { error: "Property context is required." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Authentication required to perform front desk operations." };
  }

  // Verify membership and get role code
  const { data: membership, error: memberError } = await supabase
    .from("property_memberships")
    .select(`
      id,
      status,
      roles:role_id (
        code
      )
    `)
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .eq("status", "active")
    .maybeSingle();

  if (memberError || !membership) {
    return { error: "Access denied. You do not have an active membership for this property." };
  }

  const roleObj = membership.roles as unknown as { code?: string } | null;
  const roleCode = roleObj?.code || "RECEPTIONIST";

  if (requiredPermission && !hasFrontDeskPermission([roleCode], requiredPermission)) {
    return {
      error: `Access denied. Your role (${roleCode}) lacks the ${requiredPermission} permission.`,
    };
  }

  // Resolve profile ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  return { 
    auth: { 
      userId: user.id, 
      profileId: profile?.id || user.id, 
      roleCode 
    } 
  };
}

/**
 * Check In a guest into an assigned room
 */
export async function checkInStayAction(
  input: CheckInInput
): Promise<ActionResponse<{ stayId: string }>> {
  const authRes = await authenticateFrontDeskSession(input.propertyId, "CHECK_IN");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("check_in_reservation_room", {
      p_reservation_room_id: input.reservationRoomId,
      p_room_id: input.roomId,
      p_property_id: input.propertyId,
      p_adults: input.adults || null,
      p_children: input.children || null,
      p_notes: input.notes || null,
      p_is_early: input.isEarly || false,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      console.error("check_in_reservation_room RPC error:", error);
      return { success: false, error: error.message };
    }

    const stayRecord = data as { id?: string } | null;

    revalidatePath("/front-desk");
    revalidatePath("/bookings");
    revalidatePath("/dashboard");
    revalidatePath("/rooms");

    return {
      success: true,
      data: { stayId: stayRecord?.id || "" },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process check-in";
    return { success: false, error: msg };
  }
}

/**
 * Check Out a stay, transitioning room to DIRTY
 */
export async function checkOutStayAction(
  input: CheckOutInput
): Promise<ActionResponse<{ stayId: string }>> {
  const authRes = await authenticateFrontDeskSession(input.propertyId, "CHECK_OUT");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("check_out_stay", {
      p_stay_id: input.stayId,
      p_property_id: input.propertyId,
      p_allow_unpaid_override: input.allowUnpaidOverride || false,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      console.error("check_out_stay RPC error:", error);
      return { success: false, error: error.message };
    }

    const stayRecord = data as { id?: string } | null;

    revalidatePath("/front-desk");
    revalidatePath("/bookings");
    revalidatePath("/dashboard");
    revalidatePath("/rooms");

    return {
      success: true,
      data: { stayId: stayRecord?.id || input.stayId },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process check-out";
    return { success: false, error: msg };
  }
}

/**
 * Mark a reservation as NO_SHOW and release room inventory
 */
export async function markNoShowAction(
  input: NoShowInput
): Promise<ActionResponse> {
  const authRes = await authenticateFrontDeskSession(input.propertyId, "NO_SHOW");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc("mark_reservation_no_show", {
      p_reservation_id: input.reservationId,
      p_property_id: input.propertyId,
      p_reason: input.reason || null,
    });

    if (error) {
      console.error("mark_reservation_no_show RPC error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/front-desk");
    revalidatePath("/bookings");
    revalidatePath("/dashboard");
    revalidatePath("/rooms");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record no-show";
    return { success: false, error: msg };
  }
}

/**
 * Reassign an in-house stay to another physical room
 */
export async function reassignStayRoomAction(
  stayId: string,
  propertyId: string,
  newRoomId: string
): Promise<ActionResponse> {
  const authRes = await authenticateFrontDeskSession(propertyId, "ROOM_REASSIGN");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    // 1. Fetch current stay
    const { data: stay, error: stayErr } = await supabase
      .from("stays")
      .select("id, room_id, reservation_room_id, status")
      .eq("id", stayId)
      .eq("property_id", propertyId)
      .single();

    if (stayErr || !stay) {
      return { success: false, error: "Stay not found." };
    }

    if (stay.status !== "CHECKED_IN") {
      return { success: false, error: "Can only reassign rooms for active checked-in stays." };
    }

    if (stay.room_id === newRoomId) {
      return { success: true }; // already in this room
    }

    // 2. Validate new room
    const { data: newRoom, error: roomErr } = await supabase
      .from("rooms")
      .select("id, room_number, status, is_active")
      .eq("id", newRoomId)
      .eq("property_id", propertyId)
      .single();

    if (roomErr || !newRoom) {
      return { success: false, error: "Selected room does not exist in this property." };
    }

    if (!newRoom.is_active || newRoom.status === "OCCUPIED" || newRoom.status === "OUT_OF_ORDER" || newRoom.status === "OUT_OF_SERVICE") {
      return { success: false, error: `Room ${newRoom.room_number} is currently ${newRoom.status} and cannot be assigned.` };
    }

    const oldRoomId = stay.room_id;

    // 3. Atomically perform reassignment
    // Update old room to DIRTY (needs cleaning after guest left)
    await supabase.from("rooms").update({ status: "DIRTY", housekeeping_status: "DIRTY" }).eq("id", oldRoomId);

    // Update stay room_id
    const { error: updateStayErr } = await supabase
      .from("stays")
      .update({ room_id: newRoomId, updated_at: new Date().toISOString() })
      .eq("id", stayId);

    if (updateStayErr) {
      // Revert old room status
      await supabase.from("rooms").update({ status: "OCCUPIED" }).eq("id", oldRoomId);
      return { success: false, error: `Failed to update stay: ${updateStayErr.message}` };
    }

    // Update reservation_rooms if applicable
    if (stay.reservation_room_id) {
      await supabase.from("reservation_rooms").update({ room_id: newRoomId }).eq("id", stay.reservation_room_id);
    }

    // Update new room to OCCUPIED
    await supabase.from("rooms").update({ status: "OCCUPIED" }).eq("id", newRoomId);

    revalidatePath("/front-desk");
    revalidatePath("/bookings");
    revalidatePath("/rooms");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reassign room";
    return { success: false, error: msg };
  }
}

export interface DirectRoomAssignmentInput {
  propertyId: string;
  roomId: string;
  guestId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  checkInDate?: string;
  checkOutDate?: string;
  ratePerNight?: number;
  adults?: number;
  children?: number;
  notes?: string | null;
}

/**
 * Direct Room Assignment & Check-In for Existing or New Guest
 */
export async function assignRoomAndCheckInGuestAction(
  input: DirectRoomAssignmentInput
): Promise<ActionResponse<{
  stay_id: string;
  guest_id: string;
  guest_name: string;
  room_id: string;
  room_number: string;
  confirmation_number: string;
  folio_id: string;
  folio_number: string;
  check_in_date: string;
  check_out_date: string;
  rate_per_night: number;
  total_amount: number;
}>> {
  const authRes = await authenticateFrontDeskSession(input.propertyId, "CHECK_IN");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("assign_room_and_check_in_guest", {
      p_property_id: input.propertyId,
      p_room_id: input.roomId,
      p_guest_id: input.guestId || null,
      p_first_name: input.firstName || null,
      p_last_name: input.lastName || null,
      p_phone: input.phone || null,
      p_email: input.email || null,
      p_id_document_type: input.idDocumentType || null,
      p_id_document_number: input.idDocumentNumber || null,
      p_check_in_date: input.checkInDate || new Date().toISOString().split("T")[0],
      p_check_out_date: input.checkOutDate || undefined,
      p_rate_per_night: input.ratePerNight || 0,
      p_adults: input.adults || 1,
      p_children: input.children || 0,
      p_notes: input.notes || null,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.message || "Failed to assign room and check in guest." };
    }

    revalidatePath("/front-desk");
    revalidatePath("/dashboard");
    revalidatePath("/bookings");
    revalidatePath("/rooms");
    revalidatePath("/guests");
    revalidatePath("/billing/folios");

    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to assign room and check in guest";
    return { success: false, error: msg };
  }
}

export interface DirectAssignmentRoomOption {
  id: string;
  room_number: string;
  room_name?: string | null;
  status: string;
  housekeeping_status: string;
  is_active: boolean;
  is_occupied: boolean;
  active_guest_name?: string | null;
  room_type?: {
    id: string;
    name: string;
    code: string;
    base_rate: number;
    max_occupancy?: number;
  } | null;
}

export interface DirectAssignmentGuestOption {
  id: string;
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Fetch available rooms and recent guests for direct room assignment
 */
export async function getDirectAssignmentOptionsAction(
  propertyId: string
): Promise<ActionResponse<{
  rooms: DirectAssignmentRoomOption[];
  guests: DirectAssignmentGuestOption[];
}>> {
  if (!propertyId) {
    return { success: false, error: "Property context is required." };
  }

  const supabase = await createClient();

  try {
    // 1. Fetch rooms with room_types and active stays
    const { data: rawRooms, error: roomsErr } = await supabase
      .from("rooms")
      .select(`
        id,
        room_number,
        room_name,
        status,
        housekeeping_status,
        is_active,
        room_types:room_type_id (
          id,
          name,
          code,
          base_rate,
          max_occupancy
        ),
        stays (
          id,
          status,
          guests (
            first_name,
            last_name
          )
        )
      `)
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("room_number", { ascending: true });

    if (roomsErr) {
      console.error("getDirectAssignmentOptionsAction rooms error:", roomsErr);
      return { success: false, error: roomsErr.message };
    }

    const rooms: DirectAssignmentRoomOption[] = (rawRooms || []).map((r: any) => {
      const activeStay = (r.stays || []).find((s: any) => s.status === "CHECKED_IN");
      const isOccupied = !!activeStay || r.status === "OCCUPIED";
      const guestObj = activeStay?.guests;
      const activeGuestName = guestObj
        ? `${guestObj.first_name} ${guestObj.last_name || ""}`.trim()
        : null;

      const rt = r.room_types;
      return {
        id: r.id,
        room_number: r.room_number,
        room_name: r.room_name,
        status: r.status,
        housekeeping_status: r.housekeeping_status,
        is_active: r.is_active,
        is_occupied: isOccupied,
        active_guest_name: activeGuestName,
        room_type: rt
          ? {
              id: rt.id,
              name: rt.name,
              code: rt.code,
              base_rate: Number(rt.base_rate) || 0,
              max_occupancy: rt.max_occupancy,
            }
          : null,
      };
    });

    // 2. Fetch recent guests
    const { data: rawGuests, error: guestsErr } = await supabase
      .from("guests")
      .select("id, first_name, last_name, phone, email")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (guestsErr) {
      console.error("getDirectAssignmentOptionsAction guests error:", guestsErr);
    }

    const guests: DirectAssignmentGuestOption[] = (rawGuests || []).map((g: any) => ({
      id: g.id,
      first_name: g.first_name,
      last_name: g.last_name,
      phone: g.phone,
      email: g.email,
    }));

    return {
      success: true,
      data: {
        rooms,
        guests,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load assignment options";
    return { success: false, error: msg };
  }
}
