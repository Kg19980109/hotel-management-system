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
      console.error("Error fetching rooms:", error);
      return { rooms: [], totalCount: 0 };
    }

    const rooms: Room[] = (data || []).map((item) => ({
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
    }));

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
 */
export async function fetchRoomStats(
  supabase: SupabaseClient,
  propertyId: string
): Promise<RoomStats> {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("status, housekeeping_status, is_active")
      .eq("property_id", propertyId);

    if (error || !data) {
      return {
        total: 0,
        available: 0,
        occupied: 0,
        dirty: 0,
        cleaning: 0,
        inspected: 0,
        outOfOrder: 0,
        inactive: 0,
      };
    }

    let available = 0;
    let occupied = 0;
    let dirty = 0;
    let cleaning = 0;
    let inspected = 0;
    let outOfOrder = 0;
    let inactive = 0;

    for (const r of data) {
      if (!r.is_active) {
        inactive++;
        continue;
      }

      if (r.status === "AVAILABLE") available++;
      else if (r.status === "OCCUPIED") occupied++;
      else if (r.status === "OUT_OF_ORDER" || r.status === "OUT_OF_SERVICE") outOfOrder++;

      if (r.housekeeping_status === "DIRTY") dirty++;
      else if (r.housekeeping_status === "CLEANING") cleaning++;
      else if (r.housekeeping_status === "INSPECTION_PENDING") inspected++;
    }

    return {
      total: data.length,
      available,
      occupied,
      dirty,
      cleaning,
      inspected,
      outOfOrder,
      inactive,
    };
  } catch (err) {
    console.error("fetchRoomStats exception:", err);
    return {
      total: 0,
      available: 0,
      occupied: 0,
      dirty: 0,
      cleaning: 0,
      inspected: 0,
      outOfOrder: 0,
      inactive: 0,
    };
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
