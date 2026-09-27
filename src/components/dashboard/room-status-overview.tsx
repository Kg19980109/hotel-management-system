"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RoomStatusSummary } from "@/lib/dashboard/types";
import { BedDouble, ArrowUpRight, CheckCircle2, Sparkles, Wrench, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

interface RoomStatusOverviewProps {
  summary: RoomStatusSummary | null;
  loading?: boolean;
}

const STATUS_CONFIGS = [
  {
    key: "available" as const,
    label: "Available",
    icon: CheckCircle2,
    bg: "bg-emerald-50/90 hover:bg-emerald-100/80 border-emerald-200/70",
    text: "text-emerald-700",
    numColor: "text-emerald-700",
    iconColor: "text-emerald-600",
    bar: "#10B981",
  },
  {
    key: "occupied" as const,
    label: "Occupied",
    icon: BedDouble,
    bg: "bg-indigo-50/90 hover:bg-indigo-100/80 border-indigo-200/70",
    text: "text-indigo-700",
    numColor: "text-indigo-700",
    iconColor: "text-indigo-600",
    bar: "#6366F1",
  },
  {
    key: "dirty" as const,
    label: "Cleaning",
    icon: Sparkles,
    bg: "bg-amber-50/90 hover:bg-amber-100/80 border-amber-200/70",
    text: "text-amber-800",
    numColor: "text-amber-800",
    iconColor: "text-amber-600",
    bar: "#F59E0B",
  },
  {
    key: "maintenance" as const,
    label: "Maintenance",
    icon: Wrench,
    bg: "bg-rose-50/90 hover:bg-rose-100/80 border-rose-200/70",
    text: "text-rose-700",
    numColor: "text-rose-700",
    iconColor: "text-rose-600",
    bar: "#F43F5E",
  },
];

export function RoomStatusOverview({ summary, loading }: RoomStatusOverviewProps) {
  const router = useRouter();

  if (loading || !summary) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 bg-slate-200 rounded-md" />
            <div className="h-4 w-16 bg-slate-200 rounded-md" />
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isConfigured = summary.isConfigured && summary.total > 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[15px] font-extrabold text-slate-900 tracking-tight">
            Room Inventory Matrix
          </h2>
          <p className="text-[12px] font-medium text-slate-500 mt-0.5">
            Physical room distribution &amp; readiness
          </p>
        </div>
        <Link
          href="/rooms"
          className="inline-flex items-center gap-1 text-[12px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-200/60 transition-all shadow-xs"
        >
          <span>Manage</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {!isConfigured ? (
        <EmptyState
          size="sm"
          icon={<BedDouble className="h-8 w-8 text-slate-400" />}
          title="Room inventory not configured"
          description="Configure your physical rooms to start managing availability and check-ins."
          action={{
            label: "Set up rooms",
            onClick: () => router.push("/rooms"),
          }}
          className="py-6 border border-dashed border-slate-200 rounded-2xl"
        />
      ) : (
        <div className="space-y-4">
          {/* Total + segmented bar */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                Total Property Inventory
              </span>
              <span className="text-[22px] font-black text-slate-900 tabular-nums leading-none">
                {summary.total} <span className="text-[12px] font-bold text-slate-400 font-sans">Rooms</span>
              </span>
            </div>

            {/* Segmented distribution bar */}
            <div className="h-2.5 w-full rounded-full bg-slate-200/70 flex overflow-hidden gap-0.5 shadow-inner">
              {STATUS_CONFIGS.map((cfg) => {
                const val = summary[cfg.key] ?? 0;
                if (val === 0) return null;
                const pct = (val / summary.total) * 100;
                return (
                  <div
                    key={cfg.key}
                    style={{ width: `${pct}%`, background: cfg.bar }}
                    title={`${cfg.label}: ${val} rooms (${Math.round(pct)}%)`}
                    className="first:rounded-l-full last:rounded-r-full transition-all duration-300"
                  />
                );
              })}
            </div>

            {/* Legend with colored indicator dots */}
            <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-200/60 flex-wrap">
              {STATUS_CONFIGS.map((cfg) => {
                const val = summary[cfg.key] ?? 0;
                return (
                  <span key={cfg.key} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <span className="h-2 w-2 rounded-full shadow-xs" style={{ background: cfg.bar }} />
                    {cfg.label}: <strong className="text-slate-800 tabular-nums">{val}</strong>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Status tiles (2x2) */}
          <div className="grid grid-cols-2 gap-2.5">
            {STATUS_CONFIGS.map((cfg) => {
              const val = summary[cfg.key] ?? 0;
              const Icon = cfg.icon;
              return (
                <div
                  key={cfg.key}
                  className={cn(
                    "rounded-xl p-3 flex items-center gap-3 border shadow-xs transition-all duration-200 hover:-translate-y-0.5",
                    cfg.bg
                  )}
                >
                  <div className="h-9 w-9 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0 border border-black/5">
                    <Icon className={cn("h-4.5 w-4.5", cfg.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-[20px] font-black leading-none tabular-nums", cfg.numColor)}>
                      {val}
                    </p>
                    <p className={cn("text-[11px] font-bold mt-1 uppercase tracking-wide truncate", cfg.text)}>
                      {cfg.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
