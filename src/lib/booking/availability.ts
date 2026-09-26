// ============================================================
// STAYHUB ONLINE AVAILABILITY ENGINE (Phase 21)
// Authoritative server-side availability calculation
// strictly using existing rooms, room_types, and reservations tables
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicRoomType, AvailabilitySearchParams } from "./types";

/**
 * Computes available room counts per room type for a specified date range.
 * Considers out-of-order rooms and overlapping reservations.
 */
export async function calculateRoomTypeAvailability(
  supabase: SupabaseClient,
  propertyId: string,
  currency: string,
  params: AvailabilitySearchParams
): Promise<PublicRoomType[]> {
  const { checkInDate, checkOutDate, roomsCount } = params;

  // 1. Fetch active room types
  const { data: roomTypes, error: rtError } = await supabase
    .from("room_types")
    .select("*")
    .eq("property_id", propertyId)
    .eq("is_active", true);

  if (rtError || !roomTypes) {
    return [];
  }

  // 2. Fetch all active rooms for the property
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, room_type_id, status, is_active")
    .eq("property_id", propertyId)
    .eq("is_active", true);

  const allRooms = rooms || [];

  // Group rooms and count unusable rooms (OUT_OF_ORDER, OUT_OF_SERVICE)
  const roomCountByType = new Map<string, number>();
  const unusableByType = new Map<string, number>();

  for (const r of allRooms) {
    if (!r.room_type_id) continue;
    const current = roomCountByType.get(r.room_type_id) || 0;
    roomCountByType.set(r.room_type_id, current + 1);

    if (r.status === "OUT_OF_ORDER" || r.status === "OUT_OF_SERVICE") {
      const unusable = unusableByType.get(r.room_type_id) || 0;
      unusableByType.set(r.room_type_id, unusable + 1);
    }
  }

  // 3. Fetch overlapping reservations for the property
  // Overlap condition: (reservation.check_in_date < params.checkOutDate) AND (reservation.check_out_date > params.checkInDate)
  const { data: overlappingReservations } = await supabase
    .from("reservations")
    .select(`
      id,
      status,
      reservation_rooms(
        room_type_id,
        room_id
      )
    `)
    .eq("property_id", propertyId)
    .in("status", ["CONFIRMED", "IN_HOUSE", "CHECKED_IN", "PENDING"])
    .lt("check_in_date", checkOutDate)
    .gt("check_out_date", checkInDate);

  // Count booked rooms by room type
  const bookedCountByType = new Map<string, number>();

  (overlappingReservations || []).forEach((res: Record<string, unknown>) => {
    const rooms = (res.reservation_rooms as Array<Record<string, unknown>>) || [];
    rooms.forEach((rr) => {
      if (rr.room_type_id) {
        const typeId = String(rr.room_type_id);
        const booked = bookedCountByType.get(typeId) || 0;
        bookedCountByType.set(typeId, booked + 1);
      }
    });
  });

  // 4. Build public room type response
  const results: PublicRoomType[] = roomTypes.map((rt: Record<string, unknown>) => {
    const rtId = String(rt.id || "");
    const totalRooms = roomCountByType.get(rtId) || 0;
    const unusable = unusableByType.get(rtId) || 0;
    const booked = bookedCountByType.get(rtId) || 0;

    const sellableTotal = Math.max(0, totalRooms - unusable);
    const availableCount = Math.max(0, sellableTotal - booked);
    const isAvailable = availableCount >= roomsCount;
    const sizeSqm = Number(rt.size_sqm) || 0;

    return {
      id: rtId,
      propertyId: String(rt.property_id || ""),
      name: String(rt.name || "Standard Room"),
      code: String(rt.code || "STD"),
      description: String(rt.description || ""),
      maxOccupancy: Number(rt.max_occupancy) || 2,
      maxAdults: Number(rt.max_adults || rt.max_occupancy) || 2,
      maxChildren: Number(rt.max_children) || 0,
      baseRate: Number(rt.base_price || rt.base_rate || 0),
      currency: currency || "INR",
      bedConfiguration: String(rt.bed_type || rt.bed_configuration || "Standard Bed"),
      roomSizeSqFt: sizeSqm > 0 ? Math.round(sizeSqm * 10.764) : undefined,
      amenities: Array.isArray(rt.amenities)
        ? (rt.amenities as string[])
        : ["Free High-Speed Wi-Fi", "Air Conditioning", "En-suite Bathroom", "Smart TV"],
      totalRooms,
      availableCount,
      isAvailable,
    };
  });

  return results;
}
