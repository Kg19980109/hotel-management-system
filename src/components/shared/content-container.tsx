import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================
// CONTENT CONTAINER
// ============================================================

interface ContentContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * "default" — max-w-7xl, comfortable for dashboards and forms
   * "wide"    — max-w-full, for tables/calendars that need full width
   * "narrow"  — max-w-3xl, for settings, forms, confirmations
   */
  width?: "default" | "wide" | "narrow";
}

/**
 * Consistent content container used on all pages.
 * Controls horizontal padding, max-width, and vertical spacing.
 */
export function ContentContainer({
  children,
  className,
  width = "default",
}: ContentContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto",
        width === "default" && "max-w-[1400px]",
        width === "wide" && "max-w-full",
        width === "narrow" && "max-w-3xl",
        className
      )}
    >
      {children}
    </div>
  );
}
