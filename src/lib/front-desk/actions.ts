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

  return { auth: { userId: user.id, roleCode } };
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
