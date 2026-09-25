"use client";

import * as React from "react";
import type { RoomOperationalStatus, RoomHousekeepingStatus } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";

interface OperationalBadgeProps {
  status: RoomOperationalStatus | string;
  className?: string;
}

export function OperationalStatusBadge({ status, className }: OperationalBadgeProps) {
  const norm = (status || "").toUpperCase();

  switch (norm) {
    case "AVAILABLE":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--success-light)] text-[var(--success-foreground)] border border-[var(--success)]/20",
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] shrink-0" />
          Available
        </span>
      );
    case "OCCUPIED":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200",
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
          Occupied
        </span>
      );
    case "DIRTY":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200",
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
          Dirty
        </span>
      );
    case "CLEANING":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200",
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
          Cleaning
        </span>
      );
    case "INSPECTED":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200",
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
          Inspected
        </span>
      );
    case "OUT_OF_ORDER":
    case "OUT_OF_SERVICE":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300",
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" />
          Out of Order
        </span>
      );
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600",
            className
          )}
        >
          {status}
        </span>
      );
  }
}

interface HousekeepingBadgeProps {
  status: RoomHousekeepingStatus | string;
  className?: string;
}

export function HousekeepingStatusBadge({ status, className }: HousekeepingBadgeProps) {
  const norm = (status || "").toUpperCase();

  switch (norm) {
    case "CLEAN":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200",
            className
          )}
        >
          Clean
        </span>
      );
    case "DIRTY":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200",
            className
          )}
        >
          Dirty
        </span>
      );
    case "CLEANING":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200",
            className
          )}
        >
          In Progress
        </span>
      );
    case "INSPECTION_PENDING":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200",
            className
          )}
        >
          Needs Inspection
        </span>
      );
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-600",
            className
          )}
        >
          {status}
        </span>
      );
  }
}
