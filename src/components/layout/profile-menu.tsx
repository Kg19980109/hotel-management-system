"use client";

import * as React from "react";
import Link from "next/link";
import {
  User,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  Building,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";

interface ProfileMenuProps {
  className?: string;
}

export function ProfileMenu({ className }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { user, profile, currentProperty, signOut } = useAuth();

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "StayHub User";
  const userEmail = user?.email || profile?.email || "";
  const userRole = currentProperty?.role_name || (user ? "Hotel Owner" : "Guest");
  const hotelName = currentProperty?.property_name || "StayHub Hospitality";

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User profile menu"
        className={cn(
          "flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-white/[0.12] transition-all duration-150 text-left border border-white/[0.12] bg-white/[0.07] shadow-inner",
          isOpen && "bg-white/[0.14] ring-2 ring-indigo-400/30 border-indigo-400"
        )}
      >
        <Avatar name={userName} size="sm" />
        <div className="text-left hidden sm:block">
          <p className="text-xs font-bold text-slate-100 leading-tight">
            {userName}
          </p>
          <p className="text-[10.5px] font-medium text-slate-400 leading-tight mt-0.5">
            {userRole}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "text-slate-400 transition-transform duration-200 hidden sm:block h-3.5 w-3.5 ml-0.5",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="User account actions"
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0A1124] border border-white/[0.12] shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl"
        >
          {/* User Details */}
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <p className="text-[13px] font-semibold text-slate-100 truncate">
              {userName}
            </p>
            <p className="text-[12px] text-slate-400 truncate">
              {userEmail}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 px-2.5 py-1 rounded-lg">
              <Building className="h-3 w-3 shrink-0" />
              <span className="truncate">{hotelName}</span>
            </div>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <User className="h-4 w-4 text-slate-400" />
              <span>My Profile</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Hotel Settings</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <Shield className="h-4 w-4 text-slate-400" />
              <span>Roles & Permissions</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-white/[0.08] pt-1 mt-1">
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setIsOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
