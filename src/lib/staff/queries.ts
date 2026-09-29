// ============================================================
// STAFF MANAGEMENT QUERIES — StayHub
// ============================================================

import { createClient } from "@/lib/supabase/client";
import { StaffMember, StaffDepartment, StaffRole, PermissionItem, PropertyRolePermissionRecord } from "./types";

/**
 * Fetch all staff members for a specific property, including their linked role
 */
export async function getStaffMembers(
  propertyId: string,
  filters?: {
    departmentId?: string;
    isActive?: boolean;
    search?: string;
  }
): Promise<StaffMember[]> {
  const supabase = createClient();

  let query = supabase
    .from("staff_members")
    .select(
      `
      id,
      property_id,
      profile_id,
      employee_code,
      first_name,
      middle_name,
      last_name,
      display_name,
      phone,
      email,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      department_id,
      designation,
      employment_type,
      employment_status,
      joining_date,
      leaving_date,
      notes,
      is_active,
      created_at,
      updated_at,
      department:staff_departments(id, name, department_code, is_active)
    `
    )
    .eq("property_id", propertyId)
    .order("employee_code", { ascending: true });

  if (filters?.departmentId && filters.departmentId !== "ALL") {
    query = query.eq("department_id", filters.departmentId);
  }

  if (filters?.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive);
  }

  const [staffRes, membershipsRes] = await Promise.all([
    query,
    supabase
      .from("property_memberships")
      .select("user_id, role_id, roles(id, code, name, description)")
      .eq("property_id", propertyId)
      .eq("status", "active"),
  ]);

  if (staffRes.error || !staffRes.data) {
    console.error("Error loading staff members:", staffRes.error);
    return [];
  }

  // Build a lookup map of user/email -> assigned role
  const roleByUserId = new Map<string, StaffRole>();
  (membershipsRes.data || []).forEach((m: unknown) => {
    const mem = m as { user_id?: string; roles?: StaffRole | null };
    if (mem.user_id && mem.roles) {
      roleByUserId.set(mem.user_id, mem.roles);
    }
  });

  // If staff have profile_id, we can link them, or match by email
  const staffList = (staffRes.data || []) as unknown as StaffMember[];
  return staffList.map((s) => {
    let matchedRole: StaffRole | null = null;
    if (s.profile_id && roleByUserId.has(s.profile_id)) {
      matchedRole = roleByUserId.get(s.profile_id) || null;
    }
    return {
      ...s,
      assigned_role: matchedRole || s.assigned_role || null,
    };
  });
}

/**
 * Fetch all departments configured for a property
 */
export async function getStaffDepartments(propertyId: string): Promise<StaffDepartment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("staff_departments")
    .select("id, property_id, name, department_code, description, is_active, created_at, updated_at")
    .eq("property_id", propertyId)
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Error loading staff departments:", error);
    return [];
  }

  return (data || []) as StaffDepartment[];
}

/**
 * Fetch available system roles
 */
export async function getRoles(): Promise<StaffRole[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("roles")
    .select("id, code, name, description")
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Error loading roles:", error);
    return [];
  }

  return (data || []) as StaffRole[];
}

/**
 * Fetch all master permissions
 */
export async function getMasterPermissions(): Promise<PermissionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("permissions")
    .select("id, key, module, name, description, permission_type, display_order")
    .order("display_order", { ascending: true });

  if (error || !data) {
    console.error("Error loading permissions:", error);
    return [];
  }

  return (data || []) as PermissionItem[];
}

/**
 * Fetch default permissions for all roles (or specific role)
 */
export async function getRoleDefaultPermissions(roleId?: string): Promise<{ role_id: string; permission_id: string }[]> {
  const supabase = createClient();

  let query = supabase.from("role_default_permissions").select("role_id, permission_id");
  if (roleId) {
    query = query.eq("role_id", roleId);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("Error loading role default permissions:", error);
    return [];
  }

  return (data || []) as { role_id: string; permission_id: string }[];
}

/**
 * Fetch property role permission overrides
 */
export async function getPropertyRolePermissions(
  propertyId: string,
  roleId?: string
): Promise<PropertyRolePermissionRecord[]> {
  const supabase = createClient();

  let query = supabase
    .from("property_role_permissions")
    .select("id, property_id, role_id, permission_id, granted")
    .eq("property_id", propertyId);

  if (roleId) {
    query = query.eq("role_id", roleId);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("Error loading property role permissions:", error);
    return [];
  }

  return (data || []) as PropertyRolePermissionRecord[];
}

