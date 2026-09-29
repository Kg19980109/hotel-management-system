import {
  LayoutDashboard,
  CalendarDays,
  MonitorCheck,
  BedDouble,
  Users,
  Sparkles,
  Wrench,
  UtensilsCrossed,
  ChefHat,
  QrCode,
  UsersRound,
  Receipt,
  Wallet,
  TrendingUp,
  Settings,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PermissionKey } from "@/lib/auth/permissions";

// ============================================================
// NAVIGATION CONFIG — StayHub
//
// Central source of truth for all navigation items.
// RBAC filters items dynamically via `permission` field.
// Active state matching uses `matchPaths` in addition to `href`.
// ============================================================

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Badge count (e.g. pending bookings) — optional */
  badge?: number;
  /** Additional paths that should trigger "active" state for this item */
  matchPaths?: string[];
  /** RBAC permission key */
  permission?: PermissionKey;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigationConfig: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard.view",
      },
      {
        label: "My Operational Work",
        href: "/staff/my-work",
        icon: Sparkles,
      },
      {
        label: "My Profile",
        href: "/staff/profile",
        icon: Users,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Bookings",
        href: "/bookings",
        icon: CalendarDays,
        matchPaths: ["/bookings/calendar", "/bookings/new"],
        badge: 3,
        permission: "bookings.view",
      },
      {
        label: "Front Desk",
        href: "/front-desk",
        icon: MonitorCheck,
        permission: "front_desk.view",
      },
      {
        label: "Rooms",
        href: "/rooms",
        icon: BedDouble,
        matchPaths: ["/rooms/calendar", "/rooms/floor-view"],
        permission: "rooms.view",
      },
      {
        label: "Guests",
        href: "/guests",
        icon: Users,
        permission: "guests.view",
      },
      {
        label: "Housekeeping",
        href: "/housekeeping",
        icon: Sparkles,
        matchPaths: ["/housekeeping/inspections"],
        permission: "housekeeping.view",
      },
      {
        label: "Maintenance",
        href: "/maintenance",
        icon: Wrench,
        matchPaths: ["/maintenance/new"],
        permission: "maintenance.view",
      },
      {
        label: "Guest Requests",
        href: "/guest-requests",
        icon: Bell,
        matchPaths: ["/guest-requests"],
        permission: "guest_requests.view",
      },
    ],
  },
  {
    label: "POS & Menu",
    items: [
      {
        label: "POS (Billing)",
        href: "/pos",
        icon: UtensilsCrossed,
        permission: "pos.view",
      },
      {
        label: "Kitchen (KDS)",
        href: "/kitchen",
        icon: ChefHat,
        matchPaths: ["/kitchen", "/restaurant/kds"],
        permission: "kitchen.view",
      },
      {
        label: "POS Configuration",
        href: "/pos-configuration",
        icon: Settings,
        permission: "pos.config",
      },
      {
        label: "Menu Configuration",
        href: "/menu-configuration",
        icon: ChefHat,
        permission: "menu.config",
      },
    ],
  },
  {
    label: "Guest Experience",
    items: [
      {
        label: "QR Services",
        href: "/qr-services",
        icon: QrCode,
        matchPaths: ["/qr-services/rooms", "/qr-services/tables", "/qr-services/requests", "/qr-services/dining"],
        permission: "qr_services.view",
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        label: "Staff",
        href: "/staff",
        icon: UsersRound,
        matchPaths: ["/staff/my-work", "/staff/profile"],
        permission: "staff.view",
      },
      {
        label: "Billing",
        href: "/billing",
        icon: Wallet,
        matchPaths: ["/billing/folios", "/billing/invoices", "/billing/payments"],
        permission: "billing.view",
      },
      {
        label: "Expenses",
        href: "/expenses",
        icon: Receipt,
        permission: "expenses.view",
      },
      {
        label: "Reports",
        href: "/reports",
        icon: TrendingUp,
        permission: "reports.view",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        permission: "settings.view",
      },
    ],
  },
];

/**
 * Determines if a nav item is active given the current pathname.
 * Matches the item's href exactly, or checks if the pathname starts
 * with the href (for nested routes), or matches any of the `matchPaths`.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  // Allow sub-routes like /bookings/123 to keep Bookings active
  if (pathname.startsWith(item.href + "/")) return true;
  // Explicit match paths (e.g. /bookings/calendar)
  if (item.matchPaths?.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  return false;
}

/**
 * Filters the navigation tree based on the user's role and resolved permission set.
 * If the role is SUPER_ADMIN or HOTEL_OWNER, all navigation items are displayed.
 * Otherwise, items requiring a permission key are checked against `hasPermissionFn`.
 * If all items in a group are hidden, the entire group is filtered out.
 */
export function getFilteredNavigation(
  groups: NavGroup[],
  hasPermissionFn: (key: PermissionKey) => boolean,
  roleCode?: string | null
): NavGroup[] {
  if (roleCode === "SUPER_ADMIN" || roleCode === "HOTEL_OWNER") {
    return groups;
  }

  const filtered: NavGroup[] = [];

  for (const group of groups) {
    const visibleItems = group.items.filter((item) => {
      if (!item.permission) return true;
      return hasPermissionFn(item.permission);
    });

    if (visibleItems.length > 0) {
      filtered.push({
        ...group,
        items: visibleItems,
      });
    }
  }

  return filtered;
}
