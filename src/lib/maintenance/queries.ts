// ============================================================
// STAYHUB MAINTENANCE QUERIES (Phase 11)
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MaintenanceKPIs,
  MaintenanceWorkOrder,
  MaintenanceAsset,
  MaintenanceSchedule,
  MaintenanceWorkOrderFilters,
  MaintenanceWorkOrderEvent,
} from "./types";

export interface StaffOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface RoomOption {
  id: string;
  room_number: string;
  room_type?: { name: string } | null;
}

/**
 * Fetch real-time Maintenance KPI metrics for a property
 */
export async function getMaintenanceKPIs(
  supabase: SupabaseClient,
  propertyId: string
): Promise<MaintenanceKPIs> {
  const { data: workOrders, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("status, priority, scheduled_for")
    .eq("property_id", propertyId);

  if (woError || !workOrders) {
    console.error("Error fetching work orders for KPIs:", woError);
    return {
      open: 0,
      assigned: 0,
      inProgress: 0,
      onHold: 0,
      resolved: 0,
      urgent: 0,
      overdue: 0,
      outOfOrderRooms: 0,
    };
  }

  const now = new Date();
  let open = 0;
  let assigned = 0;
  let inProgress = 0;
  let onHold = 0;
  let resolved = 0;
  let urgent = 0;
  let overdue = 0;

  for (const wo of workOrders) {
    if (wo.status === "OPEN") open++;
    else if (wo.status === "ASSIGNED") assigned++;
    else if (wo.status === "IN_PROGRESS") inProgress++;
    else if (wo.status === "ON_HOLD") onHold++;
    else if (wo.status === "RESOLVED") resolved++;

    const isUnresolved = !["RESOLVED", "CLOSED", "CANCELLED"].includes(wo.status);

    if (isUnresolved && (wo.priority === "URGENT" || wo.priority === "HIGH")) {
      urgent++;
    }

    if (isUnresolved && wo.scheduled_for && new Date(wo.scheduled_for) < now) {
      overdue++;
    }
  }

  // Count out of order / service rooms
  const { count: oooCount, error: roomError } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .in("status", ["OUT_OF_ORDER", "OUT_OF_SERVICE"])
    .eq("is_active", true);

  if (roomError) {
    console.error("Error counting out of order rooms:", roomError);
  }

  return {
    open,
    assigned,
    inProgress,
    onHold,
    resolved,
    urgent,
    overdue,
    outOfOrderRooms: oooCount || 0,
  };
}

/**
 * Fetch maintenance work orders with optional server-side filtering
 */
export async function getMaintenanceWorkOrders(
  supabase: SupabaseClient,
  propertyId: string,
  filters?: MaintenanceWorkOrderFilters
): Promise<MaintenanceWorkOrder[]> {
  let query = supabase
    .from("maintenance_work_orders")
    .select(`
      *,
      room:rooms (
        id,
        room_number,
        status,
        room_type:room_types(name, code),
        floor:floors(floor_number, name)
      ),
      asset:maintenance_assets (
        id,
        name,
        asset_type
      ),
      reporter:profiles!reported_by (
        id,
        full_name,
        email
      ),
      technician:profiles!assigned_to (
        id,
        full_name,
        email
      )
    `)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }

  if (filters?.priority && filters.priority !== "ALL") {
    query = query.eq("priority", filters.priority);
  }

  if (filters?.category && filters.category !== "ALL") {
    query = query.eq("category", filters.category);
  }

  if (filters?.roomId && filters.roomId !== "ALL") {
    query = query.eq("room_id", filters.roomId);
  }

  if (filters?.assignedTo && filters.assignedTo !== "ALL") {
    query = query.eq("assigned_to", filters.assignedTo);
  }

  if (filters?.isOverdue) {
    const nowIso = new Date().toISOString();
    query = query
      .lt("scheduled_for", nowIso)
      .not("status", "in", '("RESOLVED","CLOSED","CANCELLED")');
  }

  if (filters?.search && filters.search.trim() !== "") {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching maintenance work orders:", error);
    return [];
  }

  return (data as unknown as MaintenanceWorkOrder[]) || [];
}

