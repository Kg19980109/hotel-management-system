// ============================================================
// STAFF MANAGEMENT TYPES — StayHub
//
// Role-based access control, employee directory, departments,
// and operational permissions matrix (payroll excluded per spec).
// ============================================================

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "SEASONAL" | "INTERN";
export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED";

export interface StaffDepartment {
  id: string;
  property_id: string;
  name: string;
  department_code: string;
  description?: string | null;
  is_active: boolean;
  member_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StaffRole {
  id: string;
  code: string;
  name: string;
  description: string;
  is_system?: boolean;
}

export interface StaffMember {
  id: string;
  property_id: string;
  profile_id?: string | null;
  employee_code: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  display_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  department_id?: string | null;
  designation?: string | null;
  employment_type: EmploymentType;
  employment_status: EmploymentStatus;
  joining_date?: string | null;
  leaving_date?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined relation
  department?: StaffDepartment | null;
  assigned_role?: StaffRole | null;
}

export interface CreateStaffInput {
  property_id: string;
  first_name: string;
  last_name: string;
  employee_code?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  designation?: string;
  employment_type?: EmploymentType;
  role_id?: string;
  notes?: string;
}

export interface UpdateStaffInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  designation?: string;
  employment_type?: EmploymentType;
  employment_status?: EmploymentStatus;
  is_active?: boolean;
  notes?: string;
}

export interface ModulePermission {
  module: string;
  feature: string;
  description: string;
  allowedRoles: string[]; // Role codes
}

export interface RoleCapability {
  roleCode: string;
  roleName: string;
  department: string;
  summary: string;
  canDo: string[];
  cannotDo: string[];
}
