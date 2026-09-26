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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="stayhub-card p-5 animate-pulse space-y-4">
            <div className="h-4 w-36 bg-[var(--border)] rounded" />
            <div className="h-8 w-48 bg-[var(--secondary)] rounded-[var(--radius-md)]" />
            <div className="h-40 bg-[var(--secondary)] rounded-[var(--radius-lg)]" />
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
      {/* ── REVENUE ── */}
      <div className="stayhub-card p-5 flex flex-col">
        <div>
          {/* Card header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div
                  className="h-7 w-7 rounded-[var(--radius-md)] flex items-center justify-center"
                  style={{ background: "var(--success-light)" }}
                >
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: "var(--success)" }} />
                </div>
                <h2 className="text-[14.5px] font-semibold text-[var(--foreground)]">
                  Revenue Analytics
                </h2>
              </div>
              <p className="text-[11.5px] text-[var(--foreground-muted)]">
                Room stays, restaurant POS &amp; extras
              </p>
            </div>
            <Link
              href="/billing"
              className="flex items-center gap-1 text-[11.5px] font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors shrink-0"
            >
              Billing
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Tabs */}
          <div className="mb-4">
            <Tabs
              tabs={revenueTabs}
              activeKey={revenueTab}
              onChange={setRevenueTab}
              variant="pill"
              size="sm"
            />
          </div>

          {/* Revenue Today */}
          {revenueTab === "today" && (
            <div>
              <div
                className="grid grid-cols-3 gap-3 p-3.5 rounded-[var(--radius-lg)] border mb-4"
                style={{ background: "var(--muted)", borderColor: "var(--card-border)" }}
              >
                {[
                  { label: "Room Rev", value: formatCurrency(0, currency) },
                  { label: "F&B Rev", value: formatCurrency(0, currency) },
                  { label: "Total Rev", value: formatCurrency(0, currency), highlight: true },
                ].map((item) => (
                  <div key={item.label}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)]">
                      {item.label}
                    </span>
                    <p
                      className="text-[13px] font-bold mt-1"
                      style={{
                        color: item.highlight ? "var(--success)" : "var(--foreground)",
                      }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <EmptyState
                size="sm"
                icon={<DollarSign className="h-7 w-7 text-[var(--foreground-subtle)]" />}
                title="Revenue tracking pending billing setup"
                description="Revenue charts will activate once guest folios and payments are recorded."
                className="py-6 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
              />
            </div>
          )}

          {revenueTab === "7d" && (
            <EmptyState
              size="sm"
              icon={<DollarSign className="h-7 w-7 text-[var(--foreground-subtle)]" />}
              title="No 7-day revenue records"
              description="Historical revenue trends will appear here once transactions are active."
              className="py-10 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
            />
          )}

          {revenueTab === "30d" && (
            <EmptyState
              size="sm"
              icon={<DollarSign className="h-7 w-7 text-[var(--foreground-subtle)]" />}
              title="No 30-day revenue records"
              description="Monthly revenue pacing and ADR metrics will calculate automatically."
              className="py-10 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
            />
          )}
        </div>
      </div>

      {/* ── OCCUPANCY ── */}
      <div className="stayhub-card p-5 flex flex-col">
        <div>
          {/* Card header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div
                  className="h-7 w-7 rounded-[var(--radius-md)] flex items-center justify-center"
                  style={{ background: "var(--primary-light)" }}
                >
                  <BarChart3 className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
                </div>
                <h2 className="text-[14.5px] font-semibold text-[var(--foreground)]">
                  Occupancy Pacing
                </h2>
              </div>
              <p className="text-[11.5px] text-[var(--foreground-muted)]">
                Daily occupancy rate &amp; capacity utilization
              </p>
            </div>
            <Link
              href="/rooms"
              className="flex items-center gap-1 text-[11.5px] font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors shrink-0"
            >
              Room Setup
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Tabs */}
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
              {/* KPI mini strip */}
              <div
                className="grid grid-cols-2 gap-3 p-3.5 rounded-[var(--radius-lg)] border mb-4"
                style={{ background: "var(--muted)", borderColor: "var(--card-border)" }}
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)]">
                    Occupancy Rate
                  </span>
                  <p className="text-[13px] font-bold text-[var(--foreground)] mt-1">
                    {formatPercentage(metrics?.occupancyRate || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)]">
                    Total Inventory
                  </span>
                  <p className="text-[13px] font-bold text-[var(--foreground)] mt-1">
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
                    onClick: () => router.push("/rooms"),
                  }}
                  className="py-6 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
                />
              ) : (
                <EmptyState
                  size="sm"
                  icon={<BarChart3 className="h-7 w-7 text-[var(--foreground-subtle)]" />}
                  title="No active reservations for today"
                  description="Occupancy calculation is live. Add reservations to view room distribution."
                  className="py-6 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
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
              className="py-10 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
            />
          )}

          {occupancyTab === "30d" && (
            <EmptyState
              size="sm"
              icon={<BarChart3 className="h-7 w-7 text-[var(--foreground-subtle)]" />}
              title="30-day forecast unavailable"
              description="Month-ahead forecasting activates once booking inventory is populated."
              className="py-10 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
