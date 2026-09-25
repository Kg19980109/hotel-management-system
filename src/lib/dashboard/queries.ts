/**
 * STAYHUB - Dashboard Query Functions
 * Phase 5: Real Hotel Dashboard & Metrics Engine
 * 
 * Centralized database query layer running against Supabase PostgreSQL with RLS.
 * Handles existing tables and gracefully degrades for future module tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PropertyContextInfo,
  RoomStatusSummary,
  ArrivalItem,
  DepartureItem,
  AttentionItem,
  ActivityItem,
  DashboardMetrics,
} from "./types";

/**
 * Fetch property details with RLS enforcement
 */
export async function queryPropertyDetails(
  supabase: SupabaseClient,
  propertyId: string
): Promise<PropertyContextInfo | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, slug, city, state, country, currency, timezone")
    .eq("id", propertyId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    city: data.city,
    state: data.state,
    country: data.country,
    currency: data.currency || "INR",
    timezone: data.timezone || "Asia/Kolkata",
  };
}

/**
 * Query room inventory summary.
 * In Phase 5, rooms table does not exist yet. This query safely checks or degrades
 * so future Phase 6 (Room Management) can immediately populate this.
 */
export async function queryRoomInventorySummary(
  supabase: SupabaseClient,
  propertyId: string
): Promise<RoomStatusSummary> {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, status, housekeeping_status, is_active")
      .eq("property_id", propertyId);

    if (error || !data || data.length === 0) {
      // Room inventory not configured yet
      return {
        total: 0,
        available: 0,
        occupied: 0,
        dirty: 0,
        maintenance: 0,
        outOfOrder: 0,
        isConfigured: false,
      };
    }

    const total = data.length;
    let available = 0;
    let occupied = 0;
    let dirty = 0;
    let maintenance = 0;
    let outOfOrder = 0;

    for (const room of data as Array<{
      status: string;
      housekeeping_status?: string;
      is_active?: boolean;
    }>) {
      if (room.is_active === false) {
        continue;
      }

      const statusUpper = (room.status || "").toUpperCase();
      const hkUpper = (room.housekeeping_status || "").toUpperCase();

      if (statusUpper === "AVAILABLE") available++;
      else if (statusUpper === "OCCUPIED") occupied++;
      else if (statusUpper === "OUT_OF_ORDER" || statusUpper === "OUT_OF_SERVICE") {
        outOfOrder++;
        maintenance++;
      }

      if (hkUpper === "DIRTY") dirty++;
      else if (hkUpper === "CLEANING" || statusUpper === "CLEANING") maintenance++;
    }

    return {
      total,
      available,
      occupied,
      dirty,
      maintenance,
      outOfOrder,
      isConfigured: true,
    };
  } catch {
    // Safe fallback if table doesn't exist
    return {
      total: 0,
      available: 0,
      occupied: 0,
      dirty: 0,
      maintenance: 0,
      outOfOrder: 0,
      isConfigured: false,
    };
  }
}

/**
 * Query today's expected arrivals from real reservations.
 */
