// ============================================================
// STAYHUB RESERVATION & BOOKING QUERIES (Phase 7)
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Reservation,
  BookingKPIStats,
  BookingFilterOptions,
  RoomTypeAvailability,
} from "./types";

interface RawReservationRow {
  id: string;
  property_id: string;
  confirmation_number: string;
  status: Reservation["status"];
  booking_source: Reservation["booking_source"];
  booked_at: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  special_requests: string | null;
  internal_notes: string | null;
  primary_guest_id: string;
  total_amount: number | string;
  currency: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  primary_guest?: {
    id: string;
    property_id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    country_code: string | null;
    nationality: string | null;
    date_of_birth: string | null;
    notes: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  };
  reservation_rooms?: {
    id: string;
    reservation_id: string;
    property_id: string;
    room_type_id: string;
    room_id: string | null;
    check_in_date: string;
    check_out_date: string;
    is_cancelled: boolean;
    adults: number;
    children: number;
    nightly_rate: number | string;
    total_amount: number | string;
    currency: string;
    created_at: string;
    updated_at: string;
    room_type?: {
      name: string;
      code: string;
    };
    room?: {
      room_number: string;
      room_name: string | null;
    };
    stays?: {
      id: string;
      status: "EXPECTED" | "CHECKED_IN" | "CHECKED_OUT" | "NO_SHOW" | "CANCELLED";
      actual_check_in_at: string | null;
      actual_check_out_at: string | null;
      room_id: string;
    }[];
  }[];
}

/**
 * Fetch paginated, filtered, searched reservations for the active property
 */
export async function fetchBookings(
  supabase: SupabaseClient,
  propertyId: string,
  options: BookingFilterOptions = {}
): Promise<{ reservations: Reservation[]; total: number; page: number; pageSize: number }> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("reservations")
    .select(
      `
      *,
      primary_guest:guests(*),
      reservation_rooms(
        *,
        room_type:room_types(name, code),
        room:rooms(room_number, room_name),
        stays:stays(id, status, actual_check_in_at, actual_check_out_at, room_id)
      )
    `,
      { count: "exact" }
    )
    .eq("property_id", propertyId);

  // Status Filter
  if (options.status && options.status !== "ALL") {
    query = query.eq("status", options.status);
  }

  // Booking Source Filter
  if (options.bookingSource && options.bookingSource !== "ALL") {
    query = query.eq("booking_source", options.bookingSource);
  }

  // Date Range Presets
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  if (options.datePreset === "TODAY") {
    query = query.or(`check_in_date.eq.${todayStr},check_out_date.eq.${todayStr}`);
  } else if (options.datePreset === "TOMORROW") {
    const tomorrow = new Date(now.getTime() + 86400000);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    query = query.or(`check_in_date.eq.${tomorrowStr},check_out_date.eq.${tomorrowStr}`);
  } else if (options.datePreset === "NEXT_7_DAYS") {
    const nextWeek = new Date(now.getTime() + 7 * 86400000);
    const nextWeekStr = nextWeek.toISOString().split("T")[0];
    query = query.gte("check_in_date", todayStr).lte("check_in_date", nextWeekStr);
  } else if (options.datePreset === "NEXT_30_DAYS") {
    const nextMonth = new Date(now.getTime() + 30 * 86400000);
    const nextMonthStr = nextMonth.toISOString().split("T")[0];
    query = query.gte("check_in_date", todayStr).lte("check_in_date", nextMonthStr);
  } else if (options.datePreset === "CUSTOM" && options.startDate && options.endDate) {
    query = query.gte("check_in_date", options.startDate).lte("check_out_date", options.endDate);
  }

  // Search Filter
  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    query = query.ilike("confirmation_number", `%${term}%`);
  }

  // Ordering and pagination
  query = query.order("check_in_date", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error("fetchBookings error:", error);
    throw new Error(`Failed to load reservations: ${error.message}`);
  }

  const rawRows = (data as unknown as RawReservationRow[]) || [];
  const reservations: Reservation[] = rawRows.map((r) => {
    const checkIn = new Date(r.check_in_date);
    const checkOut = new Date(r.check_out_date);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));

    return {
      ...r,
      total_amount: Number(r.total_amount),
      nights,
      rooms: (r.reservation_rooms || []).map((rr) => {
        const stayRecord = rr.stays && rr.stays.length > 0 ? rr.stays[0] : null;
        return {
          ...rr,
          nightly_rate: Number(rr.nightly_rate),
          total_amount: Number(rr.total_amount),
          room_type_name: rr.room_type?.name,
          room_type_code: rr.room_type?.code,
          room_number: rr.room?.room_number,
          room_name: rr.room?.room_name,
          stay: stayRecord,
        };
      }),
    };
  });

  return {
    reservations,
    total: count || 0,
    page,
    pageSize,
  };
}

