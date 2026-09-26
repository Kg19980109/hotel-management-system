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
            "flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl group",
            collapsed ? "justify-center" : ""
          )}
          aria-label="StayHub Home"
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Hotel className="h-5 w-5 text-slate-950 font-bold" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-white font-serif font-black text-lg tracking-tight leading-none flex items-center gap-1">
                StayHub <span className="text-amber-400 text-xs">★</span>
              </span>
              <span className="text-[9.5px] text-amber-400/80 tracking-widest uppercase font-bold mt-1">
                Luxury Hospitality OS
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Groups */}
      <nav
        className="flex-1 overflow-y-auto py-4 space-y-5 px-3 sidebar-nav scrollbar-thin"
        aria-label="Sidebar sections"
      >
        {navigationConfig.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400/70 px-3 mb-1">
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium",
                    "transition-all duration-150 relative group",
                    collapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "",
                    active
                      ? "bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-transparent text-white border border-indigo-500/30 shadow-xs font-bold"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {/* Left active border indicator */}
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-gradient-to-b from-amber-400 to-indigo-500 rounded-r-full shadow-sm shadow-amber-400/50" />
                  )}

                  <Icon
                    className={cn(
                      "shrink-0 transition-transform duration-150 group-hover:scale-110",
                      active ? "text-amber-400" : "text-slate-400 group-hover:text-white"
                    )}
                    style={{ width: 18, height: 18 }}
                  />

                  {!collapsed && (
                    <span className="flex-1 truncate tracking-tight">{item.label}</span>
                  )}

                  {!collapsed && item.badge != null && item.badge > 0 && (
                    <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-extrabold rounded-full h-4.5 min-w-[18px] px-1.5 flex items-center justify-center shadow-xs">
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
