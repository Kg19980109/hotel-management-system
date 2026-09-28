"use client";

import * as React from "react";
import type { HousekeepingKPIs } from "@/lib/housekeeping/types";
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Flame,
  ShieldAlert,
  DoorOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HousekeepingKPIGridProps {
  stats: HousekeepingKPIs;
  loading?: boolean;
  selectedStatus?: string;
  onSelectStatus?: (status: string) => void;
}

export function HousekeepingKPIGrid({
  stats,
  loading,
  selectedStatus,
  onSelectStatus,
}: HousekeepingKPIGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-card animate-pulse border border-border/60 p-3.5 flex flex-col justify-between"
          />
        ))}
      </div>
    );
  }

  const CARDS = [
    {
      id: "DIRTY",
      label: "Dirty Rooms",
      count: stats.dirtyRooms,
      subtext: "Awaiting Cleaning",
      icon: AlertTriangle,
      iconColor: "text-rose-500",
      iconBg: "bg-rose-500/10 border-rose-500/20",
      activeStyle: "ring-2 ring-rose-500/80 border-rose-500/40 bg-rose-500/5",
      badgeColor: "bg-rose-500",
    },
    {
      id: "CLEANING",
      label: "Cleaning",
      count: stats.cleaningInProgress,
      subtext: "In Progress Now",
      icon: Sparkles,
      iconColor: "text-sky-500",
      iconBg: "bg-sky-500/10 border-sky-500/20",
      activeStyle: "ring-2 ring-sky-500/80 border-sky-500/40 bg-sky-500/5",
      badgeColor: "bg-sky-500",
    },
    {
      id: "INSPECTION",
      label: "Inspection",
      count: stats.inspectionPending,
      subtext: "Ready for Review",
      icon: Clock,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      activeStyle: "ring-2 ring-amber-500/80 border-amber-500/40 bg-amber-500/5",
      badgeColor: "bg-amber-500",
    },
    {
      id: "READY",
      label: "Ready / Clean",
      count: stats.readyClean,
      subtext: "Available for Check-In",
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      activeStyle: "ring-2 ring-emerald-500/80 border-emerald-500/40 bg-emerald-500/5",
      badgeColor: "bg-emerald-500",
    },
    {
      id: "PRIORITY",
      label: "Priority Queue",
      count: stats.priorityTasks,
      subtext: "Urgent Turnover",
      icon: Flame,
      iconColor: "text-orange-500",
      iconBg: "bg-orange-500/10 border-orange-500/20",
      activeStyle: "ring-2 ring-orange-500/80 border-orange-500/40 bg-orange-500/5",
      badgeColor: "bg-orange-500",
    },
    {
      id: "OUT_OF_SERVICE",
      label: "Out of Service",
      count: stats.outOfServiceOrOrder,
      subtext: "Maintenance Hold",
      icon: ShieldAlert,
      iconColor: "text-slate-500",
      iconBg: "bg-slate-500/10 border-slate-500/20",
      activeStyle: "ring-2 ring-slate-500/80 border-slate-500/40 bg-slate-500/5",
      badgeColor: "bg-slate-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const isActive = selectedStatus === c.id;

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectStatus?.(isActive ? "ALL" : c.id)}
            className={cn(
              "group relative flex flex-col justify-between text-left p-3.5 rounded-xl bg-card border border-border/70 transition-all duration-200 select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border cursor-pointer",
              isActive
                ? cn(c.activeStyle, "shadow-sm")
                : "shadow-2xs"
            )}
          >
            {/* Header: Label + Icon */}
            <div className="flex items-start justify-between gap-2 w-full">
              <div>
                <span className="text-[10.5px] font-bold tracking-wider text-muted-foreground uppercase block">
                  {c.label}
                </span>
                <span className="text-2xl font-black tracking-tight text-foreground mt-0.5 block tabular-nums">
                  {c.count}
                </span>
              </div>

              <div
                className={cn(
                  "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
                  c.iconBg,
                  c.iconColor
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Subtext */}
            <div className="pt-2 mt-2 border-t border-border/50 w-full">
              <span className="text-[11px] font-medium text-muted-foreground/90 truncate block">
                {c.subtext}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
