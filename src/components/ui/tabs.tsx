"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
  variant?: "underline" | "pill";
  size?: "sm" | "md";
}

const Tabs = ({
  tabs,
  activeKey,
  onChange,
  className,
  variant = "underline",
  size = "md",
}: TabsProps) => {
  if (variant === "pill") {
    return (
      <div
        className={cn(
          "flex items-center gap-1 bg-[var(--secondary)] p-1 rounded-[var(--radius-lg)]",
          className
        )}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeKey === tab.key}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-[var(--radius-md)] font-medium transition-all duration-150",
              size === "sm" ? "text-[11.5px] px-2.5 py-1" : "text-[12.5px] px-3 py-1.5",
              activeKey === tab.key
                ? "bg-white text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-white/50",
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10.5px] font-semibold leading-tight",
                  activeKey === tab.key
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--border)] text-[var(--foreground-muted)]"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // underline variant
  return (
    <div
      className={cn("flex items-center gap-0 border-b border-[var(--border)]", className)}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeKey === tab.key}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.key)}
          className={cn(
            "relative flex items-center gap-1.5 font-medium transition-all duration-150 -mb-px",
            size === "sm"
              ? "text-[11.5px] px-3 py-2"
              : "text-[12.5px] px-4 py-2.5",
            activeKey === tab.key
              ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] border-b-2 border-transparent",
            tab.disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 text-[10.5px] font-semibold leading-tight",
                activeKey === tab.key
                  ? "bg-[var(--primary-light)] text-[var(--primary)]"
                  : "bg-[var(--secondary)] text-[var(--foreground-muted)]"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export { Tabs };
export type { TabItem, TabsProps };
