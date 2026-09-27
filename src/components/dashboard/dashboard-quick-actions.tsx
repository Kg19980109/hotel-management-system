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
  Sparkles,
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
      {/* Primary Action — Luxury Indigo + Gold Gradient */}
      <Link href="/bookings/new">
        <Button
          size="sm"
          className="h-10 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-[#5146E5] to-[#6366F1] hover:from-[#4338CA] hover:to-[#4F46E5] shadow-lg shadow-indigo-950/40 border border-indigo-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 mr-1.5 text-white" />
          <span>New Booking</span>
        </Button>
      </Link>

      {/* Quick Actions Dropdown — Refined Glass */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="h-10 px-3.5 rounded-xl text-white/90 bg-white/10 hover:bg-white/15 hover:text-white border border-white/15 backdrop-blur-md transition-all shadow-sm"
      >
        <span>Actions</span>
        <ChevronDown className={`h-3.5 w-3.5 ml-1.5 text-white/60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#0D1933]/95 backdrop-blur-xl border border-white/15 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{
            boxShadow: "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(214,168,90,0.2)",
          }}
        >
          <div className="px-3.5 py-1.5 text-[10px] font-bold text-[#E8CD8A] uppercase tracking-[0.14em] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span>Concierge Operations</span>
          </div>

          <Link
            href="/front-desk"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <LogIn className="h-3.5 w-3.5" />
            </div>
            <span>Check In Guest</span>
          </Link>

          <Link
            href="/front-desk"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <LogOut className="h-3.5 w-3.5" />
            </div>
            <span>Check Out Guest</span>
          </Link>

          <div className="my-1.5 border-t border-white/10" />

          <Link
            href="/guests"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <span>Add New Guest</span>
          </Link>

          <Link
            href="/rooms"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <BedDouble className="h-3.5 w-3.5" />
            </div>
            <span>View Rooms &amp; Inventory</span>
          </Link>
        </div>
      )}
    </div>
  );
}