/**
 * Fetch a single reservation by ID with full guest and room associations
 */
export async function fetchBookingById(
  supabase: SupabaseClient,
  propertyId: string,
  bookingId: string
): Promise<Reservation | null> {
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      *,
      primary_guest:guests(*),
      reservation_rooms(
        *,
        room_type:room_types(*),
        room:rooms(id, room_number, room_name, floor_id, status),
        stays:stays(id, status, actual_check_in_at, actual_check_out_at, room_id)
      )
    `
    )
    .eq("property_id", propertyId)
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("fetchBookingById error:", error);
    throw new Error(`Failed to fetch reservation: ${error.message}`);
  }

  if (!data) return null;

  const r = data as unknown as RawReservationRow;
  const checkIn = new Date(r.check_in_date);
  const checkOut = new Date(r.check_out_date);
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));

  return {
    ...r,
    total_amount: Number(r.total_amount),
    nights,
    rooms: (r.reservation_rooms || []).map((rr) => {
      const stayRecord = rr.stays && rr.stays.length > 0 ? rr.stays[0] : null;
      return {
        ...rr,
        nightly_rate: Number(rr.nightly_rate),
        total_amount: Number(rr.total_amount),
        room_type_name: rr.room_type?.name,
        room_type_code: rr.room_type?.code,
        room_number: rr.room?.room_number,
        room_name: rr.room?.room_name,
        stay: stayRecord,
      };
    }),
  };
}

/**
 * Fetch reservation operational KPI statistics for active property
 */
export async function fetchBookingKPIStats(
  supabase: SupabaseClient,
  propertyId: string
): Promise<BookingKPIStats> {
  const todayStr = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("reservations")
    .select("status, check_in_date, check_out_date")
    .eq("property_id", propertyId);

  if (error) {
    console.error("fetchBookingKPIStats error:", error);
    return {
      todayArrivals: 0,
      todayDepartures: 0,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      activeStays: 0,
      totalBookings: 0,
    };
  }

  let todayArrivals = 0;
  let todayDepartures = 0;
  let confirmed = 0;
  let pending = 0;
  let cancelled = 0;
  let activeStays = 0;

  for (const r of data || []) {
    if (r.status === "CONFIRMED") confirmed++;
    if (r.status === "PENDING") pending++;
    if (r.status === "CANCELLED") cancelled++;

    // Operational expected arrivals and departures
    if (r.status !== "CANCELLED") {
      if (r.check_in_date === todayStr) {
        todayArrivals++;
      }
      if (r.check_out_date === todayStr) {
        todayDepartures++;
      }
      // Ongoing reservation night
      if (r.check_in_date <= todayStr && r.check_out_date > todayStr) {
        activeStays++;
      }
    }
  }

  return {
    todayArrivals,
    todayDepartures,
    confirmed,
    pending,
    cancelled,
    activeStays,
    totalBookings: data?.length || 0,
  };
}

/**
 * Get available physical rooms for specific dates and room category
 */
export async function getAvailableRooms(
  supabase: SupabaseClient,
  propertyId: string,
  checkInDate: string,
  checkOutDate: string,
  roomTypeId?: string
): Promise<{ id: string; room_number: string; room_name: string | null; room_type_id: string }[]> {
  // 1. Fetch active, operational rooms
  let roomQuery = supabase
    .from("rooms")
    .select("id, room_number, room_name, room_type_id")
    .eq("property_id", propertyId)
    .eq("is_active", true)
    .not("status", "in", '("OUT_OF_ORDER","OUT_OF_SERVICE")');

  if (roomTypeId) {
    roomQuery = roomQuery.eq("room_type_id", roomTypeId);
  }

  const { data: allRooms, error: roomErr } = await roomQuery;
  if (roomErr) throw new Error(`Failed to query rooms: ${roomErr.message}`);

  if (!allRooms || allRooms.length === 0) return [];

  // 2. Query overlapping reservation rooms
  // Overlap condition: check_in_date < checkOutDate AND check_out_date > checkInDate
  const { data: bookedRooms, error: bookedErr } = await supabase
    .from("reservation_rooms")
    .select("room_id")
    .eq("property_id", propertyId)
    .eq("is_cancelled", false)
    .not("room_id", "is", null)
    .lt("check_in_date", checkOutDate)
    .gt("check_out_date", checkInDate);

  if (bookedErr) throw new Error(`Failed to check conflicts: ${bookedErr.message}`);

  const bookedRoomIds = new Set((bookedRooms || []).map((b) => b.room_id));
  return allRooms.filter((r) => !bookedRoomIds.has(r.id));
}

/**
 * Room Type Availability: count total, reserved, and available rooms per category
 */
export async function getRoomTypeAvailability(
  supabase: SupabaseClient,
  propertyId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<RoomTypeAvailability[]> {
  // Fetch all room types
  const { data: types, error: typesErr } = await supabase
    .from("room_types")
    .select("id, name, code, base_rate, currency, max_occupancy")
    .eq("property_id", propertyId)
    .eq("is_active", true);

  if (typesErr) throw new Error(`Failed to load room types: ${typesErr.message}`);
  if (!types || types.length === 0) return [];

  // Fetch all active rooms
  const { data: rooms, error: roomsErr } = await supabase
    .from("rooms")
    .select("id, room_number, room_name, room_type_id, status, floor:floors(name)")
    .eq("property_id", propertyId)
    .eq("is_active", true);

  if (roomsErr) throw new Error(`Failed to load rooms: ${roomsErr.message}`);

  // Fetch all overlapping bookings (both assigned rooms and unassigned counts)
  const { data: bookedItems, error: bookedErr } = await supabase
    .from("reservation_rooms")
    .select("room_id, room_type_id")
    .eq("property_id", propertyId)
    .eq("is_cancelled", false)
    .lt("check_in_date", checkOutDate)
    .gt("check_out_date", checkInDate);

  if (bookedErr) throw new Error(`Failed to load booked items: ${bookedErr.message}`);

  const bookedRoomIds = new Set(
    (bookedItems || []).filter((b) => b.room_id !== null).map((b) => b.room_id)
  );

  return types.map((t) => {
    const typeRooms = (rooms || []).filter((r) => r.room_type_id === t.id);
    const operationalRooms = typeRooms.filter(
      (r) => r.status !== "OUT_OF_ORDER" && r.status !== "OUT_OF_SERVICE"
    );

    // Reserved count for this type = physical booked + unassigned booked
    const reservedForType = (bookedItems || []).filter((b) => b.room_type_id === t.id).length;

    // Available physical rooms
    const availablePhysical = operationalRooms.filter((r) => !bookedRoomIds.has(r.id));

    const totalRooms = operationalRooms.length;
    const availableRooms = Math.max(0, totalRooms - reservedForType);

    return {
      roomTypeId: t.id,
      roomTypeName: t.name,
      roomTypeCode: t.code,
      baseRate: Number(t.base_rate),
      currency: t.currency,
      maxOccupancy: t.max_occupancy,
      totalRooms,
      availableRooms,
      reservedRooms: reservedForType,
      physicalRooms: availablePhysical.map((r) => {
        const floorObj = r.floor as unknown as { name?: string } | null;
        return {
          id: r.id,
          room_number: r.room_number,
          room_name: r.room_name,
          status: r.status,
          floor_name: floorObj?.name || null,
        };
      }),
    };
  });
}

/**
 * Fetch calendar bookings for tape chart view
 */
export async function fetchCalendarBookings(
  supabase: SupabaseClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<
  {
    id: string;
    confirmationNumber: string;
    status: Reservation["status"];
    guestName: string;
    roomId: string;
    roomNumber: string;
    checkInDate: string;
    checkOutDate: string;
  }[]
> {
  const { data, error } = await supabase
    .from("reservation_rooms")
    .select(
      `
      id,
      room_id,
      check_in_date,
      check_out_date,
      is_cancelled,
      room:rooms(room_number),
      reservation:reservations(
        id,
        confirmation_number,
        status,
        primary_guest:guests(first_name, last_name)
      )
    `
    )
    .eq("property_id", propertyId)
    .eq("is_cancelled", false)
    .not("room_id", "is", null)
    .lt("check_in_date", endDate)
    .gt("check_out_date", startDate);

  if (error) {
    console.error("fetchCalendarBookings error:", error);
    return [];
  }

  interface CalendarRawItem {
    id: string;
    room_id: string;
    check_in_date: string;
    check_out_date: string;
    room?: { room_number: string };
    reservation?: {
      id: string;
      confirmation_number: string;
      status: Reservation["status"];
      primary_guest?: { first_name: string; last_name: string };
    };
  }

  const rawItems = (data as unknown as CalendarRawItem[]) || [];

  return rawItems
    .filter((i) => i.reservation && i.room)
    .map((i) => {
      const g = i.reservation?.primary_guest;
      return {
        id: i.reservation!.id,
        confirmationNumber: i.reservation!.confirmation_number,
        status: i.reservation!.status,
        guestName: g ? `${g.first_name} ${g.last_name}`.trim() : "Guest",
        roomId: i.room_id,
        roomNumber: i.room!.room_number,
        checkInDate: i.check_in_date,
        checkOutDate: i.check_out_date,
      };
    });
}
