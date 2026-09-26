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
        "hidden lg:flex flex-col h-screen border-r fixed left-0 top-0 z-40",
        "transition-[width] duration-300 ease-in-out shrink-0 select-none",
        collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]",
        className
      )}
      style={{
        background: "linear-gradient(180deg, #070c18 0%, #0a0f20 60%, #070c18 100%)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
      aria-label="Main navigation"
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex items-center h-[var(--topbar-height)] px-4 shrink-0",
          collapsed ? "justify-center" : "justify-between",
        )}
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-xl group",
            collapsed ? "justify-center" : ""
          )}
          aria-label="StayHub Home"
        >
          {/* Logo icon */}
          <div className="relative h-9 w-9 rounded-xl shrink-0 flex items-center justify-center shadow-lg overflow-hidden"
            style={{ background: "linear-gradient(135deg, #5046e4, #7c3aed)" }}>
            <Hotel className="h-5 w-5 text-white" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
          </div>

          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-white font-black text-[15px] tracking-tight leading-none">
                StayHub
                <span className="text-amber-400 text-sm ml-1">★</span>
              </span>
              <span className="text-[9px] text-slate-500 tracking-[0.14em] uppercase font-bold mt-0.5">
                Hospitality OS
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Groups */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4"
        style={{ scrollbarWidth: "none" }}
        aria-label="Sidebar sections"
      >
        {navigationConfig.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-600 px-2.5 mb-1.5">
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
                    "flex items-center gap-2.5 rounded-xl text-[12.5px] font-medium relative group",
                    "transition-all duration-150",
                    collapsed
                      ? "justify-center h-10 w-10 mx-auto p-0"
                      : "px-2.5 py-2.5",
                    active
                      ? "text-white font-bold"
                      : "text-slate-500 hover:text-slate-200"
                  )}
                  style={
                    active
                      ? {
                          background: "linear-gradient(90deg, rgba(80,70,228,0.22) 0%, rgba(80,70,228,0.08) 100%)",
                          border: "1px solid rgba(80,70,228,0.25)",
                        }
                      : undefined
                  }
                  aria-current={active ? "page" : undefined}
                >
                  {/* Active left glow bar */}
                  {active && !collapsed && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                      style={{ background: "linear-gradient(180deg, #818cf8, #a78bfa)" }}
                    />
                  )}

                  <Icon
                    className={cn(
                      "shrink-0 transition-all duration-150",
                      active
                        ? "text-indigo-300"
                        : "text-slate-500 group-hover:text-slate-300"
                    )}
                    style={{ width: 17, height: 17 }}
                  />

                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}

                  {!collapsed && item.badge != null && item.badge > 0 && (
                    <span
                      className="text-white text-[9.5px] font-extrabold rounded-full h-4.5 min-w-[17px] px-1.5 flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip in collapsed mode */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0f172a] border border-slate-700 text-white text-[11.5px] font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
                      {item.label}
                      {item.badge != null && item.badge > 0 && (
                        <span className="bg-indigo-600 text-white text-[9.5px] font-bold rounded-full px-1.5 py-0.5">
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
      <div className="px-2.5 py-2.5 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <PropertySelector variant="sidebar" collapsed={collapsed} />
      </div>

      {/* Collapse Toggle */}
      <div className="px-2.5 py-2.5 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex items-center gap-2 w-full rounded-xl px-3 py-2",
            "text-slate-600 hover:text-slate-300 hover:bg-white/5",
            "transition-colors text-[12px] font-medium",
            collapsed ? "justify-center px-0" : ""
          )}
          aria-label={collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
        >
          {collapsed ? (
            <ChevronRight style={{ width: 15, height: 15 }} />
          ) : (
            <>
              <ChevronLeft style={{ width: 15, height: 15 }} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
