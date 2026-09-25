// ============================================================
// STAYHUB FRONT DESK QUERY FUNCTIONS (Phase 8)
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FrontDeskKPIStats,
  ArrivalRecord,
  DepartureRecord,
  InHouseRecord,
  Stay,
  RoomAttentionRecord,
} from "./types";

/**
 * Fetch real-time Front Desk operational KPIs
 */
export async function fetchFrontDeskKPIs(
  supabase: SupabaseClient,
  propertyId: string
): Promise<FrontDeskKPIStats> {
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Fetch Rooms operational breakdown
  const { data: rooms, error: roomErr } = await supabase
    .from("rooms")
    .select("id, status, is_active")
    .eq("property_id", propertyId);

  if (roomErr) {
    console.error("fetchFrontDeskKPIs rooms error:", roomErr);
  }

  const allRooms = rooms || [];
  const activeRooms = allRooms.filter((r) => r.is_active);
  const sellableRooms = activeRooms.filter(
    (r) => r.status !== "OUT_OF_ORDER" && r.status !== "OUT_OF_SERVICE"
  );
  const occupiedRooms = activeRooms.filter((r) => r.status === "OCCUPIED").length;
  const availableRooms = activeRooms.filter((r) => r.status === "AVAILABLE").length;
  const attentionRooms = activeRooms.filter((r) =>
    ["DIRTY", "CLEANING", "INSPECTION_PENDING", "OUT_OF_ORDER", "OUT_OF_SERVICE"].includes(r.status)
  ).length;

  const totalSellable = sellableRooms.length;
  const occupancyRate = totalSellable > 0 ? Math.round((occupiedRooms / totalSellable) * 100) : 0;

  // 2. Fetch Active Stays for In-House Count and Departures
  const { data: stays, error: stayErr } = await supabase
    .from("stays")
    .select("id, adults, children, expected_check_out_date, status")
    .eq("property_id", propertyId)
    .eq("status", "CHECKED_IN");

  if (stayErr) {
    console.error("fetchFrontDeskKPIs stays error:", stayErr);
  }

  const activeStays = stays || [];
  const inHouseGuests = activeStays.reduce((acc, s) => acc + (s.adults || 1) + (s.children || 0), 0);
  const todayDepartures = activeStays.filter((s) => s.expected_check_out_date <= todayStr).length;

  // 3. Fetch Expected Arrivals for today
  const { data: arrivals, error: arrErr } = await supabase
    .from("reservations")
    .select(`
      id,
      status,
      check_in_date,
      reservation_rooms(id, is_cancelled)
    `)
    .eq("property_id", propertyId)
    .eq("status", "CONFIRMED")
    .eq("check_in_date", todayStr);

  if (arrErr) {
    console.error("fetchFrontDeskKPIs arrivals error:", arrErr);
  }

  // Count active reservation room items arriving today
  let todayArrivals = 0;
  (arrivals || []).forEach((r) => {
    const activeItems = (r.reservation_rooms || []).filter((rr: { is_cancelled: boolean }) => !rr.is_cancelled);
    todayArrivals += Math.max(1, activeItems.length);
  });

  return {
    todayArrivals,
    todayDepartures,
    inHouseGuests,
    occupiedRooms,
    availableRooms,
    attentionRooms,
    totalRooms: activeRooms.length,
    occupancyRate,
  };
}

/**
 * Fetch today's arrivals (reservations scheduled for check-in today)
 */
