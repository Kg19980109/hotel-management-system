"use client";

import * as React from "react";
import type { ActivityItem } from "@/lib/dashboard/types";
import { History, Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/states";

interface RecentActivityProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="stayhub-card p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-24 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="stayhub-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
            Recent Activity
          </h2>
          <p className="text-[12px] text-[var(--foreground-muted)]">
            Audit log of hotel operational events
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider flex items-center gap-1">
          <Activity className="h-3 w-3 text-[var(--primary)]" />
          Live Log
        </span>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<History className="h-8 w-8 text-[var(--foreground-subtle)]" />}
          title="No recent activity recorded yet"
          description="Operational events such as check-ins, reservations, room status updates, and payments will appear here in real time."
          className="py-6 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]"
        />
      ) : (
        <div className="space-y-3">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
              <div className="h-7 w-7 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="h-3.5 w-3.5 text-[var(--primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-[var(--foreground)] truncate">
                    {act.title}
                  </p>
                  <span className="text-[11px] text-[var(--foreground-subtle)] shrink-0">
                    {act.timestamp}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--foreground-muted)]">{act.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
