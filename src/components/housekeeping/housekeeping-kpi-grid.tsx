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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-slate-100/70 animate-pulse border border-slate-200/60 p-4 flex flex-col justify-between"
          />
        ))}
      </div>
    );
  }

  const CARDS = [
    {
      id: "DIRTY",
      label: "DIRTY ROOMS",
      count: stats.dirtyRooms,
      subtext: "Awaiting Cleaning",
      icon: AlertTriangle,
      accent: "from-rose-500 via-red-500 to-amber-500",
      iconBg: "bg-rose-50 border-rose-100 text-rose-600",
      activeRing: "ring-2 ring-rose-500 border-rose-400 bg-gradient-to-b from-rose-50/50 to-white",
    },
    {
      id: "CLEANING",
      label: "CLEANING",
      count: stats.cleaningInProgress,
      subtext: "In Progress Now",
      icon: Sparkles,
      accent: "from-sky-400 via-cyan-500 to-blue-600",
      iconBg: "bg-sky-50 border-sky-100 text-sky-600",
      activeRing: "ring-2 ring-sky-500 border-sky-400 bg-gradient-to-b from-sky-50/50 to-white",
    },
    {
      id: "INSPECTION",
      label: "INSPECTION",
      count: stats.inspectionPending,
      subtext: "Ready for Review",
      icon: Clock,
      accent: "from-amber-400 via-orange-500 to-amber-600",
      iconBg: "bg-amber-50 border-amber-100 text-amber-600",
      activeRing: "ring-2 ring-amber-500 border-amber-400 bg-gradient-to-b from-amber-50/50 to-white",
    },
    {
      id: "READY",
      label: "READY / CLEAN",
      count: stats.readyClean,
      subtext: "Available for Check-In",
      icon: CheckCircle2,
      accent: "from-emerald-400 via-teal-500 to-emerald-600",
      iconBg: "bg-emerald-50 border-emerald-100 text-emerald-600",
      activeRing: "ring-2 ring-emerald-500 border-emerald-400 bg-gradient-to-b from-emerald-50/50 to-white",
    },
    {
      id: "PRIORITY",
      label: "PRIORITY",
      count: stats.priorityTasks,
      subtext: "Urgent Turnover",
      icon: Flame,
      accent: "from-amber-500 via-rose-500 to-red-600",
      iconBg: "bg-orange-50 border-orange-100 text-orange-600",
      activeRing: "ring-2 ring-orange-500 border-orange-400 bg-gradient-to-b from-orange-50/50 to-white",
    },
    {
      id: "OUT_OF_SERVICE",
      label: "OUT OF SERVICE",
      count: stats.outOfServiceOrOrder,
      subtext: "Maintenance Hold",
      icon: ShieldAlert,
      accent: "from-slate-500 via-zinc-600 to-slate-700",
      iconBg: "bg-slate-100 border-slate-200 text-slate-700",
      activeRing: "ring-2 ring-slate-500 border-slate-400 bg-gradient-to-b from-slate-50/50 to-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const isActive = selectedStatus === c.id;

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectStatus?.(isActive ? "ALL" : c.id)}
            className={cn(
              "group relative flex flex-col justify-between text-left p-4 rounded-2xl bg-white border border-slate-200/80 transition-all duration-300 overflow-hidden select-none hover:-translate-y-1 hover:shadow-md",
              isActive
                ? cn(c.activeRing, "shadow-sm")
                : "hover:border-slate-300 shadow-2xs"
            )}
          >
            {/* Top gradient accent line */}
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-opacity duration-300",
                c.accent,
                isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100"
              )}
            />

            {/* Header: Label + Icon */}
            <div className="flex items-start justify-between gap-1 w-full">
              <div>
                <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block font-mono">
                  {c.label}
                </span>
                <span className="text-2xl font-black tracking-tight text-slate-900 mt-1 block">
                  {c.count}
                </span>
              </div>

              <div
                className={cn(
                  "w-8.5 h-8.5 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105",
                  c.iconBg
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Bottom Row */}
            <div className="pt-2.5 mt-2 border-t border-slate-100/90 w-full">
              <span className="text-[11px] font-semibold text-slate-500 truncate block">
                {c.subtext}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
