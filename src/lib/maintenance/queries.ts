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
  departmentCode?: string;
  departmentName?: string;
  designation?: string;
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

/**
 * Assignable staff for a property (guest-request / work-order dispatch).
 * FIX: old version joined `profiles!property_memberships_user_id_fkey`, but that
 * FK points to auth.users(id) — not profiles — so PostgREST returned null
 * profiles and the filter dropped EVERYONE, leaving the assign dropdown empty.
 * Two-step lookup via profiles.auth_user_id + merge of the HR directory
 * (staff_members) so admins can always assign someone. The
 * staff_assign_guest_request RPC accepts profile ids, auth uids, or
 * staff_members ids, so all returned ids are assignable.
 */
export async function getPropertyStaff(
  supabase: SupabaseClient,
  propertyId: string
): Promise<StaffOption[]> {
  const { data: memberships, error: memberError } = await supabase
    .from("property_memberships")
    .select("user_id, status, roles:role_id (code)")
    .eq("property_id", propertyId)
    .eq("status", "active");

  if (memberError) {
    console.error("Error fetching property staff:", memberError);
  }

  const activeMemberships = (memberships || []).filter((m) => m.status === "active");
  const userIds = [...new Set(activeMemberships.map((m) => m.user_id).filter(Boolean))];
  const roleByUserId = new Map(
    activeMemberships.map((m) => [
      m.user_id,
      (m.roles as unknown as { code?: string } | null)?.code || "STAFF",
    ])
  );

  let profileRows: { id: string; auth_user_id: string; full_name?: string | null; email?: string | null }[] = [];
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, auth_user_id, full_name, email")
      .in("auth_user_id", userIds);

    if (profileError) {
      console.error("Error fetching staff profiles:", profileError);
    } else {
      profileRows = (profiles || []) as typeof profileRows;
    }
  }

  // HR directory staff (with departments and designations)
  const { data: directory } = await supabase
    .from("staff_members")
    .select("id, profile_id, first_name, last_name, display_name, email, designation, department:staff_departments(name, department_code)")
    .eq("property_id", propertyId)
    .eq("is_active", true)
    .limit(100);

  const dirList = (directory || []) as {
    id: string;
    profile_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    email?: string | null;
    designation?: string | null;
    department?: { name?: string; department_code?: string } | null;
  }[];

  const dirByProfileId = new Map<string, (typeof dirList)[0]>();
  const dirByEmail = new Map<string, (typeof dirList)[0]>();
  for (const s of dirList) {
    if (s.profile_id) dirByProfileId.set(s.profile_id, s);
    if (s.email) dirByEmail.set(s.email.toLowerCase(), s);
  }

  const isTestAccount = (name: string, email: string): boolean => {
    const n = (name || "").toLowerCase();
    const e = (email || "").toLowerCase();
    if (n.startsWith("billing-") || n.startsWith("test-") || e.startsWith("billing-") || e.startsWith("test-")) {
      return true;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(n) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(e)) {
      return true;
    }
    return false;
  };

  const options: StaffOption[] = [];
  const seen = new Set<string>();

  for (const p of profileRows) {
    if (isTestAccount(p.full_name || "", p.email || "")) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);

    const dir = dirByProfileId.get(p.id) || (p.email ? dirByEmail.get(p.email.toLowerCase()) : undefined);
    const name =
      dir?.display_name ||
      `${dir?.first_name || ""} ${dir?.last_name || ""}`.trim() ||
      p.full_name ||
      p.email ||
      "Staff Member";

    options.push({
      id: p.id,
      fullName: name,
      email: p.email || dir?.email || "",
      role: roleByUserId.get(p.auth_user_id) || "STAFF",
      departmentCode: dir?.department?.department_code,
      departmentName: dir?.department?.name,
      designation: dir?.designation || undefined,
    });
  }

  // HR directory staff without profiles linked yet
  for (const s of dirList) {
    const staffId = s.profile_id || s.id;
    if (seen.has(staffId)) continue;
    seen.add(staffId);

    const name =
      s.display_name ||
      `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
      s.email ||
      "Staff Member";

    if (isTestAccount(name, s.email || "")) continue;

    options.push({
      id: staffId,
      fullName: name,
      email: s.email || "",
      role: "STAFF",
      departmentCode: s.department?.department_code,
      departmentName: s.department?.name,
      designation: s.designation || undefined,
    });
  }

  // If after filtering everything is empty (e.g. test environment with only test users), fallback
  if (options.length === 0 && profileRows.length > 0) {
    for (const p of profileRows) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      options.push({
        id: p.id,
        fullName: p.full_name || p.email || "Staff Member",
        email: p.email || "",
        role: roleByUserId.get(p.auth_user_id) || "STAFF",
      });
    }
  }

  return options.sort((a, b) => a.fullName.localeCompare(b.fullName));
}
