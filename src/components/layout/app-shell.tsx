"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar, Topbar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <Topbar sidebarCollapsed={collapsed} />
      <main
        className={cn(
          "transition-[margin-left] duration-300 ease-in-out",
          "pt-[var(--topbar-height)]",
          collapsed
            ? "ml-[var(--sidebar-collapsed-width)]"
            : "ml-[var(--sidebar-width)]"
        )}
      >
        <div className="min-h-[calc(100vh-var(--topbar-height))] p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
