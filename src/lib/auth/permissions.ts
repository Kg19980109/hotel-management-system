// ============================================================
// STAYHUB GRANULAR PERMISSION RESOLVER & SECURITY FOUNDATION
// Phase 1: Granular Permission Schema & Security Foundation
// ============================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { RoleCode } from "./roles";

// Type-safe master permission keys
export type PermissionKey =
  // Overview & Dashboard
  | "dashboard.view"

  // Front Desk
  | "front_desk.view"
  | "front_desk.check_in"
  | "front_desk.check_out"
  | "front_desk.room_assign"

  // Room Inventory
  | "rooms.view"
  | "rooms.status_update"
  | "rooms.manage"

  // Bookings & Reservations
  | "bookings.view"
  | "bookings.create"
  | "bookings.manage"
  | "bookings.financials"

  // Guests & CRM
  | "guests.view"
  | "guests.manage"

  // Housekeeping
  | "housekeeping.view"
  | "housekeeping.assign"
  | "housekeeping.update"
  | "housekeeping.complete"
  | "housekeeping.inspect"
  | "housekeeping.manage"

  // Maintenance & Engineering
  | "maintenance.view"
  | "maintenance.create"
  | "maintenance.assign"
  | "maintenance.update"
  | "maintenance.resolve"
  | "maintenance.manage"

  // Guest Service Requests
  | "guest_requests.view"
  | "guest_requests.assign"
  | "guest_requests.update"
  | "guest_requests.resolve"

  // POS & Dining
  | "pos.view"
  | "pos.order_create"
  | "pos.room_charge"
  | "pos.config"

  // Menu Configuration
  | "menu.view"
  | "menu.config"

  // Kitchen Display System (KDS)
  | "kitchen.view"
  | "kitchen.update"
  | "kitchen.manage"

  // QR Services
  | "qr_services.view"
  | "qr_services.manage"

  // Staff Administration
  | "staff.view"
  | "staff.create"
  | "staff.edit"
  | "staff.manage_roles"
  | "staff.departments"

  // Attendance & Shifts
  | "attendance.view"
  | "attendance.manage"

  // Billing & Folios
  | "billing.view"
  | "billing.folio_charge"
  | "billing.invoices"
  | "billing.refunds_discounts"
  | "billing.manage"

  // Hotel Expenses
  | "expenses.view"
  | "expenses.create"
  | "expenses.approve"

  // Reports & Analytics
  | "reports.view"
  | "reports.export"
  | "reports.financials"
  | "reports.operational"

  // Inventory
  | "inventory.view"
  | "inventory.manage"

  // System & Settings
  | "settings.view"
  | "settings.manage";

export type PermissionModule =
  | "dashboard"
  | "front_desk"
  | "rooms"
  | "bookings"
  | "guests"
  | "housekeeping"
  | "maintenance"
  | "guest_requests"
  | "pos"
  | "menu"
  | "kitchen"
  | "qr_services"
  | "staff"
  | "attendance"
  | "billing"
  | "expenses"
  | "reports"
  | "inventory"
  | "settings";

export interface PermissionRecord {
  id: string;
  key: PermissionKey;
  module: PermissionModule;
  name: string;
  description: string | null;
  permission_type: "MODULE" | "ACTION";
  display_order: number;
}

export interface EffectivePermission {
  permission_key: PermissionKey;
  module: PermissionModule;
  permission_type: "MODULE" | "ACTION";
}

/**
 * Resolves the effective permissions for a user in a specific property context
 * using the high-performance PostgreSQL RPC `get_user_effective_permissions`.
 */
export async function getEffectivePermissions(
  supabase: SupabaseClient,
  propertyId: string,
  userId?: string
): Promise<Set<PermissionKey>> {
  if (!propertyId) return new Set();

  try {
    const params: { p_property_id: string; p_user_id?: string } = {
      p_property_id: propertyId,
    };
    if (userId) {
      params.p_user_id = userId;
    }

    const { data, error } = await supabase.rpc("get_user_effective_permissions", params);

    if (error || !data) {
      console.error("Error resolving effective permissions:", error);
      return new Set();
    }

    const rows = data as EffectivePermission[];
    return new Set(rows.map((r) => r.permission_key));
  } catch (err) {
    console.error("Unexpected error in getEffectivePermissions:", err);
    return new Set();
  }
}

/**
 * Synchronously tests if a permission key is granted in an effective permission set
 */
export function hasEffectivePermission(
  permissions: Set<PermissionKey> | PermissionKey[] | undefined | null,
  requiredPermission: PermissionKey
): boolean {
  if (!permissions) return false;
  if (permissions instanceof Set) {
    return permissions.has(requiredPermission);
  }
  return permissions.includes(requiredPermission);
}

/**
 * Server Action authorization guard.
 * Validates active session, active property membership, and required granular permission.
 */
export async function requirePermission(
  propertyId: string,
  requiredPermission: PermissionKey
): Promise<{
  authorized: boolean;
  userId?: string;
  roleCode?: RoleCode;
  error?: string;
}> {
  if (!propertyId) {
    return { authorized: false, error: "Property context is required." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, error: "Authentication required. Please sign in." };
  }

  // 1. Verify property membership and role
  const { data: membership, error: memberError } = await supabase
    .from("property_memberships")
    .select(`
      id,
      status,
      role:roles (
        code
      )
    `)
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (memberError || !membership) {
    return {
      authorized: false,
      error: "Access denied: No active membership for this property.",
    };
  }

  const roleObj = membership.role as unknown as { code?: string } | null;
  const roleCode = (roleObj?.code || "STAFF") as RoleCode;

  // 2. Super Admin and Hotel Owner have universal bypass
  if (roleCode === "SUPER_ADMIN" || roleCode === "HOTEL_OWNER") {
    return { authorized: true, userId: user.id, roleCode };
  }

  // 3. Evaluate granular permission via RPC
  const { data: hasPerm, error: permError } = await supabase.rpc(
    "user_has_effective_permission",
    {
      check_user_id: user.id,
      check_property_id: propertyId,
      required_permission: requiredPermission,
    }
  );

  if (permError || !hasPerm) {
    return {
      authorized: false,
      userId: user.id,
      roleCode,
      error: `Access denied: Your role (${roleCode}) lacks the '${requiredPermission}' permission.`,
    };
  }

  return { authorized: true, userId: user.id, roleCode };
}
