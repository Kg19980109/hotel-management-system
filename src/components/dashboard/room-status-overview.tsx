"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RoomStatusSummary } from "@/lib/dashboard/types";
import { BedDouble, ArrowUpRight, CheckCircle2, Sparkles, Wrench } from "lucide-react";
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
    bg: "var(--success-light)",
    text: "var(--success-foreground)",
    iconColor: "var(--success)",
    bar: "var(--success)",
  },
  {
    key: "occupied" as const,
    label: "Occupied",
    icon: BedDouble,
    bg: "var(--purple-light)",
    text: "var(--purple-foreground)",
    iconColor: "var(--purple)",
    bar: "var(--purple)",
  },
  {
    key: "dirty" as const,
    label: "Cleaning",
    icon: Sparkles,
    bg: "var(--warning-light)",
    text: "var(--warning-foreground)",
    iconColor: "var(--warning)",
    bar: "var(--warning)",
  },
  {
    key: "maintenance" as const,
    label: "Maintenance",
    icon: Wrench,
    bg: "var(--danger-light)",
    text: "var(--danger-foreground)",
    iconColor: "var(--danger)",
    bar: "var(--danger)",
  },
];

export function RoomStatusOverview({ summary, loading }: RoomStatusOverviewProps) {
  const router = useRouter();

  if (loading || !summary) {
    return (
      <div className="stayhub-card p-5">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 bg-[var(--border)] rounded" />
            <div className="h-3.5 w-20 bg-[var(--border)] rounded" />
          </div>
          <div className="h-2.5 w-full bg-[var(--secondary)] rounded-full" />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[var(--secondary)] rounded-[var(--radius-md)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isConfigured = summary.isConfigured && summary.total > 0;

  return (
    <div className="stayhub-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[14.5px] font-semibold text-[var(--foreground)]">
            Room Inventory
          </h2>
          <p className="text-[11.5px] text-[var(--foreground-muted)] mt-0.5">
            Live operational status
          </p>
        </div>
        <Link
          href="/rooms"
          className="flex items-center gap-1 text-[11.5px] font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          Manage
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {!isConfigured ? (
        <EmptyState
          size="sm"
          icon={<BedDouble className="h-8 w-8 text-[var(--foreground-subtle)]" />}
          title="Room inventory not configured"
          description="Configure your physical rooms to start managing availability and check-ins."
          action={{
            label: "Set up rooms",
            onClick: () => router.push("/rooms"),
          }}
          className="py-6 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
        />
      ) : (
        <div className="space-y-4">
          {/* Total + segmented bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider">
                Total Rooms
              </span>
              <span className="text-[20px] font-bold text-[var(--foreground)] tabular-nums leading-none">
                {summary.total}
              </span>
            </div>

            {/* Segmented distribution bar */}
            <div className="h-2 w-full rounded-full bg-[var(--secondary)] flex overflow-hidden gap-px">
              {STATUS_CONFIGS.map((cfg) => {
                const val = summary[cfg.key] ?? 0;
                if (val === 0) return null;
                const pct = (val / summary.total) * 100;
                return (
                  <div
                    key={cfg.key}
                    style={{ width: `${pct}%`, background: cfg.bar }}
                    title={`${cfg.label}: ${val}`}
                    className="first:rounded-l-full last:rounded-r-full transition-all"
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {STATUS_CONFIGS.map((cfg) => {
                const val = summary[cfg.key] ?? 0;
                return (
                  <span key={cfg.key} className="flex items-center gap-1 text-[10.5px] text-[var(--foreground-subtle)]">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.bar }} />
                    {cfg.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Status tiles */}
          <div className="grid grid-cols-2 gap-2">
            {STATUS_CONFIGS.map((cfg) => {
              const val = summary[cfg.key] ?? 0;
              const Icon = cfg.icon;
              return (
                <div
                  key={cfg.key}
                  className="rounded-[var(--radius-md)] p-3 flex items-center gap-2.5 hover-lift"
                  style={{ background: cfg.bg }}
                >
                  <div
                    className="h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.60)" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: cfg.iconColor }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[20px] font-bold leading-none tabular-nums" style={{ color: cfg.iconColor }}>
                      {val}
                    </p>
                    <p className="text-[10.5px] font-semibold mt-0.5 truncate" style={{ color: cfg.text }}>
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
