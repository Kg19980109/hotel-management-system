/**
 * STAYHUB - Room Management Query Functions
 * Phase 6: Room Management & Room Inventory Engine
 * 
 * Centralized, multi-tenant database queries with RLS enforcement.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Room,
  RoomType,
  Floor,
  RoomStats,
  RoomFilterOptions,
  RoomLiveStay,
  RoomLiveServiceRequest,
} from "./types";

/**
 * Fetch filtered and paginated rooms for a property
 */
export async function fetchRooms(
  supabase: SupabaseClient,
  propertyId: string,
  options?: RoomFilterOptions
): Promise<{ rooms: Room[]; totalCount: number }> {
  try {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 25;
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    let query = supabase
      .from("rooms")
      .select(
        `
        id,
        property_id,
        floor_id,
        room_type_id,
        room_number,
        room_name,
        status,
        housekeeping_status,
        availability_status,
        max_occupancy,
        floor_label,
        view_type,
        notes,
        is_active,
        created_at,
        updated_at,
        room_type:room_type_id (
          id,
          name,
          code,
          base_rate,
          currency,
          max_occupancy,
          bed_configuration,
          amenities,
          size_sqft,
          size_sqm,
          status,
          is_active
        ),
        floor:floor_id (
          id,
          name,
          floor_number,
          description,
          status,
          sort_order
        )
      `,
        { count: "exact" }
      )
      .eq("property_id", propertyId);

    // Filter by Active Status
    if (options?.isActive !== undefined && options.isActive !== "ALL") {
      query = query.eq("is_active", options.isActive);
    }

    // Filter by Operational Status
    if (options?.status && options.status !== "ALL") {
      query = query.eq("status", options.status);
    }

    // Filter by Housekeeping Status
    if (options?.housekeepingStatus && options.housekeepingStatus !== "ALL") {
      query = query.eq("housekeeping_status", options.housekeepingStatus);
    }

    // Filter by Floor
    if (options?.floorId && options.floorId !== "ALL") {
      query = query.eq("floor_id", options.floorId);
    }

    // Filter by Room Type
    if (options?.roomTypeId && options.roomTypeId !== "ALL") {
      query = query.eq("room_type_id", options.roomTypeId);
    }

    // Search by room number or name
    if (options?.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`room_number.ilike.%${term}%,room_name.ilike.%${term}%`);
    }

    // Order by room number ascending
    query = query.order("room_number", { ascending: true }).range(fromIndex, toIndex);

    const { data, count, error } = await query;

    if (error) {
      console.error("fetchRooms query error:", error);
      return { rooms: [], totalCount: 0 };
    }

    const rawData = data || [];
    const roomIds = rawData.map((item) => item.id);

    // 1. Fetch active checked-in stays for these rooms
    const activeStaysMap = new Map<string, any>();
    const foliosMap = new Map<
      string,
      {
        totalCharges: number;
        totalPaid: number;
        balanceDue: number;
        currency: string;
        folioId: string;
        charges: Array<{
          id: string;
          description: string;
          chargeType: string;
          amount: number;
          taxAmount: number;
          postedAt: string;
        }>;
      }
    >();

    if (roomIds.length > 0) {
      try {
        const { data: activeStays, error: staysErr } = await supabase
          .from("stays")
          .select(`
            id,
            room_id,
            guest_id,
            reservation_id,
            status,
            actual_check_in_at,
            expected_check_out_date,
            adults,
            children,
            notes,
            guest:guests(id, first_name, last_name, email, phone),
            reservation:reservations(id, confirmation_number, total_amount)
          `)
          .eq("property_id", propertyId)
          .eq("status", "CHECKED_IN")
          .in("room_id", roomIds);

        if (staysErr) {
          console.error("fetchRooms activeStays query error:", staysErr);
        }

        if (activeStays && activeStays.length > 0) {
          activeStays.forEach((s: any) => {
            if (s.room_id) activeStaysMap.set(s.room_id, s);
          });

          const stayIds = activeStays.map((s: any) => s.id);
          const { data: folios, error: foliosErr } = await supabase
            .from("guest_folios")
            .select(`
              id,
              stay_id,
              currency,
              folio_charges(id, description, charge_type, total_amount, tax_amount, posted_at, voided_at),
              folio_payments(amount, status)
            `)
            .in("stay_id", stayIds);

          if (foliosErr) {
            console.error("fetchRooms folios query error:", foliosErr);
          }

          (folios || []).forEach((f: any) => {
            const validCharges = (f.folio_charges || []).filter((c: any) => !c.voided_at);
            const charges = validCharges.reduce(
              (acc: number, c: any) => acc + Number(c.total_amount || 0),
              0
            );
            const payments = (f.folio_payments || [])
              .filter((p: any) => p.status === "COMPLETED")
              .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

            const itemizedCharges = validCharges.map((c: any) => ({
              id: c.id,
              description: c.description || "Room Charge",
              chargeType: c.charge_type || "ROOM_CHARGE",
              amount: Number(c.total_amount || 0),
              taxAmount: Number(c.tax_amount || 0),
              postedAt: c.posted_at || new Date().toISOString(),
            }));

            foliosMap.set(f.stay_id, {
              folioId: f.id,
              currency: f.currency || "INR",
              totalCharges: charges,
              totalPaid: payments,
              balanceDue: Math.max(0, charges - payments),
              charges: itemizedCharges,
            });
          });
        }
      } catch (e) {
        console.error("fetchRooms stays/folios enrichment error:", e);
      }
    }

    // 2. Fetch active guest service requests for these rooms
    const requestsByRoom = new Map<string, any[]>();
    if (roomIds.length > 0) {
      try {
        const { data: activeRequests, error: reqErr } = await supabase
          .from("guest_service_requests")
          .select(`
            id,
            room_id,
            title,
            description,
            category,
            priority,
            status,
            created_at
          `)
          .eq("property_id", propertyId)
          .not("status", "in", '("COMPLETED","CANCELLED","REJECTED")')
          .in("room_id", roomIds)
          .order("created_at", { ascending: false });

        if (reqErr) {
          console.error("fetchRooms activeRequests query error:", reqErr);
        }

        (activeRequests || []).forEach((r: any) => {
          if (r.room_id) {
            const list = requestsByRoom.get(r.room_id) || [];
            list.push(r);
            requestsByRoom.set(r.room_id, list);
          }
        });
      } catch (e) {
        console.error("fetchRooms service requests enrichment error:", e);
      }
    }

    const rooms: Room[] = rawData.map((item) => {
      const stay = activeStaysMap.get(item.id);
      const reqList = requestsByRoom.get(item.id) || [];
      const folioData = stay ? foliosMap.get(stay.id) : null;

      let liveStay: RoomLiveStay | null = null;
      if (stay) {
        const g = stay.guest;
        const res = stay.reservation;
        const guestName = g ? `${g.first_name || ""} ${g.last_name || ""}`.trim() : "Guest";
        liveStay = {
          id: stay.id,
          reservationId: stay.reservation_id,
          confirmationNumber: res?.confirmation_number || "WALK-IN",
          guestId: stay.guest_id,
          guestName: guestName || "Registered Guest",
          guestEmail: g?.email || null,
          guestPhone: g?.phone || null,
          guestVip: false,
          adults: stay.adults || 1,
          children: stay.children || 0,
          checkInDate: stay.actual_check_in_at || stay.created_at,
          expectedCheckOutDate: stay.expected_check_out_date,
          status: stay.status,
          notes: stay.notes || null,
          totalCharges: folioData?.totalCharges || Number(res?.total_amount || 0),
          totalPaid: folioData?.totalPaid || 0,
          balanceDue: folioData ? folioData.balanceDue : Number(res?.total_amount || 0),
          currency: folioData?.currency || "INR",
          folioId: folioData?.folioId,
          charges: folioData?.charges || [],
        };
      }

      const activeRequests = reqList.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        priority: r.priority,
        status: r.status,
        createdAt: r.created_at,
        assignedStaffName: r.assigned_staff?.full_name || null,
      }));

      return {
        id: item.id,
        property_id: item.property_id,
        floor_id: item.floor_id,
        room_type_id: item.room_type_id,
        room_number: item.room_number,
        room_name: item.room_name,
        status: item.status,
        housekeeping_status: item.housekeeping_status,
        availability_status: item.availability_status,
        max_occupancy: item.max_occupancy,
        floor_label: item.floor_label,
        view_type: item.view_type,
        notes: item.notes,
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
        room_type: item.room_type as unknown as RoomType | null,
        floor: item.floor as unknown as Floor | null,
        liveStay,
        activeRequests,
        pendingRequestsCount: activeRequests.length,
      };
    });

    return { rooms, totalCount: count || 0 };
  } catch (err) {
    console.error("fetchRooms exception:", err);
    return { rooms: [], totalCount: 0 };
  }
}

