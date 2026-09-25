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
  Package,
  UsersRound,
  Receipt,
  Wallet,
  TrendingUp,
  Megaphone,
  BrainCircuit,
  Settings,
  Globe,
  Blocks,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ============================================================
// NAVIGATION CONFIG — StayHub
//
// Central source of truth for all navigation items.
// Future RBAC will filter by `permission` field.
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
  /** Future RBAC permission key */
  permission?: string;
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
    ],
  },
  {
    label: "Restaurant",
    items: [
      {
        label: "Restaurant / POS",
        href: "/restaurant",
        icon: UtensilsCrossed,
        matchPaths: ["/restaurant/pos", "/restaurant/menu", "/restaurant/tables", "/restaurant/orders"],
        permission: "restaurant.view",
      },
      {
        label: "Kitchen (KDS)",
        href: "/restaurant/kds",
        icon: ChefHat,
        matchPaths: ["/restaurant/kds/history", "/restaurant/kitchen/stations", "/kitchen"],
        permission: "kitchen.view",
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
        matchPaths: ["/qr-services/rooms", "/qr-services/tables", "/qr-services/requests"],
        permission: "qr_services.view",
      },
      {
        label: "Online Booking",
        href: "/online-booking",
        icon: Globe,
        permission: "online_booking.view",
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        label: "Inventory",
        href: "/inventory",
        icon: Package,
        permission: "inventory.view",
      },
      {
        label: "Staff",
        href: "/staff",
        icon: UsersRound,
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
      {
        label: "Marketing",
        href: "/marketing",
        icon: Megaphone,
        permission: "marketing.view",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "AI Buddy",
        href: "/ai",
        icon: BrainCircuit,
        permission: "ai.view",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
        permission: "notifications.view",
      },
      {
        label: "Integrations",
        href: "/integrations",
        icon: Blocks,
        permission: "integrations.view",
      },
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
