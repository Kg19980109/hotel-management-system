"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/dashboard/formatters";
import type { DashboardMetrics } from "@/lib/dashboard/types";
import { TrendingUp, BarChart3, ArrowUpRight, DollarSign, Calendar, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

interface RevenueOccupancyOverviewProps {
  metrics: DashboardMetrics | null;
  currency: string;
  loading?: boolean;
}

export function RevenueOccupancyOverview({
  metrics,
  currency,
  loading,
}: RevenueOccupancyOverviewProps) {
  const router = useRouter();
  const [revenueTab, setRevenueTab] = React.useState("today");
  const [occupancyTab, setOccupancyTab] = React.useState("today");

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm animate-pulse space-y-4">
            <div className="h-4 w-36 bg-slate-200 rounded-md" />
            <div className="h-8 w-48 bg-slate-100 rounded-xl" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const isConfigured =
    metrics?.roomStatus === "configured" && (metrics?.totalRooms || 0) > 0;

  const revenueTabs = [
    { key: "today", label: "Today" },
    { key: "7d", label: "Last 7 Days" },
    { key: "30d", label: "Last 30 Days" },
  ];

  const occupancyTabs = [
    { key: "today", label: "Today" },
    { key: "7d", label: "Next 7 Days" },
    { key: "30d", label: "Next 30 Days" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ── REVENUE ANALYTICS ── */}
      <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-extrabold text-slate-900 tracking-tight">
                  Revenue Analytics
                </h2>
                <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                  Room stays, restaurant POS &amp; services
                </p>
              </div>
            </div>
            <Link
              href="/billing"
              className="inline-flex items-center gap-1 text-[12px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-200/60 transition-all shadow-xs"
            >
              <span>Billing</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70 mb-4 self-start w-fit">
            {revenueTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setRevenueTab(t.key)}
                className={cn(
                  "px-3 py-1 text-[11.5px] font-bold rounded-lg transition-all",
                  revenueTab === t.key
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Revenue Content */}
          {revenueTab === "today" && (
            <div>
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 mb-4 shadow-2xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Room Rev
                  </span>
                  <p className="text-[15px] font-black text-slate-900 mt-1 tabular-nums">
                    {formatCurrency(0, currency)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    F&amp;B Rev
                  </span>
                  <p className="text-[15px] font-black text-slate-900 mt-1 tabular-nums">
                    {formatCurrency(0, currency)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                    Total Rev
                  </span>
                  <p className="text-[15px] font-black text-emerald-600 mt-1 tabular-nums">
                    {formatCurrency(metrics?.todayRevenue || 0, currency)}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center gap-3">
                <div className="h-8.5 w-8.5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[12.5px] font-bold text-slate-800">
                    Live Revenue Tracking
                  </p>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed mt-0.5">
                    Orders from POS, dining &amp; front-desk checkout update automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {revenueTab === "7d" && (
            <EmptyState
              size="sm"
              icon={<DollarSign className="h-8 w-8 text-slate-400" />}
              title="No 7-day revenue records"
              description="Historical revenue trends will appear here once transactions are recorded."
              className="py-10 border border-dashed border-slate-200 rounded-2xl"
            />
          )}

          {revenueTab === "30d" && (
            <EmptyState
              size="sm"
              icon={<DollarSign className="h-8 w-8 text-slate-400" />}
              title="No 30-day revenue records"
              description="Monthly revenue pacing and ADR metrics will calculate automatically."
              className="py-10 border border-dashed border-slate-200 rounded-2xl"
            />
          )}
        </div>
      </div>

      {/* ── OCCUPANCY PACING ── */}
      <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center shrink-0 shadow-xs">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-extrabold text-slate-900 tracking-tight">
                  Occupancy Pacing
                </h2>
                <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                  Daily occupancy rate &amp; capacity utilization
                </p>
              </div>
            </div>
            <Link
              href="/rooms"
              className="inline-flex items-center gap-1 text-[12px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-200/60 transition-all shadow-xs"
            >
              <span>Room Setup</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70 mb-4 self-start w-fit">
            {occupancyTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setOccupancyTab(t.key)}
                className={cn(
                  "px-3 py-1 text-[11.5px] font-bold rounded-lg transition-all",
                  occupancyTab === t.key
                    ? "bg-white text-indigo-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {occupancyTab === "today" && (
            <div>
              {/* Mini KPI Strip */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 mb-4 shadow-2xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Occupancy Rate
                  </span>
                  <p className="text-[18px] font-black text-indigo-600 mt-1 tabular-nums">
                    {formatPercentage(metrics?.occupancyRate || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Total Inventory
                  </span>
                  <p className="text-[18px] font-black text-slate-900 mt-1 tabular-nums">
                    {isConfigured ? `${metrics?.totalRooms} Rooms` : "0 Rooms"}
                  </p>
                </div>
              </div>

              {!isConfigured ? (
                <EmptyState
                  size="sm"
                  icon={<Calendar className="h-8 w-8 text-slate-400" />}
                  title="Configure rooms to track occupancy"
                  description="Add physical room inventory to start measuring occupancy rates, ADR, and RevPAR."
                  action={{
                    label: "Set up rooms",
                    onClick: () => router.push("/rooms"),
                  }}
                  className="py-6 border border-dashed border-slate-200 rounded-2xl"
                />
              ) : (
                <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center gap-3">
                  <div className="h-8.5 w-8.5 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-bold text-indigo-950">
                      Live Capacity Calculation
                    </p>
                    <p className="text-[11.5px] text-indigo-700 leading-relaxed mt-0.5">
                      {metrics?.availableRooms} vacant rooms ready for same-day walk-in bookings.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {occupancyTab === "7d" && (
            <EmptyState
              size="sm"
              icon={<BarChart3 className="h-8 w-8 text-slate-400" />}
              title="7-day forecast unavailable"
              description="Forward-looking reservation pace requires active bookings in the system."
              className="py-10 border border-dashed border-slate-200 rounded-2xl"
            />
          )}

          {occupancyTab === "30d" && (
            <EmptyState
              size="sm"
              icon={<BarChart3 className="h-8 w-8 text-slate-400" />}
              title="30-day forecast unavailable"
              description="Month-ahead forecasting activates once booking inventory is populated."
              className="py-10 border border-dashed border-slate-200 rounded-2xl"
            />
          )}
        </div>
      </div>
    </div>
  );
}
