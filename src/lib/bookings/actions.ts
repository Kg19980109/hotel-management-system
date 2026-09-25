// ============================================================
// STAYHUB RESERVATION & BOOKING SERVER ACTIONS (Phase 7)
// ============================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import { hasBookingPermission, BookingPermission } from "./permissions";
import { CreateBookingInput, UpdateBookingInput, ReservationStatus } from "./types";

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
async function authenticatePropertySession(
  propertyId: string,
  requiredPermission?: BookingPermission
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
    return { error: "Authentication required to perform booking operations." };
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

  if (requiredPermission && !hasBookingPermission([roleCode], requiredPermission)) {
    return { error: `Permission denied. Your role (${roleCode}) lacks ${requiredPermission}.` };
  }

  return {
    auth: {
      userId: user.id,
      roleCode,
    },
  };
}

/**
 * Validates date strings in YYYY-MM-DD format and ensures checkIn < checkOut
 */
function validateDates(checkIn: string, checkOut: string): { valid: boolean; nights: number; error?: string } {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
    return { valid: false, nights: 0, error: "Invalid date format. Expected YYYY-MM-DD." };
  }

  const diffTime = outDate.getTime() - inDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return { valid: false, nights: 0, error: "Check-out date must be at least 1 day after check-in date." };
  }

  return { valid: true, nights: diffDays };
}

/**
 * Action: Create a new reservation atomically
 */
