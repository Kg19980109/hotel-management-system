"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Plus,
  LogIn,
  LogOut,
  UserPlus,
  BedDouble,
  ChevronDown,
} from "lucide-react";

export function DashboardQuickActions() {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-flex items-center gap-2" ref={menuRef}>
      {/* Primary Action */}
      <Link href="/bookings/new">
        <Button variant="primary" size="sm" className="shadow-sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Booking
        </Button>
      </Link>

      {/* Quick Actions Dropdown */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="px-2.5"
      >
        Actions
        <ChevronDown className="h-3.5 w-3.5 ml-1 text-[var(--foreground-muted)]" />
      </Button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-52 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-3 py-1 text-[11px] font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider">
            Quick Operations
          </div>

          <Link
            href="/front-desk"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
          >
            <LogIn className="h-4 w-4 text-[var(--success)]" />
            <span>Check In Guest</span>
          </Link>

          <Link
            href="/front-desk"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
          >
            <LogOut className="h-4 w-4 text-[var(--warning)]" />
            <span>Check Out Guest</span>
          </Link>

          <div className="my-1 border-t border-[var(--border)]" />

          <Link
            href="/guests"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
          >
            <UserPlus className="h-4 w-4 text-[var(--info)]" />
            <span>Add New Guest</span>
          </Link>

          <Link
            href="/rooms"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
          >
            <BedDouble className="h-4 w-4 text-[var(--primary)]" />
            <span>View Rooms & Inventory</span>
          </Link>
        </div>
      )}
    </div>
  );
}
