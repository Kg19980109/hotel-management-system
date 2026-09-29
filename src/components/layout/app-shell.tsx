"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { ContentContainer } from "@/components/shared/content-container";
import {
  OperationalAlertProvider,
  OperationalAlertOverlay,
} from "@/components/operational-alerts";

interface AppShellProps {
  children: React.ReactNode;
  contentWidth?: "default" | "wide" | "narrow";
}

export function AppShell({ children, contentWidth = "default" }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [isLargeScreen, setIsLargeScreen] = React.useState(true);

  // Track viewport size for correct topbar offset (debounced — old version
  // setState on every resize pixel, thrashing mobile rotate/scroll)
  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const checkScreen = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => setIsLargeScreen(window.innerWidth >= 1024), 150);
    };
    setIsLargeScreen(window.innerWidth >= 1024);
    window.addEventListener("resize", checkScreen, { passive: true });
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("resize", checkScreen);
    };
  }, []);

  const currentSidebarWidth = isLargeScreen
    ? collapsed
      ? "var(--sidebar-collapsed-width)"
      : "var(--sidebar-width)"
    : "0px";

  return (
    <OperationalAlertProvider>
      <div
        className="min-h-screen bg-[var(--background)] flex flex-col"
        style={
          {
            "--topbar-left-offset": currentSidebarWidth,
          } as React.CSSProperties
        }
      >
        {/* Global Operational Alert Overlay (Buzzer & Modal) */}
        <OperationalAlertOverlay />

        {/* Desktop Permanent Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
        />

        {/* Mobile / Tablet Off-canvas Drawer Navigation */}
        <MobileNav
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        {/* Persistent Topbar */}
        <Topbar
          sidebarCollapsed={collapsed}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        {/* Main Content Area — GPU-composited layer for butter-smooth scroll */}
        <main
          className={cn(
            "flex-1 pt-[var(--topbar-height)] will-change-[margin-left]",
            /* Use faster ease-out for snappier sidebar toggle feel */
            "transition-[margin-left] duration-200 ease-out",
            isLargeScreen
              ? collapsed
                ? "ml-[var(--sidebar-collapsed-width)]"
                : "ml-[var(--sidebar-width)]"
              : "ml-0"
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <ContentContainer width={contentWidth}>
              {children}
            </ContentContainer>
          </div>
        </main>
      </div>
    </OperationalAlertProvider>
  );
}
