"use client";

import * as React from "react";
import type { MaintenanceKPIs } from "@/lib/maintenance/types";
import {
  Wrench,
  UserCheck,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Flame,
  ClockAlert,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MaintenanceKPIGridProps {
  stats: MaintenanceKPIs;
  loading?: boolean;
  selectedStatus?: string;
  onSelectStatus?: (status: string) => void;
}

export function MaintenanceKPIGrid({
  stats,
  loading,
  selectedStatus,
  onSelectStatus,
}: MaintenanceKPIGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-card animate-pulse border border-border/60 p-3 flex flex-col justify-between"
          />
        ))}
      </div>
    );
  }

  const CARDS = [
    {
      id: "OPEN",
      label: "Open",
      count: stats.open,
      subtext: "Unassigned",
      icon: Wrench,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10 border-blue-500/20",
      activeStyle: "ring-2 ring-blue-500/80 border-blue-500/40 bg-blue-500/5",
    },
    {
      id: "ASSIGNED",
      label: "Assigned",
      count: stats.assigned,
      subtext: "Tech Set",
      icon: UserCheck,
      iconColor: "text-indigo-500",
      iconBg: "bg-indigo-500/10 border-indigo-500/20",
      activeStyle: "ring-2 ring-indigo-500/80 border-indigo-500/40 bg-indigo-500/5",
    },
    {
      id: "IN_PROGRESS",
      label: "In Progress",
      count: stats.inProgress,
      subtext: "Under Repair",
      icon: PlayCircle,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-500/10 border-violet-500/20",
      activeStyle: "ring-2 ring-violet-500/80 border-violet-500/40 bg-violet-500/5",
    },
    {
      id: "ON_HOLD",
      label: "On Hold",
      count: stats.onHold,
      subtext: "Parts / Access",
      icon: PauseCircle,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      activeStyle: "ring-2 ring-amber-500/80 border-amber-500/40 bg-amber-500/5",
    },
    {
      id: "RESOLVED",
      label: "Resolved",
      count: stats.resolved,
      subtext: "Ready to Close",
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      activeStyle: "ring-2 ring-emerald-500/80 border-emerald-500/40 bg-emerald-500/5",
    },
    {
      id: "URGENT",
      label: "Urgent",
      count: stats.urgent,
      subtext: "High Priority",
      icon: Flame,
      iconColor: "text-rose-500",
      iconBg: "bg-rose-500/10 border-rose-500/20",
      activeStyle: "ring-2 ring-rose-500/80 border-rose-500/40 bg-rose-500/5",
    },
    {
      id: "OVERDUE",
      label: "Overdue",
      count: stats.overdue,
      subtext: "Past Schedule",
      icon: ClockAlert,
      iconColor: "text-red-500",
      iconBg: "bg-red-500/10 border-red-500/20",
      activeStyle: "ring-2 ring-red-500/80 border-red-500/40 bg-red-500/5",
    },
    {
      id: "OUT_OF_ORDER",
      label: "Out of Order",
      count: stats.outOfOrderRooms,
      subtext: "Rooms Blocked",
      icon: ShieldAlert,
      iconColor: "text-orange-500",
      iconBg: "bg-orange-500/10 border-orange-500/20",
      activeStyle: "ring-2 ring-orange-500/80 border-orange-500/40 bg-orange-500/5",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const isActive = selectedStatus === c.id;

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectStatus?.(isActive ? "ALL" : c.id)}
            className={cn(
              "group relative flex flex-col justify-between text-left p-3 rounded-xl bg-card border border-border/70 transition-all duration-200 select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border cursor-pointer",
              isActive
                ? cn(c.activeStyle, "shadow-sm")
                : "shadow-2xs"
            )}
          >
            {/* Header: Label + Icon */}
            <div className="flex items-start justify-between gap-1.5 w-full">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase block truncate">
                  {c.label}
                </span>
                <span className="text-xl font-black tracking-tight text-foreground mt-0.5 block tabular-nums">
                  {c.count}
                </span>
              </div>

              <div
                className={cn(
                  "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
                  c.iconBg,
                  c.iconColor
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Subtext */}
            <div className="pt-1.5 mt-1.5 border-t border-border/50 w-full">
              <span className="text-[10.5px] font-medium text-muted-foreground/90 truncate block">
                {c.subtext}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