/**
 * Fetch a single room by ID
 */
export async function fetchRoomById(
  supabase: SupabaseClient,
  propertyId: string,
  roomId: string
): Promise<Room | null> {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select(
        `
        id,
        property_id,
        floor_id,
        room_type_id,
        room_number,
        room_name,
        status,
        housekeeping_status,
        availability_status,
        max_occupancy,
        floor_label,
        view_type,
        notes,
        is_active,
        created_at,
        updated_at,
        room_type:room_type_id (
          id,
          name,
          code,
          base_rate,
          currency,
          max_occupancy,
          bed_configuration,
          amenities,
          size_sqft,
          size_sqm,
          status,
          is_active
        ),
        floor:floor_id (
          id,
          name,
          floor_number,
          description,
          status,
          sort_order
        )
      `
      )
      .eq("property_id", propertyId)
      .eq("id", roomId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      property_id: data.property_id,
      floor_id: data.floor_id,
      room_type_id: data.room_type_id,
      room_number: data.room_number,
      room_name: data.room_name,
      status: data.status,
      housekeeping_status: data.housekeeping_status,
      availability_status: data.availability_status,
      max_occupancy: data.max_occupancy,
      floor_label: data.floor_label,
      view_type: data.view_type,
      notes: data.notes,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      room_type: data.room_type as unknown as RoomType | null,
      floor: data.floor as unknown as Floor | null,
    };
  } catch (err) {
    console.error("fetchRoomById exception:", err);
    return null;
  }
}

