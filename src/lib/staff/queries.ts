// ============================================================
// STAFF MANAGEMENT QUERIES — StayHub
// ============================================================

import { createClient } from "@/lib/supabase/client";
import { StaffMember, StaffDepartment, StaffRole } from "./types";

/**
 * Fetch all staff members for a specific property
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

  const { data, error } = await query;

  if (error || !data) {
    console.error("Error loading staff members:", error);
    return [];
  }

  return (data || []) as unknown as StaffMember[];
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
    .select("id, code, name, description, is_system")
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Error loading roles:", error);
    return [];
  }

  return (data || []) as StaffRole[];
}
