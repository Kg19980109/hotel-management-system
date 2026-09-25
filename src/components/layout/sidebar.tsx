"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  MonitorCheck,
  BedDouble,
  Users,
  Sparkles,
  UtensilsCrossed,
  Package,
  Receipt,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Hotel,
  LogOut,
  Bell,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

// ============================================================
// NAVIGATION ITEMS
// ============================================================

const navGroups = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Bookings", href: "/bookings", icon: CalendarDays, badge: 3 },
      { label: "Front Desk", href: "/front-desk", icon: MonitorCheck },
    ],
  },
  {
    label: "Property",
    items: [
      { label: "Rooms", href: "/rooms", icon: BedDouble },
      { label: "Guests", href: "/guests", icon: Users },
      { label: "Housekeeping", href: "/housekeeping", icon: Sparkles },
    ],
  },
  {
    label: "F&B",
    items: [
      { label: "Restaurant / POS", href: "/restaurant", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Finance & Ops",
    items: [
      { label: "Inventory", href: "/inventory", icon: Package },
      { label: "Expenses", href: "/expenses", icon: Receipt },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

// ============================================================
// SIDEBAR
// ============================================================

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] fixed left-0 top-0 z-40",
        "transition-[width] duration-300 ease-in-out shrink-0",
        collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]"
      )}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-[var(--topbar-height)] px-4 border-b border-[var(--sidebar-border)] shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[var(--radius)] bg-[var(--primary)] flex items-center justify-center">
              <Hotel className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-bold text-[16px] tracking-tight">StayHub</span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-[var(--radius)] bg-[var(--primary)] flex items-center justify-center">
            <Hotel className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-3 sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--sidebar-text)] px-2 mb-1.5 mt-2 opacity-60">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-[13.5px] font-medium",
                    "transition-all duration-150 relative group",
                    collapsed ? "justify-center" : "",
                    isActive
                      ? "bg-[var(--sidebar-item-active-bg)] text-white"
                      : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-white"
                  )}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* Active indicator bar */}
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--primary)] rounded-r-full" />
                  )}
                  <item.icon
                    className={cn(
                      "shrink-0",
                      isActive ? "h-4.5 w-4.5" : "h-4.5 w-4.5",
                    )}
                    style={{ width: 18, height: 18 }}
                  />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!collapsed && item.badge != null && item.badge > 0 && (
                    <span className="bg-[var(--primary)] text-white text-[10px] font-bold rounded-full h-4.5 min-w-[18px] px-1 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {/* Tooltip for collapsed mode */}
                  {collapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--foreground)] text-white text-[12px] rounded-[var(--radius-sm)] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Property Selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-[var(--sidebar-border)] shrink-0">
          <div className="flex items-center gap-2.5 bg-white/5 rounded-[var(--radius)] px-3 py-2.5 hover:bg-white/10 cursor-pointer transition-colors">
            <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[11px] font-bold">GH</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-medium truncate">Grand Horizon</p>
              <p className="text-[var(--sidebar-text)] text-[11px] truncate">Mumbai · 120 rooms</p>
            </div>
            <ChevronRight className="text-[var(--sidebar-text)] shrink-0" style={{ width: 14, height: 14 }} />
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="px-3 py-3 border-t border-[var(--sidebar-border)] shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-2 w-full rounded-[var(--radius)] px-3 py-2",
            "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-white",
            "transition-colors text-[13px] font-medium",
            collapsed ? "justify-center" : ""
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight style={{ width: 16, height: 16 }} />
          ) : (
            <>
              <ChevronLeft style={{ width: 16, height: 16 }} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

// ============================================================
// TOPBAR
// ============================================================

interface TopbarProps {
  sidebarCollapsed: boolean;
}

const Topbar = ({ sidebarCollapsed }: TopbarProps) => {
  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex items-center h-[var(--topbar-height)]",
        "bg-[var(--topbar-bg)] border-b border-[var(--topbar-border)]",
        "px-6 gap-4 transition-[left] duration-300 ease-in-out",
      )}
      style={{
        left: sidebarCollapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
      }}
    >
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center">
          <span className="absolute left-3 pointer-events-none text-[var(--foreground-subtle)]">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search by guest name, booking ID, room..."
            className={cn(
              "h-9 w-full pl-9 pr-4 rounded-[var(--radius)] text-[13px]",
              "bg-[var(--secondary)] border border-transparent",
              "text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)]",
              "focus:outline-none focus:bg-white focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--ring)]",
              "transition-all"
            )}
            aria-label="Global search"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="relative h-9 w-9 rounded-[var(--radius)] flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Notifications"
        >
          <Bell style={{ width: 18, height: 18 }} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[var(--danger)] rounded-full border-2 border-white" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-[var(--border)] mx-1" />

        {/* User Menu */}
        <button
          className="flex items-center gap-2.5 rounded-[var(--radius)] px-2 py-1.5 hover:bg-[var(--secondary)] transition-colors"
          aria-label="User menu"
          aria-haspopup="menu"
        >
          <Avatar name="Koushik Dey" size="sm" />
          <div className="text-left hidden sm:block">
            <p className="text-[13px] font-semibold text-[var(--foreground)] leading-tight">Koushik Dey</p>
            <p className="text-[11px] text-[var(--foreground-muted)] leading-tight">Hotel Owner</p>
          </div>
          <ChevronRight
            className="text-[var(--foreground-subtle)] rotate-90 hidden sm:block"
            style={{ width: 14, height: 14 }}
          />
        </button>
      </div>
    </header>
  );
};

export { Sidebar, Topbar };
