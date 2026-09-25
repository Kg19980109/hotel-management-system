"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/dashboard/formatters";
import type { DashboardMetrics } from "@/lib/dashboard/types";
import { Tabs } from "@/components/ui/tabs";
import { TrendingUp, BarChart3, ArrowUpRight, DollarSign, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/states";

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stayhub-card p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-36 bg-slate-200 rounded" />
            <div className="h-44 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="stayhub-card p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-36 bg-slate-200 rounded" />
            <div className="h-44 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const isConfigured = metrics?.roomStatus === "configured" && (metrics?.totalRooms || 0) > 0;

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. REVENUE OVERVIEW CARD */}
      <div className="stayhub-card p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--foreground)] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--success)]" />
                Revenue Analytics
              </h2>
              <p className="text-[12px] text-[var(--foreground-muted)]">
                Property income across room stays, restaurant POS, and extras
              </p>
            </div>
            <Link
              href="/billing"
              className="text-[12px] font-medium text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              Billing & Folios <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Timeframe Tabs */}
          <div className="mb-4">
            <Tabs
              tabs={revenueTabs}
              activeKey={revenueTab}
              onChange={setRevenueTab}
              variant="pill"
              size="sm"
            />
          </div>

          {revenueTab === "today" && (
            <div>
              <div className="grid grid-cols-3 gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)] mb-4">
                <div>
                  <span className="text-[11px] text-[var(--foreground-muted)]">Room Rev</span>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {formatCurrency(0, currency)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--foreground-muted)]">F&B Rev</span>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {formatCurrency(0, currency)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--foreground-muted)]">Total Rev</span>
                  <p className="text-sm font-semibold text-[var(--success)]">
                    {formatCurrency(0, currency)}
                  </p>
                </div>
              </div>

              <EmptyState
                size="sm"
                icon={<DollarSign className="h-7 w-7 text-[var(--foreground-subtle)]" />}
                title="Revenue tracking pending billing setup"
                description="Revenue charts and channel breakdowns will activate once guest folios, bookings, and payments are recorded."
                className="py-6 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]/50"
              />
            </div>
          )}

          {revenueTab === "7d" && (
            <EmptyState
              size="sm"
              icon={<DollarSign className="h-7 w-7 text-[var(--foreground-subtle)]" />}
              title="No 7-day revenue records"
              description="Historical revenue trends will appear here once booking transactions are active."
              className="py-10 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]/50"
            />
          )}

          {revenueTab === "30d" && (
            <EmptyState
              size="sm"
              icon={<DollarSign className="h-7 w-7 text-[var(--foreground-subtle)]" />}
              title="No 30-day revenue records"
              description="Monthly revenue pacing and ADR metrics will calculate automatically."
              className="py-10 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]/50"
            />
          )}
        </div>
      </div>

      {/* 2. OCCUPANCY OVERVIEW CARD */}
      <div className="stayhub-card p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--foreground)] flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
                Occupancy Pacing
              </h2>
              <p className="text-[12px] text-[var(--foreground-muted)]">
                Daily occupancy rate and capacity utilization
              </p>
            </div>
            <Link
              href="/rooms"
              className="text-[12px] font-medium text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              Room Setup <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mb-4">
            <Tabs
              tabs={occupancyTabs}
              activeKey={occupancyTab}
              onChange={setOccupancyTab}
              variant="pill"
              size="sm"
            />
          </div>

          {occupancyTab === "today" && (
            <div>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)] mb-4">
                <div>
                  <span className="text-[11px] text-[var(--foreground-muted)]">Occupancy Rate</span>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {formatPercentage(metrics?.occupancyRate || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--foreground-muted)]">Inventory Configured</span>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {isConfigured ? `${metrics?.totalRooms} Rooms` : "0 Rooms"}
                  </p>
                </div>
              </div>

              {!isConfigured ? (
                <EmptyState
                  size="sm"
                  icon={<Calendar className="h-7 w-7 text-[var(--foreground-subtle)]" />}
                  title="Configure rooms to track occupancy"
                  description="Add physical room inventory to start measuring occupancy rates, ADR, and RevPAR."
                  action={{
                    label: "Set up rooms",
                    onClick: () => {
                      router.push("/rooms");
                    },
                  }}
                  className="py-6 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]/50"
                />
              ) : (
                <EmptyState
                  size="sm"
                  icon={<BarChart3 className="h-7 w-7 text-[var(--foreground-subtle)]" />}
                  title="No active reservations for today"
                  description="Occupancy calculation is live. Add guest reservations to view room distribution."
                  className="py-6 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]/50"
                />
              )}
            </div>
          )}

          {occupancyTab === "7d" && (
            <EmptyState
              size="sm"
              icon={<BarChart3 className="h-7 w-7 text-[var(--foreground-subtle)]" />}
              title="7-day forecast unavailable"
              description="Forward-looking reservation pace requires active bookings in the system."
              className="py-10 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]/50"
            />
          )}

          {occupancyTab === "30d" && (
            <EmptyState
              size="sm"
              icon={<BarChart3 className="h-7 w-7 text-[var(--foreground-subtle)]" />}
              title="30-day forecast unavailable"
              description="Month-ahead occupancy forecasting activates once booking inventory is populated."
              className="py-10 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]/50"
            />
          )}
        </div>
      </div>
    </div>
  );
}