/**
 * Fetch single work order by ID with full timeline events
 */
export async function getMaintenanceWorkOrderById(
  supabase: SupabaseClient,
  propertyId: string,
  workOrderId: string
): Promise<MaintenanceWorkOrder | null> {
  const { data, error } = await supabase
    .from("maintenance_work_orders")
    .select(`
      *,
      room:rooms (
        id,
        room_number,
        status,
        room_type:room_types(name, code),
        floor:floors(floor_number, name)
      ),
      asset:maintenance_assets (
        id,
        name,
        asset_type
      ),
      reporter:profiles!reported_by (
        id,
        full_name,
        email
      ),
      technician:profiles!assigned_to (
        id,
        full_name,
        email
      ),
      events:maintenance_work_order_events (
        id,
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes,
        created_at,
        performer:profiles!performed_by (
          id,
          full_name,
          email
        )
      )
    `)
    .eq("property_id", propertyId)
    .eq("id", workOrderId)
    .single();

  if (error || !data) {
    console.error("Error fetching work order detail:", error);
    return null;
  }

  // Sort events chronologically
  if (data.events && Array.isArray(data.events)) {
    data.events.sort(
      (a: MaintenanceWorkOrderEvent, b: MaintenanceWorkOrderEvent) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  return data as unknown as MaintenanceWorkOrder;
}

/**
 * Fetch maintenance assets for a property
 */
export async function getMaintenanceAssets(
  supabase: SupabaseClient,
  propertyId: string
): Promise<MaintenanceAsset[]> {
  const { data, error } = await supabase
    .from("maintenance_assets")
    .select(`
      *,
      room:rooms (
        id,
        room_number
      )
    `)
    .eq("property_id", propertyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching maintenance assets:", error);
    return [];
  }

  return (data as unknown as MaintenanceAsset[]) || [];
}

/**
 * Fetch maintenance schedules for a property
 */
export async function getMaintenanceSchedules(
  supabase: SupabaseClient,
  propertyId: string
): Promise<MaintenanceSchedule[]> {
  const { data, error } = await supabase
    .from("maintenance_schedules")
    .select(`
      *,
      room:rooms (
        id,
        room_number
      ),
      asset:maintenance_assets (
        id,
        name
      )
    `)
    .eq("property_id", propertyId)
    .order("next_due_at", { ascending: true });

  if (error) {
    console.error("Error fetching maintenance schedules:", error);
    return [];
  }

  return (data as unknown as MaintenanceSchedule[]) || [];
}

/**
 * Fetch maintenance history for a specific room
 */
export async function getRoomMaintenanceHistory(
  supabase: SupabaseClient,
  propertyId: string,
  roomId: string
): Promise<MaintenanceWorkOrder[]> {
  const { data, error } = await supabase
    .from("maintenance_work_orders")
    .select(`
      *,
      technician:profiles!assigned_to (
        id,
        full_name,
        email
      ),
      reporter:profiles!reported_by (
        id,
        full_name,
        email
      )
    `)
    .eq("property_id", propertyId)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching room maintenance history:", error);
    return [];
  }

  return (data as unknown as MaintenanceWorkOrder[]) || [];
}

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
    .eq("property_id", propertyId);

  if (error || !data) {
    console.error("Error fetching property staff:", error);
    return [];
  }

  return (data as unknown as Array<{
    user_id: string;
    roles?: { code: string } | null;
    profile?: { id: string; full_name?: string | null; email?: string | null } | null;
  }>)
    .filter((m) => !!m.profile)
    .map((m) => ({
      id: m.profile!.id,
      fullName: m.profile!.full_name || m.profile!.email || "Staff Member",
      email: m.profile!.email || "",
      role: m.roles?.code || "STAFF",
    }));
}
