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
          "flex items-center gap-2.5 rounded-[var(--radius)] px-2 py-1.5 hover:bg-[var(--secondary)] transition-colors text-left",
          isOpen && "bg-[var(--secondary)]"
        )}
      >
        <Avatar name={userName} size="sm" />
        <div className="text-left hidden sm:block">
          <p className="text-[13px] font-semibold text-[var(--foreground)] leading-tight">
            {userName}
          </p>
          <p className="text-[11px] text-[var(--foreground-muted)] leading-tight">
            {userRole}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "text-[var(--foreground-subtle)] transition-transform duration-200 hidden sm:block h-3.5 w-3.5",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="User account actions"
          className="absolute right-0 mt-2 w-64 rounded-[var(--radius-xl)] bg-white border border-[var(--border)] shadow-[var(--shadow-xl)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Details */}
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">
              {userName}
            </p>
            <p className="text-[12px] text-[var(--foreground-muted)] truncate">
              {userEmail}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-[var(--primary)] bg-indigo-50/70 px-2 py-1 rounded-[var(--radius-sm)]">
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
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
            >
              <User className="h-4 w-4 text-[var(--foreground-muted)]" />
              <span>My Profile</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
            >
              <Settings className="h-4 w-4 text-[var(--foreground-muted)]" />
              <span>Hotel Settings</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
            >
              <Shield className="h-4 w-4 text-[var(--foreground-muted)]" />
              <span>Roles & Permissions</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-[var(--border)] pt-1 mt-1">
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setIsOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-[var(--danger)] hover:bg-red-50/60 transition-colors text-left"
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