/**
 * Fetch operational room statistics for dashboard and room KPI widgets
 * Uses server-side COUNTs instead of downloading all rows.
 */
export async function fetchRoomStats(
  supabase: SupabaseClient,
  propertyId: string
): Promise<RoomStats> {
  const zero: RoomStats = {
    total: 0, available: 0, occupied: 0, dirty: 0,
    cleaning: 0, inspected: 0, outOfOrder: 0, inactive: 0,
  };
  try {
    const [
      totalRes, availableRes, occupiedRes, dirtyRes,
      cleaningRes, inspectedRes, outOfOrderRes, inactiveRes,
    ] = await Promise.all([
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", propertyId),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("is_active", true).eq("status", "AVAILABLE"),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("is_active", true).eq("status", "OCCUPIED"),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("is_active", true).eq("housekeeping_status", "DIRTY"),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("is_active", true).eq("housekeeping_status", "CLEANING"),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("is_active", true).eq("housekeeping_status", "INSPECTION_PENDING"),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("is_active", true).in("status", ["OUT_OF_ORDER", "OUT_OF_SERVICE"]),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("is_active", false),
    ]);
    return {
      total: totalRes.count ?? 0,
      available: availableRes.count ?? 0,
      occupied: occupiedRes.count ?? 0,
      dirty: dirtyRes.count ?? 0,
      cleaning: cleaningRes.count ?? 0,
      inspected: inspectedRes.count ?? 0,
      outOfOrder: outOfOrderRes.count ?? 0,
      inactive: inactiveRes.count ?? 0,
    };
  } catch (err) {
    console.error("fetchRoomStats exception:", err);
    return zero;
  }
}

/**
 * Fetch floors configured for a property
 */