export async function fetchTodayArrivals(
  supabase: SupabaseClient,
  propertyId: string
): Promise<ArrivalRecord[]> {
  const todayStr = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("reservation_rooms")
    .select(`
      id,
      reservation_id,
      check_in_date,
      check_out_date,
      adults,
      children,
      is_cancelled,
      room_id,
      room_type:room_types(id, name, code),
      room:rooms(id, room_number, status),
      reservation:reservations(
        id,
        confirmation_number,
        status,
        booking_source,
        special_requests,
        primary_guest:guests(id, first_name, last_name, email, phone)
      ),
      stays(id, status)
    `)
    .eq("property_id", propertyId)
    .eq("is_cancelled", false)
    .lte("check_in_date", todayStr)
    .order("check_in_date", { ascending: true });

  if (error) {
    console.error("fetchTodayArrivals error:", error);
    return [];
  }

  interface RawArrivalItem {
    id: string;
    reservation_id: string;
    check_in_date: string;
    check_out_date: string;
    adults: number;
    children: number;
    is_cancelled: boolean;
    room_id: string | null;
    room_type?: { id: string; name: string; code: string };
    room?: { id: string; room_number: string; status: string };
    reservation?: {
      id: string;
      confirmation_number: string;
      status: "CONFIRMED" | "PENDING" | "CANCELLED" | "NO_SHOW" | "COMPLETED";
      booking_source: string;
      special_requests: string | null;
      primary_guest?: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null };
    };
    stays?: Array<{ id: string; status: string }>;
  }

  const rows = (data as unknown as RawArrivalItem[]) || [];

  return rows
    .filter((row) => {
      // Must have active confirmed reservation and not already checked out
      if (!row.reservation || row.reservation.status !== "CONFIRMED") return false;
      const stay = row.stays?.[0];
      // Exclude if already checked out or no-show
      if (stay && (stay.status === "CHECKED_OUT" || stay.status === "NO_SHOW")) return false;
      return true;
    })
    .map((row) => {
      const g = row.reservation?.primary_guest;
      const guestName = g ? `${g.first_name} ${g.last_name}`.trim() : "Guest";
      const stay = row.stays?.[0];

      const checkIn = new Date(row.check_in_date);
      const checkOut = new Date(row.check_out_date);
      const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));

      return {
        reservationRoomId: row.id,
        reservationId: row.reservation_id,
        confirmationNumber: row.reservation!.confirmation_number,
        guestId: g?.id || "",
        guestName,
        guestEmail: g?.email || null,
        guestPhone: g?.phone || null,
        roomTypeId: row.room_type?.id || "",
        roomTypeName: row.room_type?.name || "Standard Room",
        roomTypeCode: row.room_type?.code || "STD",
        roomId: row.room?.id || null,
        roomNumber: row.room?.room_number || null,
        roomStatus: row.room?.status || null,
        checkInDate: row.check_in_date,
        checkOutDate: row.check_out_date,
        nights,
        adults: row.adults,
        children: row.children,
        bookingSource: row.reservation!.booking_source,
        specialRequests: row.reservation!.special_requests,
        status: (row.reservation!.status === "CONFIRMED" ? "CONFIRMED" : "PENDING"),
        stayId: stay?.id || null,
        stayStatus: (stay?.status as ArrivalRecord["stayStatus"]) || null,
      };
    });
}

/**
 * Fetch today's expected departures (active checked-in stays departing today)
 */
export async function fetchTodayDepartures(
  supabase: SupabaseClient,
  propertyId: string
): Promise<DepartureRecord[]> {
  const todayStr = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("stays")
    .select(`
      id,
      reservation_id,
      actual_check_in_at,
      expected_check_out_date,
      adults,
      children,
      status,
      notes,
      guest:guests(id, first_name, last_name),
      room:rooms(
        id,
        room_number,
        room_type:room_types(name)
      ),
      reservation:reservations(confirmation_number)
    `)
    .eq("property_id", propertyId)
    .eq("status", "CHECKED_IN")
    .lte("expected_check_out_date", todayStr)
    .order("expected_check_out_date", { ascending: true });

  if (error) {
    console.error("fetchTodayDepartures error:", error);
    return [];
  }

  interface RawDepartureItem {
    id: string;
    reservation_id: string;
    actual_check_in_at: string;
    expected_check_out_date: string;
    adults: number;
    children: number;
    status: DepartureRecord["status"];
    notes: string | null;
    guest?: { id: string; first_name: string; last_name: string };
    room?: { id: string; room_number: string; room_type?: { name: string } };
    reservation?: { confirmation_number: string };
  }

  const rows = (data as unknown as RawDepartureItem[]) || [];

  return rows.map((r) => {
    const g = r.guest;
    const guestName = g ? `${g.first_name} ${g.last_name}`.trim() : "Guest";

    return {
      stayId: r.id,
      reservationId: r.reservation_id,
      confirmationNumber: r.reservation?.confirmation_number || "REF",
      guestId: g?.id || "",
      guestName,
      roomId: r.room?.id || "",
      roomNumber: r.room?.room_number || "Unassigned",
      roomTypeName: r.room?.room_type?.name || "Room",
      actualCheckInAt: r.actual_check_in_at,
      expectedCheckOutDate: r.expected_check_out_date,
      adults: r.adults,
      children: r.children,
      status: r.status,
      notes: r.notes,
    };
  });
}

/**
 * Fetch all currently in-house checked-in stays
 */