export async function createBookingAction(
  input: CreateBookingInput
): Promise<ActionResponse<{ bookingId: string; confirmationNumber: string }>> {
  try {
    const { auth, error: authError } = await authenticatePropertySession(
      input.propertyId,
      "BOOKING_CREATE"
    );

    if (authError || !auth) {
      return { success: false, error: authError || "Unauthorized" };
    }

    const supabase = await createClient();

    // 1. Date Validation
    const dateCheck = validateDates(input.checkInDate, input.checkOutDate);
    if (!dateCheck.valid) {
      return { success: false, error: dateCheck.error };
    }
    const nights = dateCheck.nights;

    // 2. Validate Guest Input
    if (!input.guest.firstName?.trim() || !input.guest.lastName?.trim()) {
      return { success: false, error: "Guest first name and last name are required." };
    }

    // 3. Validate Rooms
    if (!input.rooms || input.rooms.length === 0) {
      return { success: false, error: "At least one room must be selected for the reservation." };
    }

    // 4. Verify each room item belongs to property & no conflict
    for (const item of input.rooms) {
      const { data: rt, error: rtErr } = await supabase
        .from("room_types")
        .select("id, property_id, base_rate, currency")
        .eq("id", item.roomTypeId)
        .eq("property_id", input.propertyId)
        .maybeSingle();

      if (rtErr || !rt) {
        return { success: false, error: `Invalid room type for this property.` };
      }

      if (item.roomId) {
        const { data: rm, error: rmErr } = await supabase
          .from("rooms")
          .select("id, property_id, room_type_id, status, is_active")
          .eq("id", item.roomId)
          .eq("property_id", input.propertyId)
          .maybeSingle();

        if (rmErr || !rm) {
          return { success: false, error: `Invalid room for this property.` };
        }

        if (rm.room_type_id !== item.roomTypeId) {
          return { success: false, error: `Assigned room does not match the requested room type.` };
        }

        if (!rm.is_active || rm.status === "OUT_OF_ORDER" || rm.status === "OUT_OF_SERVICE") {
          return { success: false, error: `Selected room is currently out of order or inactive.` };
        }

        const { data: conflicts, error: confErr } = await supabase
          .from("reservation_rooms")
          .select("id")
          .eq("property_id", input.propertyId)
          .eq("room_id", item.roomId)
          .eq("is_cancelled", false)
          .lt("check_in_date", input.checkOutDate)
          .gt("check_out_date", input.checkInDate);

        if (confErr) {
          return { success: false, error: `Failed to verify room availability: ${confErr.message}` };
        }

        if (conflicts && conflicts.length > 0) {
          return {
            success: false,
            error: `Room is already reserved for the selected dates. Please choose another room.`,
          };
        }
      }
    }

    // 5. Create or Find Guest
    let guestId: string;
    if (input.guestId) {
      const { data: specifiedGuest, error: specErr } = await supabase
        .from("guests")
        .select("id")
        .eq("id", input.guestId)
        .eq("property_id", input.propertyId)
        .maybeSingle();

      if (specErr || !specifiedGuest) {
        return { success: false, error: "The selected guest could not be found or does not belong to this property." };
      }
      guestId = specifiedGuest.id;
    } else {
      const { data: existingGuest } = await supabase
        .from("guests")
        .select("id")
        .eq("property_id", input.propertyId)
        .eq("first_name", input.guest.firstName.trim())
        .eq("last_name", input.guest.lastName.trim())
        .limit(1)
        .maybeSingle();

      if (existingGuest) {
        guestId = existingGuest.id;
      } else {
        const { data: newGuest, error: guestErr } = await supabase
          .from("guests")
          .insert({
            property_id: input.propertyId,
            first_name: input.guest.firstName.trim(),
            last_name: input.guest.lastName.trim(),
            email: input.guest.email?.trim() || null,
            phone: input.guest.phone?.trim() || null,
            nationality: input.guest.nationality?.trim() || null,
            created_by: auth.userId,
            updated_by: auth.userId,
          })
          .select("id")
          .single();

        if (guestErr || !newGuest) {
          return { success: false, error: `Failed to create guest record: ${guestErr?.message}` };
        }
        guestId = newGuest.id;
      }
    }

    // 6. Generate Confirmation Number
    const { data: confNumData, error: confNumErr } = await supabase.rpc(
      "generate_reservation_confirmation_number",
      { p_property_id: input.propertyId }
    );

    const confirmationNumber =
      !confNumErr && confNumData
        ? confNumData
        : `STH-${new Date().getFullYear().toString().slice(-2)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 7. Calculate Totals
    let reservationTotal = 0;
    const roomRows = input.rooms.map((r) => {
      const roomTotal = Number(r.nightlyRate) * nights;
      reservationTotal += roomTotal;
      return {
        property_id: input.propertyId,
        room_type_id: r.roomTypeId,
        room_id: r.roomId || null,
        check_in_date: input.checkInDate,
        check_out_date: input.checkOutDate,
        adults: r.adults || 1,
        children: r.children || 0,
        nightly_rate: r.nightlyRate,
        total_amount: roomTotal,
      };
    });

    // 8. Insert Reservation
    const { data: newRes, error: resErr } = await supabase
      .from("reservations")
      .insert({
        property_id: input.propertyId,
        confirmation_number: confirmationNumber,
        status: "CONFIRMED",
        booking_source: input.bookingSource || "DIRECT",
        check_in_date: input.checkInDate,
        check_out_date: input.checkOutDate,
        adults: input.adults || 1,
        children: input.children || 0,
        special_requests: input.specialRequests?.trim() || null,
        internal_notes: input.internalNotes?.trim() || null,
        primary_guest_id: guestId,
        total_amount: reservationTotal,
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select("id")
      .single();

    if (resErr || !newRes) {
      return { success: false, error: `Failed to create reservation: ${resErr?.message}` };
    }

    // 9. Insert Reservation Rooms
    const resRoomsToInsert = roomRows.map((row) => ({
      ...row,
      reservation_id: newRes.id,
    }));

    const { error: rrErr } = await supabase.from("reservation_rooms").insert(resRoomsToInsert);
    if (rrErr) {
      await supabase.from("reservations").delete().eq("id", newRes.id);
      return {
        success: false,
        error: `Failed to allocate reservation rooms: ${rrErr.message}. The room may have been booked concurrently.`,
      };
    }

    return {
      success: true,
      data: {
        bookingId: newRes.id,
        confirmationNumber,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error during reservation creation";
    console.error("createBookingAction exception:", err);
    return { success: false, error: msg };
  }
}

/**
 * Action: Cancel a reservation
 */
export async function cancelBookingAction(
  bookingId: string,
  propertyId: string,
  reason?: string
): Promise<ActionResponse> {
  try {
    const { auth, error: authError } = await authenticatePropertySession(
      propertyId,
      "BOOKING_CANCEL"
    );

    if (authError || !auth) {
      return { success: false, error: authError || "Unauthorized" };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("reservations")
      .update({
        status: "CANCELLED",
        cancellation_reason: reason?.trim() || "Guest requested cancellation",
        cancelled_at: new Date().toISOString(),
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("property_id", propertyId);

    if (error) {
      return { success: false, error: `Failed to cancel reservation: ${error.message}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error cancelling reservation";
    return { success: false, error: msg };
  }
}

