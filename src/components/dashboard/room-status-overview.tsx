"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RoomStatusSummary } from "@/lib/dashboard/types";
import { BedDouble, ArrowUpRight, CheckCircle2, Sparkles, Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/states";

interface RoomStatusOverviewProps {
  summary: RoomStatusSummary | null;
  loading?: boolean;
}

export function RoomStatusOverview({ summary, loading }: RoomStatusOverviewProps) {
  const router = useRouter();
  if (loading || !summary) {
    return (
      <div className="stayhub-card p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-36 bg-slate-200 rounded" />
          <div className="h-28 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  const isConfigured = summary.isConfigured && summary.total > 0;

  return (
    <div className="stayhub-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
            Room Inventory Status
          </h2>
          <p className="text-[12px] text-[var(--foreground-muted)]">
            Live operational status of physical rooms
          </p>
        </div>
        <Link
          href="/rooms"
          className="text-[12px] font-medium text-[var(--primary)] hover:underline flex items-center gap-1"
        >
          Manage Rooms <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {!isConfigured ? (
        <EmptyState
          size="sm"
          icon={<BedDouble className="h-8 w-8 text-[var(--foreground-subtle)]" />}
          title="Room inventory not configured"
          description="Configure your physical rooms, categories, and bed configurations to start managing availability and check-ins."
          action={{
            label: "Set up rooms",
            onClick: () => {
              router.push("/rooms");
            },
          }}
          className="py-6 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]"
        />
      ) : (
        <div className="space-y-4">
          {/* Progress bar of status distribution */}
          <div className="h-2.5 w-full rounded-full bg-slate-100 flex overflow-hidden">
            {summary.available > 0 && (
              <div
                style={{ width: `${(summary.available / summary.total) * 100}%` }}
                className="bg-[var(--success)]"
                title={`Available: ${summary.available}`}
              />
            )}
            {summary.occupied > 0 && (
              <div
                style={{ width: `${(summary.occupied / summary.total) * 100}%` }}
                className="bg-[var(--primary)]"
                title={`Occupied: ${summary.occupied}`}
              />
            )}
            {summary.dirty > 0 && (
              <div
                style={{ width: `${(summary.dirty / summary.total) * 100}%` }}
                className="bg-[var(--warning)]"
                title={`Needs Cleaning: ${summary.dirty}`}
              />
            )}
            {summary.maintenance > 0 && (
              <div
                style={{ width: `${(summary.maintenance / summary.total) * 100}%` }}
                className="bg-[var(--danger)]"
                title={`Maintenance: ${summary.maintenance}`}
              />
            )}
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--success-light)] border border-[var(--success)]/20">
              <div className="flex items-center gap-1.5 text-[var(--success)] text-[12px] font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Available
              </div>
              <p className="text-lg font-bold text-[var(--foreground)] mt-1">
                {summary.available}
              </p>
            </div>

            <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--primary-light)] border border-[var(--primary)]/20">
              <div className="flex items-center gap-1.5 text-[var(--primary)] text-[12px] font-medium">
                <BedDouble className="h-3.5 w-3.5" />
                Occupied
              </div>
              <p className="text-lg font-bold text-[var(--foreground)] mt-1">
                {summary.occupied}
              </p>
            </div>

            <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--warning-light)] border border-[var(--warning)]/20">
              <div className="flex items-center gap-1.5 text-[var(--warning)] text-[12px] font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Needs Cleaning
              </div>
              <p className="text-lg font-bold text-[var(--foreground)] mt-1">
                {summary.dirty}
              </p>
            </div>

            <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--danger-light)] border border-[var(--danger)]/20">
              <div className="flex items-center gap-1.5 text-[var(--danger)] text-[12px] font-medium">
                <Wrench className="h-3.5 w-3.5" />
                Maintenance
              </div>
              <p className="text-lg font-bold text-[var(--foreground)] mt-1">
                {summary.maintenance}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
