// ============================================================
// STAYHUB ROLE DEFINITIONS & AUTHORIZATION HELPERS
// Phase 4: Centralized Role-Based Access Control Foundation
// ============================================================

export type RoleCode =
  | "SUPER_ADMIN"
  | "HOTEL_OWNER"
  | "GENERAL_MANAGER"
  | "FRONT_DESK"
  | "RECEPTIONIST"
  | "HOUSEKEEPING"
  | "MAINTENANCE"
  | "RESTAURANT_STAFF"
  | "KITCHEN_STAFF"
  | "ACCOUNTANT";

export interface RoleInfo {
  code: RoleCode;
  name: string;
  description: string;
  level: number;
}

export const ROLES: Record<RoleCode, RoleInfo> = {
  SUPER_ADMIN: {
    code: "SUPER_ADMIN",
    name: "Platform Super Administrator",
    description: "Full platform-level administration across all organizations and properties",
    level: 100,
  },
  HOTEL_OWNER: {
    code: "HOTEL_OWNER",
    name: "Hotel Owner",
    description: "Primary property administrator with full financial, operational, and staff authority",
    level: 90,
  },
  GENERAL_MANAGER: {
    code: "GENERAL_MANAGER",
    name: "General Manager",
    description: "Operational leader managing day-to-day hotel activities, inventory, and staff",
    level: 80,
  },
  FRONT_DESK: {
    code: "FRONT_DESK",
    name: "Front Desk Supervisor",
    description: "Front desk lead managing check-ins, reservations, folios, and reception staff",
    level: 60,
  },
  RECEPTIONIST: {
    code: "RECEPTIONIST",
    name: "Receptionist",
    description: "Front desk agent handling walk-ins, guest check-in/out, and inquiries",
    level: 50,
  },
  ACCOUNTANT: {
    code: "ACCOUNTANT",
    name: "Accountant",
    description: "Financial officer handling vendor payables, tax invoices, and revenue reports",
    level: 50,
  },
  HOUSEKEEPING: {
    code: "HOUSEKEEPING",
    name: "Housekeeping Staff",
    description: "Room attendant updating cleaning statuses, inspection results, and linen",
    level: 40,
  },
  MAINTENANCE: {
    code: "MAINTENANCE",
    name: "Maintenance Technician",
    description: "Facilities engineer handling room repair tickets and work orders",
    level: 40,
  },
  RESTAURANT_STAFF: {
    code: "RESTAURANT_STAFF",
    name: "Restaurant / F&B Staff",
    description: "Dining server managing table orders, room bill charges, and POS",
    level: 40,
  },
  KITCHEN_STAFF: {
    code: "KITCHEN_STAFF",
    name: "Kitchen Staff / Chef",
    description: "Kitchen Display System operator preparing orders and updating statuses",
    level: 40,
  },
};

// ============================================================
// CENTRALIZED AUTHORIZATION HELPERS
// ============================================================

export function isSuperAdmin(role?: string | null): boolean {
  return role === "SUPER_ADMIN";
}

export function isHotelManager(role?: string | null): boolean {
  return role === "SUPER_ADMIN" || role === "HOTEL_OWNER" || role === "GENERAL_MANAGER";
}

export function canManageStaff(role?: string | null): boolean {
  return role === "SUPER_ADMIN" || role === "HOTEL_OWNER" || role === "GENERAL_MANAGER";
}

export function canViewFinancials(role?: string | null): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "HOTEL_OWNER" ||
    role === "GENERAL_MANAGER" ||
    role === "ACCOUNTANT"
  );
}

export function canPerformCheckIn(role?: string | null): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "HOTEL_OWNER" ||
    role === "GENERAL_MANAGER" ||
    role === "FRONT_DESK" ||
    role === "RECEPTIONIST"
  );
}

export function getRoleBadgeColor(role?: string | null): "primary" | "success" | "warning" | "info" | "neutral" {
  switch (role) {
    case "SUPER_ADMIN":
      return "primary";
    case "HOTEL_OWNER":
      return "warning";
    case "GENERAL_MANAGER":
      return "info";
    case "FRONT_DESK":
    case "RECEPTIONIST":
      return "success";
    default:
      return "neutral";
  }
}
