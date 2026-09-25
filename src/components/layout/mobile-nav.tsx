"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hotel, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navigationConfig, isNavItemActive } from "@/config/navigation";
import { PropertySelector } from "./property-selector";
import { Avatar } from "@/components/ui/avatar";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  // Close when pathname changes
  React.useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Close on Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Off-canvas sidebar drawer */}
      <div
        className={cn(
          "relative flex flex-col w-[280px] max-w-[85vw] h-full bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] text-white shadow-2xl z-10",
          "animate-in slide-in-from-left duration-250 ease-out"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-[var(--topbar-height)] px-4 border-b border-[var(--sidebar-border)] shrink-0">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 focus:outline-none"
          >
            <div className="h-8 w-8 rounded-[var(--radius)] bg-[var(--primary)] flex items-center justify-center shrink-0">
              <Hotel className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-[16px] tracking-tight leading-none">
                StayHub
              </span>
              <span className="text-[10px] text-[var(--sidebar-text)] opacity-70 tracking-widest uppercase font-semibold mt-0.5">
                Hospitality OS
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-[var(--radius)] text-[var(--sidebar-text)] hover:text-white hover:bg-[var(--sidebar-item-hover)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 sidebar-nav scrollbar-thin">
          {navigationConfig.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--sidebar-text)] px-3 mb-1.5 opacity-50">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-[13.5px] font-medium transition-all relative",
                      active
                        ? "bg-[var(--sidebar-item-active-bg)] text-white font-semibold"
                        : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-white"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--primary)] rounded-r-full" />
                    )}

                    <Icon
                      className={cn(
                        "shrink-0",
                        active ? "text-white" : "text-[var(--sidebar-text)]"
                      )}
                      style={{ width: 18, height: 18 }}
                    />

                    <span className="flex-1 truncate">{item.label}</span>

                    {item.badge != null && item.badge > 0 && (
                      <span className="bg-[var(--primary)] text-white text-[10px] font-bold rounded-full h-4.5 min-w-[18px] px-1.5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Property Selector */}
        <div className="px-3 py-2.5 border-t border-[var(--sidebar-border)] shrink-0">
          <PropertySelector variant="sidebar" />
        </div>

        {/* User Card */}
        <div className="px-3 py-3 border-t border-[var(--sidebar-border)] bg-black/10 shrink-0 flex items-center gap-3">
          <Avatar name="Koushik Dey" size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">
              Koushik Dey
            </p>
            <p className="text-[11px] text-[var(--sidebar-text)] truncate leading-tight mt-0.5">
              Hotel Owner · Super Admin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