/**
 * Action: Change reservation status
 */
export async function changeBookingStatusAction(
  bookingId: string,
  propertyId: string,
  newStatus: ReservationStatus
): Promise<ActionResponse> {
  try {
    const { auth, error: authError } = await authenticatePropertySession(
      propertyId,
      "BOOKING_CHANGE_STATUS"
    );

    if (authError || !auth) {
      return { success: false, error: authError || "Unauthorized" };
    }

    const supabase = await createClient();

    const { data: currentRes, error: fetchErr } = await supabase
      .from("reservations")
      .select("status")
      .eq("id", bookingId)
      .eq("property_id", propertyId)
      .single();

    if (fetchErr || !currentRes) {
      return { success: false, error: "Reservation not found." };
    }

    const current = currentRes.status as ReservationStatus;

    const allowedTransitions: Record<ReservationStatus, ReservationStatus[]> = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["CANCELLED", "NO_SHOW", "COMPLETED"],
      CANCELLED: [],
      NO_SHOW: ["CANCELLED", "COMPLETED"],
      COMPLETED: [],
    };

    if (current !== newStatus && !allowedTransitions[current].includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition reservation from ${current} to ${newStatus}.`,
      };
    }

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "CANCELLED") {
      updatePayload.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("reservations")
      .update(updatePayload)
      .eq("id", bookingId)
      .eq("property_id", propertyId);

    if (error) {
      return { success: false, error: `Failed to update status: ${error.message}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error updating booking status";
    return { success: false, error: msg };
  }
}

/**
 * Action: Assign or unassign physical room to a reservation room item
 */
