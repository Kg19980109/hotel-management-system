"use client";

import * as React from "react";
import type { DashboardMetrics } from "@/lib/dashboard/types";
import { formatCurrency, formatPercentage } from "@/lib/dashboard/formatters";
import {
  BedDouble,
  DoorOpen,
  CalendarCheck,
  CalendarX,
  Users,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardKpiGridProps {
  metrics: DashboardMetrics | null;
  loading?: boolean;
}

interface LuxuryStatCardProps {
  title: string;
  value: string;
  subValue?: string;
  statusLabel: string;
  icon: React.ReactNode;
  theme: "indigo" | "sky" | "emerald" | "amber" | "gold" | "rose";
  loading?: boolean;
}

const themeStyles = {
  indigo: {
    topBar: "from-indigo-500 via-indigo-400 to-indigo-600",
    iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
    glow: "rgba(99, 102, 241, 0.08)",
    badgeBg: "bg-indigo-50/80 text-indigo-700 border-indigo-200/60",
    hoverBorder: "hover:border-indigo-300",
  },
  sky: {
    topBar: "from-sky-500 via-sky-400 to-sky-600",
    iconBg: "bg-sky-50 text-sky-600 border-sky-100",
    glow: "rgba(14, 165, 233, 0.08)",
    badgeBg: "bg-sky-50/80 text-sky-700 border-sky-200/60",
    hoverBorder: "hover:border-sky-300",
  },
  emerald: {
    topBar: "from-emerald-500 via-emerald-400 to-teal-600",
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    glow: "rgba(16, 185, 129, 0.08)",
    badgeBg: "bg-emerald-50/80 text-emerald-700 border-emerald-200/60",
    hoverBorder: "hover:border-emerald-300",
  },
  amber: {
    topBar: "from-amber-500 via-amber-400 to-orange-500",
    iconBg: "bg-amber-50 text-amber-600 border-amber-100",
    glow: "rgba(245, 158, 11, 0.08)",
    badgeBg: "bg-amber-50/80 text-amber-700 border-amber-200/60",
    hoverBorder: "hover:border-amber-300",
  },
  gold: {
    topBar: "from-[#D4AF37] via-[#E8CD8A] to-[#B48811]",
    iconBg: "bg-amber-50/80 text-[#B48811] border-amber-200/80",
    glow: "rgba(212, 175, 55, 0.12)",
    badgeBg: "bg-amber-50 text-[#854d0e] border-amber-200",
    hoverBorder: "hover:border-amber-300",
  },
  rose: {
    topBar: "from-rose-500 via-rose-400 to-pink-600",
    iconBg: "bg-rose-50 text-rose-600 border-rose-100",
    glow: "rgba(244, 63, 94, 0.08)",
    badgeBg: "bg-rose-50/80 text-rose-700 border-rose-200/60",
    hoverBorder: "hover:border-rose-300",
  },
};

function LuxuryStatCard({
  title,
  value,
  statusLabel,
  icon,
  theme,
  loading,
}: LuxuryStatCardProps) {
  const t = themeStyles[theme];

  if (loading) {
    return (
      <div className="relative rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-xs animate-pulse space-y-2.5">
        <div className="flex justify-between items-start">
          <div className="h-3 w-16 bg-slate-200 rounded-md" />
          <div className="h-7 w-7 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-6 w-20 bg-slate-200 rounded-md" />
        <div className="h-3 w-28 bg-slate-100 rounded-md" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl bg-white p-3.5 border border-slate-200/80",
        "shadow-[0_1px_4px_rgba(15,23,42,0.03)] hover:shadow-[0_6px_20px_-4px_rgba(15,23,42,0.08)]",
        "transition-all duration-200 hover:-translate-y-0.5",
        t.hoverBorder
      )}
      style={{
        backgroundImage: `radial-gradient(circle at top right, ${t.glow}, transparent 55%)`,
      }}
    >
      {/* Top accent radiant bar */}
      <div
        className={cn("absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r", t.topBar)}
      />

      {/* Header Row: Title & Glowing Icon Container */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span className="text-[10.5px] font-black uppercase tracking-[0.1em] text-slate-500 truncate">
          {title}
        </span>
        <div
          className={cn(
            "w-7.5 h-7.5 rounded-lg flex items-center justify-center border shadow-2xs transition-transform duration-200 group-hover:scale-105 shrink-0",
            t.iconBg
          )}
        >
          {icon}
        </div>
      </div>

      {/* Primary Value */}
      <div className="mb-1.5">
        <span className="text-[21px] sm:text-[23px] font-black tracking-tight text-slate-900 tabular-nums leading-none">
          {value}
        </span>
      </div>

      {/* Status Trend / Detail Pill */}
      <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1">
        <p className="text-[10.5px] font-semibold text-slate-500 truncate leading-snug">
          {statusLabel}
        </p>
      </div>
    </div>
  );
}

export function DashboardKpiGrid({ metrics, loading }: DashboardKpiGridProps) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <LuxuryStatCard
            key={i}
            title="Loading..."
            value="---"
            statusLabel="Fetching live data"
            icon={<Sparkles className="h-4 w-4" />}
            theme="indigo"
            loading={true}
          />
        ))}
      </div>
    );
  }

  const isInventoryConfigured = metrics.roomStatus === "configured" && metrics.totalRooms > 0;
  const currency = metrics.revenueCurrency || "INR";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. Occupancy */}
      <LuxuryStatCard
        title="Occupancy"
        value={formatPercentage(metrics.occupancyRate)}
        icon={<BedDouble className="h-4 w-4" />}
        statusLabel={
          isInventoryConfigured
            ? `${metrics.totalRooms - metrics.availableRooms} of ${metrics.totalRooms} rooms active`
            : "Setup rooms to calculate"
        }
        theme="indigo"
      />

      {/* 2. Available Rooms */}
      <LuxuryStatCard
        title="Available"
        value={metrics.availableRooms.toString()}
        icon={<DoorOpen className="h-4 w-4" />}
        statusLabel={
          isInventoryConfigured
            ? `${metrics.availableRooms} rooms vacant & clean`
            : "No inventory configured"
        }
        theme="sky"
      />

      {/* 3. Arrivals Today */}
      <LuxuryStatCard
        title="Arrivals"
        value={metrics.arrivalsToday.toString()}
        icon={<CalendarCheck className="h-4 w-4" />}
        statusLabel={
          metrics.arrivalsPending > 0
            ? `${metrics.arrivalsPending} pending check-in`
            : "All arrivals completed"
        }
        theme="emerald"
      />

      {/* 4. Departures Today */}
      <LuxuryStatCard
        title="Departures"
        value={metrics.departuresToday.toString()}
        icon={<CalendarX className="h-4 w-4" />}
        statusLabel={
          metrics.departuresPending > 0
            ? `${metrics.departuresPending} pending check-out`
            : "No check-outs today"
        }
        theme="amber"
      />

      {/* 5. In-House Guests */}
      <LuxuryStatCard
        title="In-House"
        value={metrics.inHouseGuests.toString()}
        icon={<Users className="h-4 w-4" />}
        statusLabel="Active registered guests"
        theme="gold"
      />

      {/* 6. Today's Revenue */}
      <LuxuryStatCard
        title="Revenue"
        value={formatCurrency(metrics.todayRevenue, currency)}
        icon={<TrendingUp className="h-4 w-4" />}
        statusLabel={metrics.todayRevenue > 0 ? "Live billed today" : "Folios & POS ready"}
        theme="emerald"
      />
    </div>
  );
}
