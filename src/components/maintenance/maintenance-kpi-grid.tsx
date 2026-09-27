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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-slate-100/70 animate-pulse border border-slate-200/60 p-3 flex flex-col justify-between"
          />
        ))}
      </div>
    );
  }

  const CARDS = [
    {
      id: "OPEN",
      label: "OPEN",
      count: stats.open,
      subtext: "Unassigned",
      icon: Wrench,
      accent: "from-blue-500 via-indigo-500 to-blue-600",
      iconBg: "bg-blue-50 border-blue-100 text-blue-600",
      activeRing: "ring-2 ring-blue-500 border-blue-400 bg-gradient-to-b from-blue-50/50 to-white",
    },
    {
      id: "ASSIGNED",
      label: "ASSIGNED",
      count: stats.assigned,
      subtext: "Technician Set",
      icon: UserCheck,
      accent: "from-indigo-500 via-violet-500 to-purple-600",
      iconBg: "bg-indigo-50 border-indigo-100 text-indigo-600",
      activeRing: "ring-2 ring-indigo-500 border-indigo-400 bg-gradient-to-b from-indigo-50/50 to-white",
    },
    {
      id: "IN_PROGRESS",
      label: "IN PROGRESS",
      count: stats.inProgress,
      subtext: "Under Repair",
      icon: PlayCircle,
      accent: "from-purple-500 via-fuchsia-500 to-indigo-600",
      iconBg: "bg-purple-50 border-purple-100 text-purple-600",
      activeRing: "ring-2 ring-purple-500 border-purple-400 bg-gradient-to-b from-purple-50/50 to-white",
    },
    {
      id: "ON_HOLD",
      label: "ON HOLD",
      count: stats.onHold,
      subtext: "Parts / Access",
      icon: PauseCircle,
      accent: "from-amber-400 via-orange-500 to-amber-600",
      iconBg: "bg-amber-50 border-amber-100 text-amber-600",
      activeRing: "ring-2 ring-amber-500 border-amber-400 bg-gradient-to-b from-amber-50/50 to-white",
    },
    {
      id: "RESOLVED",
      label: "RESOLVED",
      count: stats.resolved,
      subtext: "Ready to Close",
      icon: CheckCircle2,
      accent: "from-emerald-400 via-teal-500 to-emerald-600",
      iconBg: "bg-emerald-50 border-emerald-100 text-emerald-600",
      activeRing: "ring-2 ring-emerald-500 border-emerald-400 bg-gradient-to-b from-emerald-50/50 to-white",
    },
    {
      id: "URGENT",
      label: "URGENT",
      count: stats.urgent,
      subtext: "High Priority",
      icon: Flame,
      accent: "from-rose-500 via-red-500 to-pink-600",
      iconBg: "bg-rose-50 border-rose-100 text-rose-600",
      activeRing: "ring-2 ring-rose-500 border-rose-400 bg-gradient-to-b from-rose-50/50 to-white",
    },
    {
      id: "OVERDUE",
      label: "OVERDUE",
      count: stats.overdue,
      subtext: "Past Schedule",
      icon: ClockAlert,
      accent: "from-red-500 via-rose-600 to-red-700",
      iconBg: "bg-red-50 border-red-100 text-red-600",
      activeRing: "ring-2 ring-red-500 border-red-400 bg-gradient-to-b from-red-50/50 to-white",
    },
    {
      id: "OUT_OF_ORDER",
      label: "OUT OF ORDER",
      count: stats.outOfOrderRooms,
      subtext: "Rooms Blocked",
      icon: ShieldAlert,
      accent: "from-amber-500 via-orange-600 to-rose-600",
      iconBg: "bg-amber-50 border-amber-100 text-amber-700",
      activeRing: "ring-2 ring-amber-500 border-amber-400 bg-gradient-to-b from-amber-50/50 to-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const isActive = selectedStatus === c.id;

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectStatus?.(isActive ? "ALL" : c.id)}
            className={cn(
              "group relative flex flex-col justify-between text-left p-3.5 rounded-2xl bg-white border border-slate-200/80 transition-all duration-300 overflow-hidden select-none hover:-translate-y-1 hover:shadow-md",
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
                <span className="text-[9.5px] font-black tracking-wider text-slate-400 uppercase block font-mono">
                  {c.label}
                </span>
                <span className="text-xl font-black tracking-tight text-slate-900 mt-0.5 block">
                  {c.count}
                </span>
              </div>

              <div
                className={cn(
                  "w-7.5 h-7.5 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105",
                  c.iconBg
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Bottom Row */}
            <div className="pt-2 mt-1 border-t border-slate-100/90 w-full">
              <span className="text-[10.5px] font-semibold text-slate-500 truncate block">
                {c.subtext}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
