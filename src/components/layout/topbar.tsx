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
        "bg-[var(--topbar-bg)] border-b border-[var(--topbar-border)]",
        "px-4 sm:px-6 gap-3 sm:gap-4 transition-[left] duration-300 ease-in-out backdrop-blur-xs",
        className
      )}
      style={{
        left: "var(--topbar-left-offset, 0px)",
      }}
    >
      {/* Left: Mobile Menu & Context */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-[var(--radius)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Property Selector for mobile / tablet */}
        <div className="block lg:hidden">
          <PropertySelector variant="topbar" />
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-lg mx-auto px-2">
        <GlobalSearch />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Desktop Property Selector */}
        <div className="hidden lg:block">
          <PropertySelector variant="topbar" />
        </div>

        {/* Operational Realtime Alerts & Sound Controller */}
        <AlertSoundController />

        {/* Notifications */}
        <NotificationsDropdown />

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />

        {/* Profile Menu */}
        <ProfileMenu />
      </div>
    </header>
  );
}
