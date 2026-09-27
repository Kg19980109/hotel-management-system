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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── REVENUE ANALYTICS ── */}
      <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-4.5 shadow-[0_1px_4px_rgba(15,23,42,0.03)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.06)] transition-all duration-200 flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-[14px] font-black text-slate-900 tracking-tight">
                  Revenue Analytics
                </h2>
                <p className="text-[11px] font-medium text-slate-500">
                  Room stays, restaurant POS &amp; services
                </p>
              </div>
            </div>
            <Link
              href="/billing"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-2 py-0.5 rounded-lg border border-indigo-200/60 transition-all shadow-2xs"
            >
              <span>Billing</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200/70 mb-3 self-start w-fit">
            {revenueTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setRevenueTab(t.key)}
                className={cn(
                  "px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all",
                  revenueTab === t.key
                    ? "bg-white text-emerald-800 shadow-2xs"
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
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 mb-2.5 shadow-2xs">
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
                    Room Rev
                  </span>
                  <p className="text-[14px] font-black text-slate-900 mt-0.5 tabular-nums">
                    {formatCurrency(0, currency)}
                  </p>
                </div>
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
                    F&amp;B Rev
                  </span>
                  <p className="text-[14px] font-black text-slate-900 mt-0.5 tabular-nums">
                    {formatCurrency(0, currency)}
                  </p>
                </div>
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-700">
                    Total Rev
                  </span>
                  <p className="text-[14px] font-black text-emerald-600 mt-0.5 tabular-nums">
                    {formatCurrency(metrics?.todayRevenue || 0, currency)}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[11.5px] font-bold text-slate-800">
                    Live Revenue Tracking
                  </p>
                  <p className="text-[10.5px] text-slate-500 leading-tight">
                    Orders from POS, dining &amp; front-desk checkout update automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {revenueTab === "7d" && (
            <EmptyState
              size="sm"
              icon={<DollarSign className="h-7 w-7 text-slate-400" />}
              title="No 7-day revenue records"
              description="Historical revenue trends will appear here once transactions are recorded."
              className="py-6 border border-dashed border-slate-200 rounded-xl"
            />
          )}

          {revenueTab === "30d" && (
            <EmptyState
              size="sm"
              icon={<DollarSign className="h-7 w-7 text-slate-400" />}
              title="No 30-day revenue records"
              description="Monthly revenue pacing and ADR metrics will calculate automatically."
              className="py-6 border border-dashed border-slate-200 rounded-xl"
            />
          )}
        </div>
      </div>

      {/* ── OCCUPANCY PACING ── */}
      <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-4.5 shadow-[0_1px_4px_rgba(15,23,42,0.03)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.06)] transition-all duration-200 flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-[14px] font-black text-slate-900 tracking-tight">
                  Occupancy Pacing
                </h2>
                <p className="text-[11px] font-medium text-slate-500">
                  Daily occupancy rate &amp; capacity utilization
                </p>
              </div>
            </div>
            <Link
              href="/rooms"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-2 py-0.5 rounded-lg border border-indigo-200/60 transition-all shadow-2xs"
            >
              <span>Room Setup</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200/70 mb-3 self-start w-fit">
            {occupancyTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setOccupancyTab(t.key)}
                className={cn(
                  "px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all",
                  occupancyTab === t.key
                    ? "bg-white text-indigo-800 shadow-2xs"
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
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 mb-2.5 shadow-2xs">
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
                    Occupancy Rate
                  </span>
                  <p className="text-[16px] font-black text-indigo-600 mt-0.5 tabular-nums">
                    {formatPercentage(metrics?.occupancyRate || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
                    Total Inventory
                  </span>
                  <p className="text-[16px] font-black text-slate-900 mt-0.5 tabular-nums">
                    {isConfigured ? `${metrics?.totalRooms} Rooms` : "0 Rooms"}
                  </p>
                </div>
              </div>

              {!isConfigured ? (
                <EmptyState
                  size="sm"
                  icon={<Calendar className="h-7 w-7 text-slate-400" />}
                  title="Configure rooms to track occupancy"
                  description="Add physical room inventory to start measuring occupancy rates."
                  action={{
                    label: "Set up rooms",
                    onClick: () => router.push("/rooms"),
                  }}
                  className="py-5 border border-dashed border-slate-200 rounded-xl"
                />
              ) : (
                <div className="p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[11.5px] font-bold text-indigo-950">
                      Live Capacity Calculation
                    </p>
                    <p className="text-[10.5px] text-indigo-700 leading-tight">
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
              icon={<BarChart3 className="h-7 w-7 text-slate-400" />}
              title="7-day forecast unavailable"
              description="Forward-looking reservation pace requires active bookings in the system."
              className="py-6 border border-dashed border-slate-200 rounded-xl"
            />
          )}

          {occupancyTab === "30d" && (
            <EmptyState
              size="sm"
              icon={<BarChart3 className="h-7 w-7 text-slate-400" />}
              title="30-day forecast unavailable"
              description="Month-ahead forecasting activates once booking inventory is populated."
              className="py-6 border border-dashed border-slate-200 rounded-xl"
            />
          )}
        </div>
      </div>
    </div>
  );
}
