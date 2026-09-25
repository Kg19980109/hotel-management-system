// ============================================================
// STAYHUB GUEST CRM & PROFILE QUERIES (Phase 9)
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GuestCRM,
  GuestStatus,
  GuestKPIStats,
  GuestFilterOptions,
  DuplicateGuestCandidate,
  GuestStats,
  GuestPreference,
  GuestNote,
  GuestReservationItem,
  GuestStayItem,
} from "./types";

interface RawStayRecord {
  id: string;
  status: string;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  expected_check_out_date: string;
  room?: {
    room_number?: string;
    status?: string;
    room_type?: { name?: string };
  } | null;
  reservation?: { confirmation_number?: string } | null;
}

interface RawReservationRecord {
  id: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  confirmation_number?: string;
  booking_source?: string;
  total_amount?: number;
  currency?: string;
  created_at?: string;
  reservation_rooms?: {
    room_type?: { name?: string; code?: string };
    room?: { room_number?: string };
  }[];
}

interface RawGuestRecord {
  id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  status: string;
  company_name?: string | null;
  created_at: string;
}

/**
 * Fetch paginated, filtered, searched guests for the active property
 */
export async function fetchGuests(
  supabase: SupabaseClient,
  propertyId: string,
  options: GuestFilterOptions = {}
): Promise<{ guests: GuestCRM[]; total: number; page: number; pageSize: number }> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("guests")
    .select(
      `
      *,
      reservations:reservations(id, status, check_in_date, check_out_date),
      stays:stays(id, status, actual_check_in_at, actual_check_out_at, room_id, room:rooms(room_number))
    `,
      { count: "exact" }
    )
    .eq("property_id", propertyId);

  // Status Filter
  if (options.status && options.status !== "ALL") {
    query = query.or(`status.eq.${options.status},status.eq.${options.status.toLowerCase()}`);
  }

  // Nationality Filter
  if (options.nationality && options.nationality !== "ALL") {
    query = query.eq("nationality", options.nationality);
  }

  // Search Filter (first_name, last_name, email, phone, company_name)
  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,company_name.ilike.%${term}%`
    );
  }

  // Ordering and pagination
  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error("fetchGuests error:", error);
    throw new Error(`Failed to load guests: ${error.message}`);
  }

  const rawRows = (data as (GuestCRM & { stays?: RawStayRecord[]; reservations?: RawReservationRecord[] })[]) || [];
  const guests: GuestCRM[] = rawRows.map((g) => {
    const stays = g.stays || [];
    const reservations = g.reservations || [];
    const completedStays = stays.filter((s) => s.status === "CHECKED_OUT").length;
    const currentStayRecord = stays.find((s) => s.status === "CHECKED_IN");

    let totalNights = 0;
    reservations.forEach((r) => {
      if (r.check_in_date && r.check_out_date && r.status !== "CANCELLED") {
        const diffDays = Math.max(
          1,
          Math.round(
            (new Date(r.check_out_date).getTime() - new Date(r.check_in_date).getTime()) / 86400000
          )
        );
        totalNights += diffDays;
      }
    });

    const isReturning = completedStays > 0 || reservations.length > 1;

    return {
      ...g,
      status: (g.status?.toUpperCase() || "ACTIVE") as GuestStatus,
      stats: {
        totalVisits: stays.length || reservations.length,
        totalStays: stays.length,
        completedStays,
        cancelledReservations: reservations.filter((r) => r.status === "CANCELLED").length,
        noShows: reservations.filter((r) => r.status === "NO_SHOW").length,
        totalNights,
        firstVisitDate: reservations[reservations.length - 1]?.check_in_date || null,
        lastVisitDate: reservations[0]?.check_in_date || null,
        isReturning,
      },
      current_stay: currentStayRecord
        ? {
            id: currentStayRecord.id,
            room_number: currentStayRecord.room?.room_number || "Assigned",
            room_type_name: "",
            actual_check_in_at: currentStayRecord.actual_check_in_at || "",
            expected_check_out_date: currentStayRecord.expected_check_out_date,
            status: currentStayRecord.status,
          }
        : null,
    };
  });

  return {
    guests,
    total: count || 0,
    page,
    pageSize,
  };
}

/**
 * Fetch CRM Metrics: Total Guests, Active Guests, Returning Guests, In-House, Arrivals, Departures
 */
export async function fetchGuestKPIs(
  supabase: SupabaseClient,
  propertyId: string
): Promise<GuestKPIStats> {
  const todayStr = new Date().toISOString().split("T")[0];

  const [guestsRes, inHouseRes, arrivalsRes, departuresRes] = await Promise.allSettled([
    supabase
      .from("guests")
      .select("id, status, stays:stays(status), reservations:reservations(id, status)")
      .eq("property_id", propertyId),

    // Currently In-House
    supabase
      .from("stays")
      .select("id")
      .eq("property_id", propertyId)
      .eq("status", "CHECKED_IN"),

    // Arriving Today
    supabase
      .from("reservations")
      .select("id")
      .eq("property_id", propertyId)
      .eq("check_in_date", todayStr)
      .in("status", ["CONFIRMED", "PENDING"]),

    // Departing Today
    supabase
      .from("stays")
      .select("id")
      .eq("property_id", propertyId)
      .eq("expected_check_out_date", todayStr)
      .eq("status", "CHECKED_IN"),
  ]);

  let totalGuests = 0;
  let activeGuests = 0;
  let returningGuests = 0;

  if (guestsRes.status === "fulfilled" && guestsRes.value.data) {
    const list = guestsRes.value.data as {
      id: string;
      status: string;
      stays?: { status: string }[];
      reservations?: { id: string; status: string }[];
    }[];
    totalGuests = list.length;
    list.forEach((g) => {
      const st = g.status?.toUpperCase();
      if (st === "ACTIVE") activeGuests++;
      const completedCount = (g.stays || []).filter((s) => s.status === "CHECKED_OUT").length;
      if (completedCount > 0 || (g.reservations || []).length > 1) {
        returningGuests++;
      }
    });
  }

  const currentlyInHouse = inHouseRes.status === "fulfilled" ? inHouseRes.value.data?.length || 0 : 0;
  const arrivingToday = arrivalsRes.status === "fulfilled" ? arrivalsRes.value.data?.length || 0 : 0;
  const departingToday = departuresRes.status === "fulfilled" ? departuresRes.value.data?.length || 0 : 0;

  return {
    totalGuests,
    activeGuests,
    returningGuests,
    currentlyInHouse,
    arrivingToday,
    departingToday,
  };
}

/**
 * Fetch a single guest profile with preferences, internal notes, reservation history, and stays
 */
export async function fetchGuestById(
  supabase: SupabaseClient,
  propertyId: string,
  guestId: string
): Promise<GuestCRM | null> {
  const { data: guest, error } = await supabase
    .from("guests")
    .select("*")
    .eq("property_id", propertyId)
    .eq("id", guestId)
    .maybeSingle();

  if (error || !guest) {
    console.error("fetchGuestById error:", error);
    return null;
  }

  // Fetch child datasets concurrently
  const [prefRes, notesRes, resRes, staysRes] = await Promise.allSettled([
    supabase
      .from("guest_preferences")
      .select("*")
      .eq("property_id", propertyId)
      .eq("guest_id", guestId)
      .order("created_at", { ascending: false }),

    supabase
      .from("guest_notes")
      .select("*")
      .eq("property_id", propertyId)
      .eq("guest_id", guestId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase
      .from("reservations")
      .select(`
        *,
        reservation_rooms:reservation_rooms(
          room_type:room_types(name, code),
          room:rooms(room_number)
        )
      `)
      .eq("property_id", propertyId)
      .eq("primary_guest_id", guestId)
      .order("check_in_date", { ascending: false }),

    supabase
      .from("stays")
      .select(`
        *,
        room:rooms(room_number, status),
        reservation:reservations(confirmation_number)
      `)
      .eq("property_id", propertyId)
      .eq("guest_id", guestId)
      .order("actual_check_in_at", { ascending: false }),
  ]);

  const preferences: GuestPreference[] = prefRes.status === "fulfilled" ? (prefRes.value.data as GuestPreference[]) || [] : [];
  const guestNotes: GuestNote[] = notesRes.status === "fulfilled" ? (notesRes.value.data as GuestNote[]) || [] : [];
  const reservations: RawReservationRecord[] = resRes.status === "fulfilled" ? (resRes.value.data as RawReservationRecord[]) || [] : [];
  const stays: RawStayRecord[] = staysRes.status === "fulfilled" ? (staysRes.value.data as RawStayRecord[]) || [] : [];

  // Compute statistics
  const completedStays = stays.filter((s) => s.status === "CHECKED_OUT").length;
  const cancelledRes = reservations.filter((r) => r.status === "CANCELLED").length;
  const noShowRes = reservations.filter((r) => r.status === "NO_SHOW").length;

  let totalNights = 0;
  reservations.forEach((r) => {
    if (r.check_in_date && r.check_out_date && r.status !== "CANCELLED") {
      const diffDays = Math.max(
        1,
        Math.round(
          (new Date(r.check_out_date).getTime() - new Date(r.check_in_date).getTime()) / 86400000
        )
      );
      totalNights += diffDays;
    }
  });

  const activeStay = stays.find((s) => s.status === "CHECKED_IN");
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingRes = reservations.find(
    (r) => r.status === "CONFIRMED" && r.check_in_date >= todayStr
  );

  const stats: GuestStats = {
    totalVisits: stays.length || reservations.length,
    totalStays: stays.length,
    completedStays,
    cancelledReservations: cancelledRes,
    noShows: noShowRes,
    totalNights,
    firstVisitDate: reservations[reservations.length - 1]?.check_in_date || null,
    lastVisitDate: reservations[0]?.check_in_date || null,
    isReturning: completedStays > 0 || reservations.length > 1,
  };

  return {
    ...guest,
    status: (guest.status?.toUpperCase() || "ACTIVE") as GuestStatus,
    preferences,
    guest_notes: guestNotes,
    reservations: reservations as unknown as GuestReservationItem[],
    stays: stays as unknown as GuestStayItem[],
    stats,
    current_stay: activeStay
      ? {
          id: activeStay.id,
          room_number: activeStay.room?.room_number || "N/A",
          room_type_name: "",
          actual_check_in_at: activeStay.actual_check_in_at || "",
          expected_check_out_date: activeStay.expected_check_out_date,
          status: activeStay.status,
        }
      : null,
    upcoming_reservation: upcomingRes
      ? {
          id: upcomingRes.id,
          confirmation_number: upcomingRes.confirmation_number || "",
          check_in_date: upcomingRes.check_in_date,
          check_out_date: upcomingRes.check_out_date,
          room_type_name: upcomingRes.reservation_rooms?.[0]?.room_type?.name,
          status: upcomingRes.status,
        }
      : null,
  };
}

/**
 * Fast search guests for autocomplete combobox (used in bookings & front desk)
 */
export async function searchGuests(
  supabase: SupabaseClient,
  propertyId: string,
  query: string,
  limit = 8
): Promise<GuestCRM[]> {
  if (!query || !query.trim()) {
    const { data } = await supabase
      .from("guests")
      .select("id, first_name, last_name, email, phone, nationality, status, company_name")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as unknown as GuestCRM[]) || [];
  }

  const term = query.trim();
  const { data, error } = await supabase
    .from("guests")
    .select("id, first_name, last_name, email, phone, nationality, status, company_name")
    .eq("property_id", propertyId)
    .or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,company_name.ilike.%${term}%`
    );

  if (error) {
    console.error("searchGuests error:", error);
    return [];
  }

  return (data as unknown as GuestCRM[]) || [];
}

