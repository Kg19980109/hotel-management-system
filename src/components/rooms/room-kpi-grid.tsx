"use client";

import * as React from "react";
import type { RoomStats, RoomOperationalStatus } from "@/lib/rooms/types";
import {
  BedDouble,
  DoorOpen,
  Users,
  Sparkles,
  Wrench,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomKpiGridProps {
  stats: RoomStats | null;
  loading?: boolean;
  selectedStatus?: string;
  onSelectStatus?: (status: string) => void;
}

interface StatCardConfig {
  id: string;
  statusFilter: string;
  title: string;
  valueKey: keyof RoomStats | "cleaning_inspect";
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  theme: {
    bg: string;
    border: string;
    activeBorder: string;
    activeRing: string;
    activeGlow: string;
    iconBg: string;
    iconText: string;
    accentBar: string;
    valueText: string;
    badgeBg: string;
    badgeText: string;
  };
}

export function RoomKpiGrid({
  stats,
  loading,
  selectedStatus = "ALL",
  onSelectStatus,
}: RoomKpiGridProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-slate-100/70 animate-pulse border border-slate-200/60 p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-200 rounded-full" />
              <div className="h-8 w-8 bg-slate-200 rounded-xl" />
            </div>
            <div className="h-6 w-12 bg-slate-200 rounded-lg" />
            <div className="h-2.5 w-20 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const total = stats.total || 0;
  const availPct = total > 0 ? Math.round((stats.available / total) * 100) : 0;
  const occPct = total > 0 ? Math.round((stats.occupied / total) * 100) : 0;
  const dirtyPct = total > 0 ? Math.round((stats.dirty / total) * 100) : 0;
  const cleaningCount = (stats.cleaning || 0) + (stats.inspected || 0);

  const CARDS: {
    filterValue: string;
    label: string;
    count: number;
    subtext: string;
    badge: string;
    icon: React.ComponentType<{ className?: string }>;
    accentGradient: string;
    iconBg: string;
    iconColor: string;
    activeRing: string;
    activeGlow: string;
  }[] = [
    {
      filterValue: "ALL",
      label: "TOTAL ROOMS",
      count: stats.total,
      subtext: stats.inactive > 0 ? `${stats.inactive} Deactivated` : "All Configured",
      badge: "100%",
      icon: BedDouble,
      accentGradient: "from-indigo-500 via-blue-500 to-indigo-600",
      iconBg: "bg-indigo-50 border-indigo-100 text-indigo-600",
      iconColor: "text-indigo-600",
      activeRing: "ring-2 ring-indigo-500 border-indigo-400 bg-gradient-to-b from-indigo-50/50 to-white",
      activeGlow: "shadow-[0_8px_20px_rgba(79,70,229,0.15)]",
    },
    {
      filterValue: "AVAILABLE",
      label: "AVAILABLE",
      count: stats.available,
      subtext: "Ready for Check-In",
      badge: `${availPct}%`,
      icon: DoorOpen,
      accentGradient: "from-emerald-400 via-teal-500 to-emerald-600",
      iconBg: "bg-emerald-50 border-emerald-100 text-emerald-600",
      iconColor: "text-emerald-600",
      activeRing: "ring-2 ring-emerald-500 border-emerald-400 bg-gradient-to-b from-emerald-50/50 to-white",
      activeGlow: "shadow-[0_8px_20px_rgba(16,185,129,0.15)]",
    },
    {
      filterValue: "OCCUPIED",
      label: "OCCUPIED",
      count: stats.occupied,
      subtext: "Active In-House Stays",
      badge: `${occPct}%`,
      icon: Users,
      accentGradient: "from-purple-500 via-violet-500 to-fuchsia-600",
      iconBg: "bg-purple-50 border-purple-100 text-purple-600",
      iconColor: "text-purple-600",
      activeRing: "ring-2 ring-purple-500 border-purple-400 bg-gradient-to-b from-purple-50/50 to-white",
      activeGlow: "shadow-[0_8px_20px_rgba(147,51,234,0.15)]",
    },
    {
      filterValue: "DIRTY",
      label: "NEEDS CLEANING",
      count: stats.dirty,
      subtext: "Housekeeping Queue",
      badge: `${dirtyPct}%`,
      icon: Sparkles,
      accentGradient: "from-amber-400 via-orange-500 to-amber-600",
      iconBg: "bg-amber-50 border-amber-100 text-amber-600",
      iconColor: "text-amber-600",
      activeRing: "ring-2 ring-amber-500 border-amber-400 bg-gradient-to-b from-amber-50/50 to-white",
      activeGlow: "shadow-[0_8px_20px_rgba(245,158,11,0.15)]",
    },
    {
      filterValue: "CLEANING",
      label: "CLEANING / INSPECT",
      count: cleaningCount,
      subtext: "HK In-Progress",
      badge: `${stats.inspected} insp`,
      icon: AlertTriangle,
      accentGradient: "from-sky-400 via-cyan-500 to-blue-600",
      iconBg: "bg-sky-50 border-sky-100 text-sky-600",
      iconColor: "text-sky-600",
      activeRing: "ring-2 ring-sky-500 border-sky-400 bg-gradient-to-b from-sky-50/50 to-white",
      activeGlow: "shadow-[0_8px_20px_rgba(14,165,233,0.15)]",
    },
    {
      filterValue: "OUT_OF_ORDER",
      label: "OUT OF ORDER",
      count: stats.outOfOrder,
      subtext: "Maintenance Blocked",
      badge: stats.outOfOrder > 0 ? "Alert" : "Clear",
      icon: Wrench,
      accentGradient: "from-rose-500 via-red-500 to-rose-600",
      iconBg: "bg-rose-50 border-rose-100 text-rose-600",
      iconColor: "text-rose-600",
      activeRing: "ring-2 ring-rose-500 border-rose-400 bg-gradient-to-b from-rose-50/50 to-white",
      activeGlow: "shadow-[0_8px_20px_rgba(244,63,94,0.15)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const isActive =
          selectedStatus === card.filterValue ||
          (card.filterValue === "ALL" && (!selectedStatus || selectedStatus === "ALL"));

        return (
          <button
            type="button"
            key={card.label}
            onClick={() => {
              if (onSelectStatus) {
                // Toggle back to ALL if already active and not ALL
                if (isActive && card.filterValue !== "ALL") {
                  onSelectStatus("ALL");
                } else {
                  onSelectStatus(card.filterValue);
                }
              }
            }}
            className={cn(
              "group relative flex flex-col justify-between text-left p-4 rounded-2xl bg-white border border-slate-200/80 transition-all duration-300 overflow-hidden select-none hover:-translate-y-1 hover:shadow-md",
              isActive
                ? cn(card.activeRing, card.activeGlow, "shadow-sm")
                : "hover:border-slate-300/90 shadow-2xs"
            )}
          >
            {/* Top gradient accent line */}
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-opacity duration-300",
                card.accentGradient,
                isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100"
              )}
            />

            {/* Header: Label + Icon */}
            <div className="flex items-start justify-between gap-2 w-full">
              <div>
                <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block font-mono">
                  {card.label}
                </span>
                <span className="text-2xl font-black tracking-tight text-slate-900 mt-1 block">
                  {card.count}
                </span>
              </div>

              <div
                className={cn(
                  "w-8.5 h-8.5 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105",
                  card.iconBg
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Bottom Row: Subtext & Percentage Badge */}
            <div className="flex items-center justify-between w-full pt-2.5 mt-2 border-t border-slate-100/90">
              <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[100px]">
                {card.subtext}
              </span>

              <span
                className={cn(
                  "text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border shadow-2xs",
                  isActive
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-100 text-slate-600 border-slate-200/70 group-hover:bg-slate-200"
                )}
              >
                {isActive && card.filterValue !== "ALL" ? (
                  <span className="flex items-center gap-0.5">
                    <Filter className="w-2.5 h-2.5" />
                    <span>Active</span>
                  </span>
                ) : (
                  card.badge
                )}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
