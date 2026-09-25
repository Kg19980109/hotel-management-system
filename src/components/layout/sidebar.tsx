"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Hotel,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
        "hidden lg:flex flex-col h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] fixed left-0 top-0 z-40",
        "transition-[width] duration-300 ease-in-out shrink-0 select-none",
        collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]",
        className
      )}
      aria-label="Main navigation"
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex items-center h-[var(--topbar-height)] px-4 border-b border-[var(--sidebar-border)] shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-[var(--radius)]",
            collapsed ? "justify-center" : ""
          )}
          aria-label="StayHub Home"
        >
          <div className="h-8 w-8 rounded-[var(--radius)] bg-[var(--primary)] flex items-center justify-center shrink-0 shadow-sm">
            <Hotel className="h-4.5 w-4.5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-white font-bold text-[16px] tracking-tight leading-none">
                StayHub
              </span>
              <span className="text-[10px] text-[var(--sidebar-text)] opacity-70 tracking-widest uppercase font-semibold mt-0.5">
                Hospitality OS
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Groups */}
      <nav
        className="flex-1 overflow-y-auto py-3 space-y-4 px-3 sidebar-nav scrollbar-thin"
        aria-label="Sidebar sections"
      >
        {navigationConfig.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--sidebar-text)] px-3 mb-1.5 opacity-50">
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
                    "flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-[13px] font-medium",
                    "transition-all duration-150 relative group",
                    collapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "",
                    active
                      ? "bg-[var(--sidebar-item-active-bg)] text-white shadow-xs font-semibold"
                      : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {/* Left active border indicator */}
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--primary)] rounded-r-full" />
                  )}

                  <Icon
                    className={cn(
                      "shrink-0 transition-transform duration-150",
                      active ? "text-white" : "text-[var(--sidebar-text)] group-hover:text-white"
                    )}
                    style={{ width: 18, height: 18 }}
                  />

                  {!collapsed && (
                    <span className="flex-1 truncate tracking-tight">{item.label}</span>
                  )}

                  {!collapsed && item.badge != null && item.badge > 0 && (
                    <span className="bg-[var(--primary)] text-white text-[10px] font-bold rounded-full h-4.5 min-w-[18px] px-1.5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0F172A] border border-[var(--sidebar-border)] text-white text-[12px] font-medium rounded-[var(--radius)] shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="bg-[var(--primary)] text-white text-[10px] font-bold rounded-full px-1.5 py-0.2">
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

      {/* Property Selector */}
      <div className="px-3 py-2.5 border-t border-[var(--sidebar-border)] shrink-0">
        <PropertySelector variant="sidebar" collapsed={collapsed} />
      </div>

      {/* Collapse Toggle Footer */}
      <div className="px-3 py-2 border-t border-[var(--sidebar-border)] shrink-0">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex items-center gap-2 w-full rounded-[var(--radius)] px-3 py-2",
            "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-white",
            "transition-colors text-[12.5px] font-medium",
            collapsed ? "justify-center px-0" : ""
          )}
          aria-label={collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
        >
          {collapsed ? (
            <ChevronRight style={{ width: 16, height: 16 }} />
          ) : (
            <>
              <ChevronLeft style={{ width: 16, height: 16 }} />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
