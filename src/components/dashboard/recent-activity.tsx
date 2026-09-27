"use client";

import * as React from "react";
import type { ActivityItem } from "@/lib/dashboard/types";
import { History, Activity, Zap, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

interface RecentActivityProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded-md" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-extrabold text-slate-900 tracking-tight">
            Recent Activity
          </h2>
          <p className="text-[12px] font-medium text-slate-500 mt-0.5">
            Audit log of live property events
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
          Live Feed
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-2 shadow-2xs">
            <History className="h-5 w-5" />
          </div>
          <h4 className="text-[13.5px] font-bold text-slate-800">No Recent Activity Yet</h4>
          <p className="text-[11.5px] text-slate-500 mt-1 max-w-[220px]">
            Check-ins, reservations, room updates, and payments will stream here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-slate-100">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3.5 py-3 first:pt-0 last:pb-0 group/row">
              <div className="h-8.5 w-8.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600 shadow-2xs group-hover/row:scale-105 transition-transform">
                <Activity className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-bold text-slate-900 leading-tight">
                    {act.title}
                  </p>
                  <span className="text-[11px] font-medium text-slate-400 shrink-0 tabular-nums">
                    {act.timestamp}
                  </span>
                </div>
                <p className="text-[12px] font-medium text-slate-500 mt-0.5 leading-relaxed">
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
