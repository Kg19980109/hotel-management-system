"use client";

import * as React from "react";
import type { ActivityItem } from "@/lib/dashboard/types";
import { History, Activity, Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

interface RecentActivityProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="stayhub-card p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-[var(--border)] rounded" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-[var(--secondary)] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-[var(--secondary)] rounded w-3/4" />
                <div className="h-2.5 bg-[var(--secondary)] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="stayhub-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[14.5px] font-semibold text-[var(--foreground)]">Recent Activity</h2>
          <p className="text-[11.5px] text-[var(--foreground-muted)] mt-0.5">Audit log of hotel events</p>
        </div>
        <span
          className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-full"
          style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
        >
          <Zap className="h-2.5 w-2.5" />
          Live Log
        </span>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<History className="h-8 w-8 text-[var(--foreground-subtle)]" />}
          title="No recent activity yet"
          description="Check-ins, reservations, room updates, and payments will appear here in real time."
          className="py-6 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
        />
      ) : (
        <div className="space-y-0 divide-y divide-[var(--border)]">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div
                className="h-7 w-7 rounded-full border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "var(--primary-subtle)" }}
              >
                <Activity className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-[var(--foreground)] leading-tight">
                    {act.title}
                  </p>
                  <span className="text-[10.5px] text-[var(--foreground-subtle)] shrink-0 tabular-nums">
                    {act.timestamp}
                  </span>
                </div>
                <p className="text-[11.5px] text-[var(--foreground-muted)] mt-0.5 leading-relaxed">
                  {act.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