export async function fetchFloors(
  supabase: SupabaseClient,
  propertyId: string
): Promise<Floor[]> {
  try {
    const { data: floorsData, error } = await supabase
      .from("floors")
      .select("id, property_id, name, floor_number, description, status, sort_order, created_at, updated_at")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error || !floorsData) {
      return [];
    }

    // Fetch room counts per floor
    const { data: countData } = await supabase
      .from("rooms")
      .select("floor_id")
      .eq("property_id", propertyId)
      .eq("is_active", true);

    const countMap: Record<string, number> = {};
    if (countData) {
      for (const item of countData) {
        if (item.floor_id) {
          countMap[item.floor_id] = (countMap[item.floor_id] || 0) + 1;
        }
      }
    }

    return floorsData.map((f) => ({
      id: f.id,
      property_id: f.property_id,
      name: f.name,
      floor_number: f.floor_number,
      description: f.description,
      status: f.status,
      sort_order: f.sort_order,
      room_count: countMap[f.id] || 0,
      created_at: f.created_at,
      updated_at: f.updated_at,
    }));
  } catch (err) {
    console.error("fetchFloors exception:", err);
    return [];
  }
}

/**
 * Fetch room types configured for a property
 */
export async function fetchRoomTypes(
  supabase: SupabaseClient,
  propertyId: string
): Promise<RoomType[]> {
  try {
    const { data: typesData, error } = await supabase
      .from("room_types")
      .select(
        "id, property_id, name, code, description, max_occupancy, base_rate, currency, bed_configuration, amenities, size_sqft, size_sqm, status, is_active, created_at, updated_at"
      )
      .eq("property_id", propertyId)
      .order("name", { ascending: true });

    if (error || !typesData) {
      return [];
    }

    // Fetch room counts per room type
    const { data: countData } = await supabase
      .from("rooms")
      .select("room_type_id")
      .eq("property_id", propertyId)
      .eq("is_active", true);

    const countMap: Record<string, number> = {};
    if (countData) {
      for (const item of countData) {
        countMap[item.room_type_id] = (countMap[item.room_type_id] || 0) + 1;
      }
    }

    return typesData.map((t) => ({
      id: t.id,
      property_id: t.property_id,
      name: t.name,
      code: t.code,
      description: t.description,
      max_occupancy: t.max_occupancy,
      base_rate: Number(t.base_rate),
      currency: t.currency,
      bed_configuration: t.bed_configuration,
      amenities: Array.isArray(t.amenities) ? t.amenities : [],
      size_sqft: t.size_sqft ? Number(t.size_sqft) : null,
      size_sqm: t.size_sqm ? Number(t.size_sqm) : null,
      status: t.status,
      is_active: t.is_active,
      room_count: countMap[t.id] || 0,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  } catch (err) {
    console.error("fetchRoomTypes exception:", err);
    return [];
  }
}

/**
 * Fetch rooms grouped by floor for interactive Floor View
 */
export async function fetchFloorViewData(
  supabase: SupabaseClient,
  propertyId: string
): Promise<Array<{ floor: Floor | null; rooms: Room[] }>> {
  try {
    const [floors, { rooms }] = await Promise.all([
      fetchFloors(supabase, propertyId),
      fetchRooms(supabase, propertyId, { pageSize: 500, isActive: true }),
    ]);

    const grouped: Array<{ floor: Floor | null; rooms: Room[] }> = [];

    // Add each configured floor with its rooms
    for (const floor of floors) {
      grouped.push({
        floor,
        rooms: rooms.filter((r) => r.floor_id === floor.id),
      });
    }

    // Add unassigned rooms if any exist
    const unassignedRooms = rooms.filter((r) => !r.floor_id);
    if (unassignedRooms.length > 0) {
      grouped.push({
        floor: null,
        rooms: unassignedRooms,
      });
    }

    return grouped;
  } catch (err) {
    console.error("fetchFloorViewData exception:", err);
    return [];
  }
}

/**
 * Reusable operational room availability check (Phase 6 foundation)
 * Note: Phase 7 will integrate active bookings/stays.
 */
export async function getRoomAvailability(
  supabase: SupabaseClient,
  propertyId: string
): Promise<{ total: number; available: number; blocked: number }> {
  const stats = await fetchRoomStats(supabase, propertyId);
  return {
    total: stats.total,
    available: stats.available,
    blocked: stats.outOfOrder + stats.occupied,
  };
}
