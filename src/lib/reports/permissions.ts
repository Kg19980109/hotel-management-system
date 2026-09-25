// ============================================================
// STAYHUB REPORTING PERMISSIONS & ACCESS CONTROL (Phase 19)
// ============================================================

import type { RoleCode } from "../auth/roles";

export type ReportPermission =
  | "REPORTS_VIEW"
  | "REPORTS_EXPORT"
  | "REPORT_OCCUPANCY"
  | "REPORT_REVENUE"
  | "REPORT_RESERVATIONS"
  | "REPORT_GUESTS"
  | "REPORT_RESTAURANT"
  | "REPORT_KITCHEN"
  | "REPORT_HOUSEKEEPING"
  | "REPORT_MAINTENANCE"
  | "REPORT_INVENTORY"
  | "REPORT_SUPPLIERS"
  | "REPORT_STAFF"
  | "REPORT_EXPENSES"
  | "REPORT_FINANCIALS"
  | "REPORT_GUEST_SERVICES";

export const ROLE_REPORT_PERMISSIONS: Record<RoleCode, ReportPermission[]> = {
  SUPER_ADMIN: [
    "REPORTS_VIEW",
    "REPORTS_EXPORT",
    "REPORT_OCCUPANCY",
    "REPORT_REVENUE",
    "REPORT_RESERVATIONS",
    "REPORT_GUESTS",
    "REPORT_RESTAURANT",
    "REPORT_KITCHEN",
    "REPORT_HOUSEKEEPING",
    "REPORT_MAINTENANCE",
    "REPORT_INVENTORY",
    "REPORT_SUPPLIERS",
    "REPORT_STAFF",
    "REPORT_EXPENSES",
    "REPORT_FINANCIALS",
    "REPORT_GUEST_SERVICES",
  ],
  HOTEL_OWNER: [
    "REPORTS_VIEW",
    "REPORTS_EXPORT",
    "REPORT_OCCUPANCY",
    "REPORT_REVENUE",
    "REPORT_RESERVATIONS",
    "REPORT_GUESTS",
    "REPORT_RESTAURANT",
    "REPORT_KITCHEN",
    "REPORT_HOUSEKEEPING",
    "REPORT_MAINTENANCE",
    "REPORT_INVENTORY",
    "REPORT_SUPPLIERS",
    "REPORT_STAFF",
    "REPORT_EXPENSES",
    "REPORT_FINANCIALS",
    "REPORT_GUEST_SERVICES",
  ],
  GENERAL_MANAGER: [
    "REPORTS_VIEW",
    "REPORTS_EXPORT",
    "REPORT_OCCUPANCY",
    "REPORT_REVENUE",
    "REPORT_RESERVATIONS",
    "REPORT_GUESTS",
    "REPORT_RESTAURANT",
    "REPORT_KITCHEN",
    "REPORT_HOUSEKEEPING",
    "REPORT_MAINTENANCE",
    "REPORT_INVENTORY",
    "REPORT_SUPPLIERS",
    "REPORT_STAFF",
    "REPORT_EXPENSES",
    "REPORT_FINANCIALS",
    "REPORT_GUEST_SERVICES",
  ],
  ACCOUNTANT: [
    "REPORTS_VIEW",
    "REPORTS_EXPORT",
    "REPORT_OCCUPANCY",
    "REPORT_REVENUE",
    "REPORT_FINANCIALS",
    "REPORT_EXPENSES",
    "REPORT_SUPPLIERS",
    "REPORT_INVENTORY",
  ],
  FRONT_DESK: [
    "REPORTS_VIEW",
    "REPORTS_EXPORT",
    "REPORT_OCCUPANCY",
    "REPORT_RESERVATIONS",
    "REPORT_GUESTS",
    "REPORT_GUEST_SERVICES",
  ],
  RECEPTIONIST: [
    "REPORTS_VIEW",
    "REPORT_OCCUPANCY",
    "REPORT_RESERVATIONS",
    "REPORT_GUESTS",
    "REPORT_GUEST_SERVICES",
  ],
  HOUSEKEEPING: [
    "REPORTS_VIEW",
    "REPORT_HOUSEKEEPING",
  ],
  MAINTENANCE: [
    "REPORTS_VIEW",
    "REPORT_MAINTENANCE",
  ],
  RESTAURANT_STAFF: [
    "REPORTS_VIEW",
    "REPORT_RESTAURANT",
    "REPORT_KITCHEN",
  ],
  KITCHEN_STAFF: [
    "REPORTS_VIEW",
    "REPORT_KITCHEN",
    "REPORT_RESTAURANT",
  ],
};