export async function queryTodayArrivals(
  supabase: SupabaseClient,
  propertyId: string,
  timezone: string
): Promise<ArrivalItem[]> {
  void timezone;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,
        confirmation_number,
        status,
        check_in_date,
        primary_guest:guests(first_name, last_name),
        reservation_rooms(
          room:rooms(room_number),
          room_type:room_types(name)
        )
      `)
      .eq("property_id", propertyId)
      .eq("check_in_date", todayStr)
      .in("status", ["CONFIRMED", "PENDING"])
      .order("created_at", { ascending: true })
      .limit(10);

    if (error || !data) {
      return [];
    }

    interface ResArrivalRow {
      id: string;
      confirmation_number: string;
      status: string;
      primary_guest?: { first_name: string; last_name: string };
      reservation_rooms?: Array<{
        room?: { room_number: string };
        room_type?: { name: string };
      }>;
    }

    const rows = data as unknown as ResArrivalRow[];

    return rows.map((b) => {
      const g = b.primary_guest;
      const guestName = g ? `${g.first_name} ${g.last_name}`.trim() : "Guest";
      const roomNum = b.reservation_rooms?.[0]?.room?.room_number || "Unassigned";
      const roomType = b.reservation_rooms?.[0]?.room_type?.name || "Standard";

      return {
        id: b.id,
        guestName,
        bookingReference: b.confirmation_number,
        roomNumber: roomNum,
        roomType,
        arrivalTime: "14:00",
        status: (b.status === "CANCELLED" ? "cancelled" : "confirmed") as ArrivalItem["status"],
        paymentStatus: "unpaid",
      };
    });
  } catch {
    return [];
  }
}

/**
 * Query today's expected departures from real reservations.
 */
export async function queryTodayDepartures(
  supabase: SupabaseClient,
  propertyId: string,
  timezone: string
): Promise<DepartureItem[]> {
  void timezone;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,
        confirmation_number,
        status,
        check_out_date,
        total_amount,
        primary_guest:guests(first_name, last_name),
        reservation_rooms(
          room:rooms(room_number)
        )
      `)
      .eq("property_id", propertyId)
      .eq("check_out_date", todayStr)
      .in("status", ["CONFIRMED", "PENDING"])
      .order("created_at", { ascending: true })
      .limit(10);

    if (error || !data) {
      return [];
    }

    interface ResDepartureRow {
      id: string;
      confirmation_number: string;
      status: string;
      total_amount: number | string;
      primary_guest?: { first_name: string; last_name: string };
      reservation_rooms?: Array<{
        room?: { room_number: string };
      }>;
    }

    const rows = data as unknown as ResDepartureRow[];

    return rows.map((b) => {
      const g = b.primary_guest;
      const guestName = g ? `${g.first_name} ${g.last_name}`.trim() : "Guest";
      const roomNum = b.reservation_rooms?.[0]?.room?.room_number || "Unassigned";

      return {
        id: b.id,
        guestName,
        bookingReference: b.confirmation_number,
        roomNumber: roomNum,
        departureTime: "11:00",
        status: "pending",
        balanceDue: Number(b.total_amount) || 0,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Query actionable operational alerts.
 * Only returns verifiable items from current data.
 */
export async function queryOperationalAttention(
  supabase: SupabaseClient,
  propertyId: string,
  roomSummary: RoomStatusSummary
): Promise<AttentionItem[]> {
  void supabase;
  void propertyId;
  const items: AttentionItem[] = [];

  // If room inventory is not yet set up, present a clean operational onboarding step
  if (!roomSummary.isConfigured || roomSummary.total === 0) {
    items.push({
      id: "attn-room-inventory",
      title: "Room Inventory Setup Pending",
      description: "No rooms or suites have been configured for this property. Configure rooms to start accepting reservations.",
      severity: "info",
      category: "operations",
      actionLabel: "Set up rooms",
      actionHref: "/rooms",
      createdAt: new Date().toISOString(),
    });
  }

  // Future items like dirty rooms or maintenance can be added here once tables exist
  if (roomSummary.dirty > 0) {
    items.push({
      id: "attn-dirty-rooms",
      title: `${roomSummary.dirty} Room${roomSummary.dirty > 1 ? "s" : ""} Awaiting Housekeeping`,
      description: "Rooms require cleaning and inspection before next guest check-in.",
      severity: "warning",
      category: "housekeeping",
      actionLabel: "View Housekeeping",
      actionHref: "/housekeeping",
      createdAt: new Date().toISOString(),
    });
  }

  return items;
}

/**
 * Query recent operational activity.
 * Returns empty list until activity/audit log table exists in future phases.
 */
export async function queryRecentActivity(
  supabase: SupabaseClient,
  propertyId: string
): Promise<ActivityItem[]> {
  void supabase;
  void propertyId;
  return [];
}

/**
 * Query actual in-house guest count from active CHECKED_IN stays (Phase 8)
 */
export async function queryInHouseGuestsCount(
  supabase: SupabaseClient,
  propertyId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("stays")
      .select("adults, children")
      .eq("property_id", propertyId)
      .eq("status", "CHECKED_IN");

    if (error || !data) return 0;
    return data.reduce((acc, s) => acc + (s.adults || 1) + (s.children || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Synthesize dashboard KPI metrics from real property data
 */
export function deriveDashboardMetrics(
  roomSummary: RoomStatusSummary,
  arrivals: ArrivalItem[],
  departures: DepartureItem[],
  currency: string,
  inHouseGuestsCount?: number
): DashboardMetrics {
  const isInventoryConfigured = roomSummary.isConfigured && roomSummary.total > 0;
  
  // Real Physical Occupancy: occupied active rooms / active sellable rooms (excludes OUT_OF_ORDER / OUT_OF_SERVICE)
  const sellableRooms = Math.max(0, roomSummary.total - roomSummary.outOfOrder);
  const occupancyRate = sellableRooms > 0
    ? (roomSummary.occupied / sellableRooms) * 100
    : 0;

  return {
    occupancyRate,
    occupancyStatus: isInventoryConfigured ? "configured" : "no_inventory",
    availableRooms: isInventoryConfigured ? roomSummary.available : 0,
    totalRooms: roomSummary.total,
    roomStatus: isInventoryConfigured ? "configured" : "no_inventory",
    arrivalsToday: arrivals.length,
    arrivalsPending: arrivals.filter((a) => a.status === "confirmed").length,
    departuresToday: departures.length,
    departuresPending: departures.filter((d) => d.status === "pending").length,
    inHouseGuests: inHouseGuestsCount !== undefined ? inHouseGuestsCount : roomSummary.occupied,
    todayRevenue: 0, // Revenue tracking pending Billing/POS phase
    revenueCurrency: currency,
    revenueStatus: "no_billing",
    adr: 0,
    revpar: 0,
  };
}
