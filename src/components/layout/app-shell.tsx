"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { ContentContainer } from "@/components/shared/content-container";

interface AppShellProps {
  children: React.ReactNode;
  contentWidth?: "default" | "wide" | "narrow";
}

export function AppShell({ children, contentWidth = "default" }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [isLargeScreen, setIsLargeScreen] = React.useState(true);

  // Track viewport size for correct topbar offset
  React.useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const currentSidebarWidth = isLargeScreen
    ? collapsed
      ? "var(--sidebar-collapsed-width)"
      : "var(--sidebar-width)"
    : "0px";

  return (
    <div
      className="min-h-screen bg-[var(--background)] flex flex-col"
      style={
        {
          "--topbar-left-offset": currentSidebarWidth,
        } as React.CSSProperties
      }
    >
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

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 pt-[var(--topbar-height)] transition-[margin-left] duration-300 ease-in-out",
          isLargeScreen
            ? collapsed
              ? "ml-[var(--sidebar-collapsed-width)]"
              : "ml-[var(--sidebar-width)]"
            : "ml-0"
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <ContentContainer width={contentWidth}>
            {children}
          </ContentContainer>
        </div>
      </main>
    </div>
  );
}