export async function assignRoomAction(
  bookingId: string,
  propertyId: string,
  reservationRoomId: string,
  roomId: string | null
): Promise<ActionResponse> {
  try {
    const { auth, error: authError } = await authenticatePropertySession(
      propertyId,
      "BOOKING_ASSIGN_ROOM"
    );

    if (authError || !auth) {
      return { success: false, error: authError || "Unauthorized" };
    }

    const supabase = await createClient();

    const { data: resRoom, error: rrErr } = await supabase
      .from("reservation_rooms")
      .select("id, property_id, room_type_id, check_in_date, check_out_date, is_cancelled")
      .eq("id", reservationRoomId)
      .eq("reservation_id", bookingId)
      .eq("property_id", propertyId)
      .single();

    if (rrErr || !resRoom) {
      return { success: false, error: "Reservation room item not found." };
    }

    if (roomId) {
      const { data: targetRoom, error: trErr } = await supabase
        .from("rooms")
        .select("id, property_id, room_type_id, status, is_active")
        .eq("id", roomId)
        .eq("property_id", propertyId)
        .maybeSingle();

      if (trErr || !targetRoom) {
        return { success: false, error: "Selected room does not exist in this property." };
      }

      if (targetRoom.room_type_id !== resRoom.room_type_id) {
        return { success: false, error: "Selected room does not match the reserved room type." };
      }

      if (!targetRoom.is_active || targetRoom.status === "OUT_OF_ORDER" || targetRoom.status === "OUT_OF_SERVICE") {
        return { success: false, error: "Selected room is currently out of order or inactive." };
      }

      const { data: conflicts, error: confErr } = await supabase
        .from("reservation_rooms")
        .select("id")
        .eq("property_id", propertyId)
        .eq("room_id", roomId)
        .eq("is_cancelled", false)
        .neq("id", reservationRoomId)
        .lt("check_in_date", resRoom.check_out_date)
        .gt("check_out_date", resRoom.check_in_date);

      if (confErr) {
        return { success: false, error: `Failed checking room conflicts: ${confErr.message}` };
      }

      if (conflicts && conflicts.length > 0) {
        return { success: false, error: "Room is already reserved for these dates. Please choose another." };
      }
    }

    const { error } = await supabase
      .from("reservation_rooms")
      .update({
        room_id: roomId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservationRoomId)
      .eq("property_id", propertyId);

    if (error) {
      return { success: false, error: `Failed to assign room: ${error.message}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error assigning room";
    return { success: false, error: msg };
  }
}

/**
 * Action: Update reservation details (dates, guest counts, notes)
 */
export async function updateBookingAction(
  input: UpdateBookingInput
): Promise<ActionResponse> {
  try {
    const { auth, error: authError } = await authenticatePropertySession(
      input.propertyId,
      "BOOKING_UPDATE"
    );

    if (authError || !auth) {
      return { success: false, error: authError || "Unauthorized" };
    }

    const supabase = await createClient();

    const { data: currentRes, error: fetchErr } = await supabase
      .from("reservations")
      .select("id, check_in_date, check_out_date, status")
      .eq("id", input.bookingId)
      .eq("property_id", input.propertyId)
      .single();

    if (fetchErr || !currentRes) {
      return { success: false, error: "Reservation not found." };
    }

    if (currentRes.status === "CANCELLED") {
      return { success: false, error: "Cannot modify a cancelled reservation." };
    }

    const checkIn = input.checkInDate || currentRes.check_in_date;
    const checkOut = input.checkOutDate || currentRes.check_out_date;

    const dateCheck = validateDates(checkIn, checkOut);
    if (!dateCheck.valid) {
      return { success: false, error: dateCheck.error };
    }

    if (input.checkInDate || input.checkOutDate) {
      const { data: assignedRooms } = await supabase
        .from("reservation_rooms")
        .select("id, room_id")
        .eq("reservation_id", input.bookingId)
        .not("room_id", "is", null);

      for (const item of assignedRooms || []) {
        const { data: conflicts } = await supabase
          .from("reservation_rooms")
          .select("id")
          .eq("property_id", input.propertyId)
          .eq("room_id", item.room_id)
          .eq("is_cancelled", false)
          .neq("reservation_id", input.bookingId)
          .lt("check_in_date", checkOut)
          .gt("check_out_date", checkIn);

        if (conflicts && conflicts.length > 0) {
          return {
            success: false,
            error: `Date change conflicts with another booking on assigned room. Please unassign room before adjusting dates.`,
          };
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    };

    if (input.checkInDate) updatePayload.check_in_date = input.checkInDate;
    if (input.checkOutDate) updatePayload.check_out_date = input.checkOutDate;
    if (input.adults !== undefined) updatePayload.adults = input.adults;
    if (input.children !== undefined) updatePayload.children = input.children;
    if (input.bookingSource) updatePayload.booking_source = input.bookingSource;
    if (input.specialRequests !== undefined) updatePayload.special_requests = input.specialRequests;
    if (input.internalNotes !== undefined) updatePayload.internal_notes = input.internalNotes;

    const { error: updateErr } = await supabase
      .from("reservations")
      .update(updatePayload)
      .eq("id", input.bookingId)
      .eq("property_id", input.propertyId);

    if (updateErr) {
      return { success: false, error: `Failed to update reservation: ${updateErr.message}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error updating booking";
    return { success: false, error: msg };
  }
}
