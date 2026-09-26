"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";
import { NotificationsDropdown } from "./notifications-dropdown";
import { ProfileMenu } from "./profile-menu";
import { PropertySelector } from "./property-selector";
import { AlertSoundController } from "@/components/operational-alerts";

interface TopbarProps {
  sidebarCollapsed: boolean;
  onOpenMobileNav: () => void;
  className?: string;
}

export function Topbar({
  sidebarCollapsed,
  onOpenMobileNav,
  className,
}: TopbarProps) {
  return (
    <header
      data-sidebar-collapsed={sidebarCollapsed}
      className={cn(
        "fixed top-0 right-0 z-30 flex items-center justify-between h-[var(--topbar-height)]",
        "backdrop-blur-md border-b",
        "px-4 sm:px-5 gap-3 sm:gap-4 transition-[left] duration-300 ease-in-out",
        className
      )}
      style={{
        left: "var(--topbar-left-offset, 0px)",
        background: "var(--topbar-bg)",
        borderColor: "var(--topbar-border)",
        boxShadow: "0 1px 0 var(--topbar-border)",
      }}
    >
      {/* Left: Mobile menu & property selector */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-1.5 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile / tablet property selector */}
        <div className="block lg:hidden">
          <PropertySelector variant="topbar" />
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-md mx-auto px-2">
        <GlobalSearch />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Desktop property selector */}
        <div className="hidden lg:block">
          <PropertySelector variant="topbar" />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--border)] hidden sm:block mx-0.5" />

        {/* Operational Alerts & sound toggle */}
        <AlertSoundController />

        {/* Notifications */}
        <NotificationsDropdown />

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--border)] hidden sm:block mx-0.5" />

        {/* Profile */}
        <ProfileMenu />
      </div>
    </header>
  );
}
