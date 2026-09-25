// ============================================================
// STAYHUB HOUSEKEEPING QUERIES (Phase 10)
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  HousekeepingKPIs,
  HousekeepingTask,
  HousekeepingInspection,
  HousekeepingTaskFilters,
  StaffOption,
} from "./types";

/**
 * Fetch real-time Housekeeping KPI metrics for a property
 */
export async function getHousekeepingKPIs(
  supabase: SupabaseClient,
  propertyId: string
): Promise<HousekeepingKPIs> {
  // 1. Fetch room counts
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("status, housekeeping_status, is_active")
    .eq("property_id", propertyId)
    .eq("is_active", true);

  if (roomsError || !rooms) {
    console.error("Error fetching rooms for housekeeping KPIs:", roomsError);
    return {
      dirtyRooms: 0,
      cleaningInProgress: 0,
      inspectionPending: 0,
      readyClean: 0,
      priorityTasks: 0,
      outOfServiceOrOrder: 0,
      totalRooms: 0,
    };
  }

  let dirtyRooms = 0;
  let cleaningInProgress = 0;
  let inspectionPending = 0;
  let readyClean = 0;
  let outOfServiceOrOrder = 0;

  for (const r of rooms) {
    if (r.status === "OUT_OF_ORDER" || r.status === "OUT_OF_SERVICE") {
      outOfServiceOrOrder++;
    } else if (r.status === "CLEANING" || r.housekeeping_status === "CLEANING") {
      cleaningInProgress++;
    } else if (r.status === "INSPECTED" || r.housekeeping_status === "INSPECTION_PENDING") {
      inspectionPending++;
    } else if (r.status === "DIRTY" || r.housekeeping_status === "DIRTY") {
      dirtyRooms++;
    } else if (r.status === "AVAILABLE" && r.housekeeping_status === "CLEAN") {
      readyClean++;
    }
  }

  // 2. Fetch active priority tasks count
  const { count: priorityCount, error: taskError } = await supabase
    .from("housekeeping_tasks")
    .select("*", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .in("status", ["PENDING", "ASSIGNED", "IN_PROGRESS", "INSPECTION_PENDING"])
    .in("priority", ["HIGH", "URGENT"]);

  if (taskError) {
    console.error("Error fetching priority housekeeping tasks:", taskError);
  }

  return {
    dirtyRooms,
    cleaningInProgress,
    inspectionPending,
    readyClean,
    priorityTasks: priorityCount || 0,
    outOfServiceOrOrder,
    totalRooms: rooms.length,
  };
}

/**
 * Fetch paginated & filtered Housekeeping tasks for operations board
 */
export async function getHousekeepingTasks(
  supabase: SupabaseClient,
  propertyId: string,
  filters: HousekeepingTaskFilters = {}
): Promise<{
  tasks: HousekeepingTask[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("housekeeping_tasks")
    .select(
      `
      id,
      property_id,
      room_id,
      task_type,
      status,
      priority,
      assigned_to,
      scheduled_for,
      started_at,
      completed_at,
      cancelled_at,
      notes,
      created_by,
      completed_by,
      created_at,
      updated_at,
      room:rooms!inner (
        id,
        room_number,
        status,
        housekeeping_status,
        floor_id,
        room_type_id,
        floor:floors (
          id,
          floor_number,
          name
        ),
        room_type:room_types (
          id,
          name,
          code
        )
      ),
      assigned_profile:profiles!housekeeping_tasks_assigned_to_fkey (
        id,
        full_name,
        email,
        avatar_url
      ),
      created_by_profile:profiles!housekeeping_tasks_created_by_fkey (
        id,
        full_name,
        email
      )
    `,
      { count: "exact" }
    )
    .eq("property_id", propertyId);

  // Apply filters
  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }

  if (filters.taskType && filters.taskType !== "ALL") {
    query = query.eq("task_type", filters.taskType);
  }

  if (filters.priority && filters.priority !== "ALL") {
    query = query.eq("priority", filters.priority);
  }

  if (filters.assignedTo && filters.assignedTo !== "ALL") {
    if (filters.assignedTo === "UNASSIGNED") {
      query = query.is("assigned_to", null);
    } else {
      query = query.eq("assigned_to", filters.assignedTo);
    }
  }

  if (filters.floorId && filters.floorId !== "ALL") {
    query = query.eq("room.floor_id", filters.floorId);
  }

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.ilike("room.room_number", `%${term}%`);
  }

  // Ordering: Updated/Created at desc
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching housekeeping tasks:", error);
    return {
      tasks: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    };
  }

  const tasks = (data || []) as unknown as HousekeepingTask[];
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    tasks,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetch pending or recent inspections for the inspections queue
 */
