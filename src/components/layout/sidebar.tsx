"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Hotel } from "lucide-react";
import { navigationConfig, isNavItemActive } from "@/config/navigation";
import { PropertySelector } from "./property-selector";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export function Sidebar({ collapsed, onToggle, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40",
        "transition-[width] duration-300 ease-in-out shrink-0 select-none",
        collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]",
        className
      )}
      style={{
        background: "linear-gradient(180deg, var(--sidebar-bg) 0%, #0A1428 100%)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
      aria-label="Main navigation"
    >
      {/* ── Brand ── */}
      <div
        className={cn(
          "flex items-center h-[var(--topbar-height)] px-3.5 shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 rounded-[var(--radius-md)] p-1 -ml-1",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group"
          )}
          aria-label="StayHub Dashboard"
        >
          {/* Icon mark */}
          <div
            className="h-8 w-8 rounded-[var(--radius-md)] shrink-0 flex items-center justify-center shadow-lg overflow-hidden"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Hotel className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>

          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-white font-bold text-[14px] tracking-tight">
                StayHub
              </span>
              <span
                className="text-[8.5px] font-bold uppercase tracking-[0.16em] mt-[3px]"
                style={{ color: "var(--sidebar-section-label)" }}
              >
                Hospitality OS
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 overflow-y-auto py-3 space-y-4"
        style={{ scrollbarWidth: "none" }}
        aria-label="Sidebar navigation"
      >
        {navigationConfig.map((group) => (
          <div key={group.label} className="space-y-0.5 px-2.5">
            {!collapsed && (
              <p
                className="text-[9.5px] font-bold uppercase tracking-[0.14em] px-2 mb-1.5"
                style={{ color: "var(--sidebar-section-label)" }}
              >
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isNavItemActive(item, pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--radius-md)] relative group",
                    "transition-colors duration-100",
                    collapsed ? "justify-center h-9 w-9 mx-auto" : "px-2.5 py-2",
                    active
                      ? "text-white"
                      : "hover:text-[var(--sidebar-text-hover)]"
                  )}
                  style={active ? {
                    background: "var(--sidebar-item-active-bg)",
                    color: "var(--sidebar-text-active)",
                  } : {
                    color: "var(--sidebar-text)",
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  {/* Active indicator bar */}
                  {active && !collapsed && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                      style={{ background: "var(--gradient-brand)" }}
                    />
                  )}

                  <Icon
                    style={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      color: active ? "#A5B4FC" : undefined,
                      transition: "color 100ms",
                    }}
                  />

                  {!collapsed && (
                    <span className="flex-1 truncate text-[12.5px] font-medium">
                      {item.label}
                    </span>
                  )}

                  {!collapsed && item.badge != null && item.badge > 0 && (
                    <span
                      className="flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-white text-[9.5px] font-bold"
                      style={{ background: "var(--danger)" }}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <div
                      className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-[#0A1428] border border-[rgba(255,255,255,0.10)] text-white text-[12px] font-medium rounded-[var(--radius-md)] shadow-[var(--shadow-xl)] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 flex items-center gap-2"
                    >
                      {item.label}
                      {item.badge != null && item.badge > 0 && (
                        <span className="bg-[var(--danger)] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Property selector ── */}
      <div
        className="px-2.5 py-2.5 shrink-0"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <PropertySelector variant="sidebar" collapsed={collapsed} />
      </div>

      {/* ── Collapse toggle ── */}
      <div
        className="px-2.5 py-2.5 shrink-0"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex items-center gap-2 w-full rounded-[var(--radius-md)] px-2.5 py-2",
            "transition-colors duration-100 text-[12px] font-medium",
            collapsed ? "justify-center px-0" : ""
          )}
          style={{ color: "var(--sidebar-text)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sidebar-text-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sidebar-text)")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight style={{ width: 14, height: 14 }} />
          ) : (
            <>
              <ChevronLeft style={{ width: 14, height: 14 }} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
