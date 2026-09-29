"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
        "backdrop-blur-xl border-b border-white/[0.08] shadow-md shadow-black/20 text-slate-100",
        "px-2.5 sm:px-6 gap-1.5 sm:gap-4 transition-[left] duration-300 ease-in-out",
        className
      )}
      style={{
        left: "var(--topbar-left-offset, 0px)",
        background: "var(--topbar-bg, #08111F)",
        borderColor: "var(--topbar-border, rgba(255,255,255,0.08))",
      }}
    >
      {/* Left: Mobile menu & Brand Logo (mobile only) & property selector */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand Logo visible on mobile topbar (hidden on desktop to avoid duplicate) */}
        <Link
          href="/dashboard"
          className="flex lg:hidden items-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xl"
          aria-label="Home Dashboard"
        >
          <Image
            src="/images/logo-brand-dark.png"
            alt="StayHub Logo"
            width={78}
            height={22}
            className="h-5 sm:h-6 w-auto object-contain filter drop-shadow-sm shrink-0"
            priority
          />
        </Link>

        {/* Mobile / tablet property selector */}
        <div className="block lg:hidden shrink-0">
          <PropertySelector variant="topbar" />
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-md mx-1 sm:mx-auto sm:px-2 flex justify-end sm:justify-center">
        <GlobalSearch />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Desktop property selector */}
        <div className="hidden lg:block">
          <PropertySelector variant="topbar" />
        </div>

        {/* Operational Alerts & sound toggle */}
        <AlertSoundController />

        {/* Notifications */}
        <NotificationsDropdown />

        {/* Divider */}
        <div className="h-5 w-px bg-white/[0.12] hidden sm:block mx-0.5" />

        {/* Profile */}
        <ProfileMenu />
      </div>
    </header>
  );
}