export async function getHousekeepingInspections(
  supabase: SupabaseClient,
  propertyId: string,
  limit = 50
): Promise<HousekeepingInspection[]> {
  const { data, error } = await supabase
    .from("housekeeping_inspections")
    .select(`
      id,
      property_id,
      housekeeping_task_id,
      room_id,
      inspector_id,
      result,
      notes,
      inspected_at,
      created_at,
      updated_at,
      room:rooms (
        id,
        room_number,
        floor:floors (
          name,
          floor_number
        ),
        room_type:room_types (
          name
        )
      ),
      inspector_profile:profiles!housekeeping_inspections_inspector_id_fkey (
        id,
        full_name,
        email,
        avatar_url
      ),
      task:housekeeping_tasks (
        id,
        task_type,
        status,
        priority,
        notes,
        started_at,
        completed_at,
        assigned_profile:profiles!housekeeping_tasks_assigned_to_fkey (
          id,
          full_name
        )
      )
    `)
    .eq("property_id", propertyId)
    .order("inspected_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching housekeeping inspections:", error);
    return [];
  }

  return (data || []) as unknown as HousekeepingInspection[];
}

/**
 * Fetch task history for a specific room (e.g. for /rooms/[roomId] detail page)
 */
export async function getRoomHousekeepingHistory(
  supabase: SupabaseClient,
  roomId: string,
  propertyId: string
): Promise<{
  activeTask: HousekeepingTask | null;
  history: HousekeepingTask[];
  inspections: HousekeepingInspection[];
}> {
  // 1. Fetch active task
  const { data: activeTaskData } = await supabase
    .from("housekeeping_tasks")
    .select(`
      id,
      property_id,
      room_id,
      task_type,
      status,
      priority,
      assigned_to,
      scheduled_for,
      started_at,
      completed_at,
      cancelled_at,
      notes,
      created_at,
      updated_at,
      assigned_profile:profiles!housekeeping_tasks_assigned_to_fkey (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq("room_id", roomId)
    .eq("property_id", propertyId)
    .in("status", ["PENDING", "ASSIGNED", "IN_PROGRESS", "INSPECTION_PENDING"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Fetch task history
  const { data: historyData } = await supabase
    .from("housekeeping_tasks")
    .select(`
      id,
      property_id,
      room_id,
      task_type,
      status,
      priority,
      assigned_to,
      scheduled_for,
      started_at,
      completed_at,
      cancelled_at,
      notes,
      created_at,
      updated_at,
      assigned_profile:profiles!housekeeping_tasks_assigned_to_fkey (
        id,
        full_name,
        email
      ),
      completed_by_profile:profiles!housekeeping_tasks_completed_by_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq("room_id", roomId)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(10);

  // 3. Fetch inspections
  const { data: inspectionsData } = await supabase
    .from("housekeeping_inspections")
    .select(`
      id,
      property_id,
      housekeeping_task_id,
      room_id,
      inspector_id,
      result,
      notes,
      inspected_at,
      created_at,
      updated_at,
      inspector_profile:profiles!housekeeping_inspections_inspector_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq("room_id", roomId)
    .eq("property_id", propertyId)
    .order("inspected_at", { ascending: false })
    .limit(10);

  return {
    activeTask: (activeTaskData as unknown as HousekeepingTask) || null,
    history: (historyData as unknown as HousekeepingTask[]) || [],
    inspections: (inspectionsData as unknown as HousekeepingInspection[]) || [],
  };
}

/**
 * Fetch staff members available for housekeeping assignment
 */
export async function getPropertyStaff(
  supabase: SupabaseClient,
  propertyId: string
): Promise<StaffOption[]> {
  const { data, error } = await supabase
    .from("property_memberships")
    .select(`
      user_id,
      roles:role_id (
        code
      ),
      profile:profiles!property_memberships_user_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq("property_id", propertyId)
    .eq("status", "active");

  if (error || !data) {
    console.error("Error fetching property staff for housekeeping:", error);
    return [];
  }

  return data
    .map((m) => {
      const profile = m.profile as unknown as { id: string; full_name: string; email: string } | null;
      const role = m.roles as unknown as { code: string } | null;
      if (!profile) return null;
      return {
        userId: profile.id,
        fullName: profile.full_name || profile.email,
        email: profile.email,
        roleCode: role?.code || "MEMBER",
      };
    })
    .filter(Boolean) as StaffOption[];
}