export async function fetchInHouseStays(
  supabase: SupabaseClient,
  propertyId: string
): Promise<InHouseRecord[]> {
  const { data, error } = await supabase
    .from("stays")
    .select(`
      id,
      reservation_id,
      actual_check_in_at,
      expected_check_out_date,
      adults,
      children,
      status,
      notes,
      guest:guests(id, first_name, last_name, phone),
      room:rooms(
        id,
        room_number,
        room_type:room_types(name)
      ),
      reservation:reservations(confirmation_number)
    `)
    .eq("property_id", propertyId)
    .eq("status", "CHECKED_IN")
    .order("actual_check_in_at", { ascending: false });

  if (error) {
    console.error("fetchInHouseStays error:", error);
    return [];
  }

  interface RawInHouseItem {
    id: string;
    reservation_id: string;
    actual_check_in_at: string;
    expected_check_out_date: string;
    adults: number;
    children: number;
    status: InHouseRecord["status"];
    notes: string | null;
    guest?: { id: string; first_name: string; last_name: string; phone: string | null };
    room?: { id: string; room_number: string; room_type?: { name: string } };
    reservation?: { confirmation_number: string };
  }

  const rows = (data as unknown as RawInHouseItem[]) || [];

  return rows.map((r) => {
    const g = r.guest;
    const guestName = g ? `${g.first_name} ${g.last_name}`.trim() : "Guest";

    return {
      stayId: r.id,
      reservationId: r.reservation_id,
      confirmationNumber: r.reservation?.confirmation_number || "REF",
      guestId: g?.id || "",
      guestName,
      guestPhone: g?.phone || null,
      roomId: r.room?.id || "",
      roomNumber: r.room?.room_number || "Unassigned",
      roomTypeName: r.room?.room_type?.name || "Room",
      actualCheckInAt: r.actual_check_in_at,
      expectedCheckOutDate: r.expected_check_out_date,
      adults: r.adults,
      children: r.children,
      status: r.status,
      notes: r.notes,
    };
  });
}

/**
 * Fetch a single stay profile by stayId
 */
export async function fetchStayById(
  supabase: SupabaseClient,
  propertyId: string,
  stayId: string
): Promise<Stay | null> {
  const { data, error } = await supabase
    .from("stays")
    .select(`
      id,
      property_id,
      reservation_id,
      reservation_room_id,
      guest_id,
      room_id,
      status,
      actual_check_in_at,
      actual_check_out_at,
      expected_check_out_date,
      adults,
      children,
      notes,
      check_in_by,
      check_out_by,
      created_at,
      updated_at,
      created_by,
      updated_by,
      guest:guests(id, first_name, last_name, email, phone, country_code, nationality),
      room:rooms(
        id,
        room_number,
        room_name,
        status,
        housekeeping_status,
        room_type:room_types(id, name, code)
      ),
      reservation:reservations(
        id,
        confirmation_number,
        status,
        check_in_date,
        check_out_date,
        booking_source,
        special_requests,
        internal_notes
      )
    `)
    .eq("property_id", propertyId)
    .eq("id", stayId)
    .maybeSingle();

  if (error) {
    console.error("fetchStayById error:", error);
    return null;
  }

  return (data as unknown as Stay) || null;
}

/**
 * Fetch rooms needing front desk attention (dirty, cleaning, out of order)
 */
export async function fetchRoomAttentionList(
  supabase: SupabaseClient,
  propertyId: string
): Promise<RoomAttentionRecord[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select(`
      id,
      room_number,
      room_name,
      status,
      housekeeping_status,
      room_type:room_types(name),
      floor:floors(name)
    `)
    .eq("property_id", propertyId)
    .eq("is_active", true)
    .in("status", ["DIRTY", "CLEANING", "INSPECTION_PENDING", "OUT_OF_ORDER", "OUT_OF_SERVICE"])
    .order("room_number", { ascending: true })
    .limit(10);

  if (error) {
    console.error("fetchRoomAttentionList error:", error);
    return [];
  }

  interface RawAttentionRoom {
    id: string;
    room_number: string;
    room_name: string | null;
    status: string;
    housekeeping_status: string;
    room_type?: { name: string };
    floor?: { name: string };
  }

  const rows = (data as unknown as RawAttentionRoom[]) || [];

  return rows.map((r) => ({
    roomId: r.id,
    roomNumber: r.room_number,
    roomName: r.room_name,
    roomTypeName: r.room_type?.name || "Standard",
    floorName: r.floor?.name || null,
    status: r.status,
    housekeepingStatus: r.housekeeping_status,
  }));
}