/**
 * Check whether a user role has permission to access a specific report
 */
export function hasReportPermission(
  role: string | null | undefined,
  permission: ReportPermission
): boolean {
  if (!role) return false;
  const roleCode = role as RoleCode;
  const permissions = ROLE_REPORT_PERMISSIONS[roleCode];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check if the user is authorized for cross-property / multi-property aggregation
 */
export function canAccessCrossPropertyReports(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "HOTEL_OWNER";
}

/**
 * Determine which report navigation tabs are accessible for a given role
 */
export function getAccessibleReportRoutes(role: string | null | undefined): Array<{
  href: string;
  label: string;
  permission: ReportPermission;
  category: "overview" | "operations" | "financial" | "resources";
}> {
  const allRoutes: Array<{
    href: string;
    label: string;
    permission: ReportPermission;
    category: "overview" | "operations" | "financial" | "resources";
  }> = [
    { href: "/reports", label: "Executive Dashboard", permission: "REPORTS_VIEW", category: "overview" },
    { href: "/reports/occupancy", label: "Occupancy", permission: "REPORT_OCCUPANCY", category: "operations" },
    { href: "/reports/rooms", label: "Room Performance", permission: "REPORT_OCCUPANCY", category: "operations" },
    { href: "/reports/reservations", label: "Reservations", permission: "REPORT_RESERVATIONS", category: "operations" },
    { href: "/reports/front-desk", label: "Front Desk & Stays", permission: "REPORT_RESERVATIONS", category: "operations" },
    { href: "/reports/guests", label: "Guest Analytics", permission: "REPORT_GUESTS", category: "operations" },
    { href: "/reports/revenue", label: "Revenue Analytics", permission: "REPORT_REVENUE", category: "financial" },
    { href: "/reports/financials", label: "Financial & Invoices", permission: "REPORT_FINANCIALS", category: "financial" },
    { href: "/reports/restaurant", label: "Restaurant & POS", permission: "REPORT_RESTAURANT", category: "operations" },
    { href: "/reports/kitchen", label: "Kitchen Display (KDS)", permission: "REPORT_KITCHEN", category: "operations" },
    { href: "/reports/housekeeping", label: "Housekeeping", permission: "REPORT_HOUSEKEEPING", category: "operations" },
    { href: "/reports/maintenance", label: "Maintenance", permission: "REPORT_MAINTENANCE", category: "operations" },
    { href: "/reports/inventory", label: "Inventory & Stock", permission: "REPORT_INVENTORY", category: "resources" },
    { href: "/reports/inventory/consumption", label: "Inventory Consumption", permission: "REPORT_INVENTORY", category: "resources" },
    { href: "/reports/suppliers", label: "Suppliers & POs", permission: "REPORT_SUPPLIERS", category: "resources" },
    { href: "/reports/staff", label: "Staff & Attendance", permission: "REPORT_STAFF", category: "resources" },
    { href: "/reports/expenses", label: "Staff Expenses", permission: "REPORT_EXPENSES", category: "financial" },
    { href: "/reports/guest-services", label: "Guest Services", permission: "REPORT_GUEST_SERVICES", category: "operations" },
  ];

  return allRoutes.filter((r) => hasReportPermission(role, r.permission));
}