/**
 * Duplicate Guest Detection: identifies existing guests matching email, phone, or full name
 */
export async function checkDuplicateGuests(
  supabase: SupabaseClient,
  propertyId: string,
  criteria: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    excludeGuestId?: string | null;
  }
): Promise<DuplicateGuestCandidate[]> {
  const { email, phone, firstName, lastName, excludeGuestId } = criteria;
  const candidatesMap = new Map<string, DuplicateGuestCandidate>();

  const trimmedEmail = email?.trim()?.toLowerCase();
  const trimmedPhone = phone?.trim();
  const trimmedFirst = firstName?.trim()?.toLowerCase();
  const trimmedLast = lastName?.trim()?.toLowerCase();

  // 1. Search matching email
  if (trimmedEmail) {
    let emailQuery = supabase
      .from("guests")
      .select("id, first_name, last_name, email, phone, nationality, status, created_at")
      .eq("property_id", propertyId)
      .ilike("email", trimmedEmail);

    if (excludeGuestId) emailQuery = emailQuery.neq("id", excludeGuestId);

    const { data: emailMatches } = await emailQuery;
    const emailRows = (emailMatches as unknown as RawGuestRecord[]) || [];
    emailRows.forEach((g) => {
      candidatesMap.set(g.id, {
        id: g.id,
        first_name: g.first_name,
        last_name: g.last_name,
        email: g.email,
        phone: g.phone,
        nationality: g.nationality,
        status: (g.status?.toUpperCase() || "ACTIVE") as GuestStatus,
        created_at: g.created_at,
        matchReasons: ["email"],
      });
    });
  }

  // 2. Search matching phone
  if (trimmedPhone) {
    let phoneQuery = supabase
      .from("guests")
      .select("id, first_name, last_name, email, phone, nationality, status, created_at")
      .eq("property_id", propertyId)
      .eq("phone", trimmedPhone);

    if (excludeGuestId) phoneQuery = phoneQuery.neq("id", excludeGuestId);

    const { data: phoneMatches } = await phoneQuery;
    const phoneRows = (phoneMatches as unknown as RawGuestRecord[]) || [];
    phoneRows.forEach((g) => {
      const existing = candidatesMap.get(g.id);
      if (existing) {
        if (!existing.matchReasons.includes("phone")) existing.matchReasons.push("phone");
      } else {
        candidatesMap.set(g.id, {
          id: g.id,
          first_name: g.first_name,
          last_name: g.last_name,
          email: g.email,
          phone: g.phone,
          nationality: g.nationality,
          status: (g.status?.toUpperCase() || "ACTIVE") as GuestStatus,
          created_at: g.created_at,
          matchReasons: ["phone"],
        });
      }
    });
  }

  // 3. Search matching full name
  if (trimmedFirst && trimmedLast) {
    let nameQuery = supabase
      .from("guests")
      .select("id, first_name, last_name, email, phone, nationality, status, created_at")
      .eq("property_id", propertyId)
      .ilike("first_name", trimmedFirst)
      .ilike("last_name", trimmedLast);

    if (excludeGuestId) nameQuery = nameQuery.neq("id", excludeGuestId);

    const { data: nameMatches } = await nameQuery;
    const nameRows = (nameMatches as unknown as RawGuestRecord[]) || [];
    nameRows.forEach((g) => {
      const existing = candidatesMap.get(g.id);
      if (existing) {
        if (!existing.matchReasons.includes("name")) existing.matchReasons.push("name");
      } else {
        candidatesMap.set(g.id, {
          id: g.id,
          first_name: g.first_name,
          last_name: g.last_name,
          email: g.email,
          phone: g.phone,
          nationality: g.nationality,
          status: (g.status?.toUpperCase() || "ACTIVE") as GuestStatus,
          created_at: g.created_at,
          matchReasons: ["name"],
        });
      }
    });
  }

  return Array.from(candidatesMap.values());
}
