"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import type { HousekeepingKPIs } from "@/lib/housekeeping/types";
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Flame,
  ShieldAlert,
} from "lucide-react";

interface HousekeepingKPIGridProps {
  stats: HousekeepingKPIs;
  loading?: boolean;
}

export function HousekeepingKPIGrid({ stats, loading }: HousekeepingKPIGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4 bg-white border border-[var(--border)] shadow-xs">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-7 w-12" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Dirty Rooms */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-rose-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Dirty Rooms</span>
          <AlertTriangle className="h-4 w-4 text-rose-500" />
        </div>
        <div className="text-2xl font-bold text-rose-600 font-mono">
          {stats.dirtyRooms}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Awaiting cleaning</p>
      </Card>

      {/* Cleaning in progress */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-purple-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Cleaning</span>
          <Sparkles className="h-4 w-4 text-purple-500" />
        </div>
        <div className="text-2xl font-bold text-purple-600 font-mono">
          {stats.cleaningInProgress}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">In progress now</p>
      </Card>

      {/* Inspection Pending */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-amber-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Inspection</span>
          <Clock className="h-4 w-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold text-amber-600 font-mono">
          {stats.inspectionPending}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Ready for review</p>
      </Card>

      {/* Ready / Clean */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-emerald-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Ready / Clean</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-bold text-emerald-600 font-mono">
          {stats.readyClean}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Available for check-in</p>
      </Card>

      {/* Priority Tasks */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-orange-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Priority</span>
          <Flame className="h-4 w-4 text-orange-500" />
        </div>
        <div className="text-2xl font-bold text-orange-600 font-mono">
          {stats.priorityTasks}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">High / Urgent queue</p>
      </Card>

      {/* Out of Order / Service */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Out of Service</span>
          <ShieldAlert className="h-4 w-4 text-slate-500" />
        </div>
        <div className="text-2xl font-bold text-slate-700 font-mono">
          {stats.outOfServiceOrOrder}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Maintenance / Blocked</p>
      </Card>
    </div>
  );
}
