"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import type { MaintenanceKPIs } from "@/lib/maintenance/types";
import {
  Wrench,
  UserCheck,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Flame,
  ClockAlert,
  ShieldAlert,
} from "lucide-react";

interface MaintenanceKPIGridProps {
  stats: MaintenanceKPIs;
  loading?: boolean;
}

export function MaintenanceKPIGrid({ stats, loading }: MaintenanceKPIGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-3.5 bg-white border border-[var(--border)] shadow-xs">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-7 w-10" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {/* Open */}
      <Card className="p-3.5 bg-white border border-[var(--border)] shadow-xs hover:border-blue-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Open</span>
          <Wrench className="h-4 w-4 text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-blue-600 font-mono">
          {stats.open}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Unassigned</p>
      </Card>

      {/* Assigned */}
      <Card className="p-3.5 bg-white border border-[var(--border)] shadow-xs hover:border-indigo-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Assigned</span>
          <UserCheck className="h-4 w-4 text-indigo-500" />
        </div>
        <div className="text-2xl font-bold text-indigo-600 font-mono">
          {stats.assigned}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Technician set</p>
      </Card>

      {/* In Progress */}
      <Card className="p-3.5 bg-white border border-[var(--border)] shadow-xs hover:border-purple-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">In Progress</span>
          <PlayCircle className="h-4 w-4 text-purple-500" />
        </div>
        <div className="text-2xl font-bold text-purple-600 font-mono">
          {stats.inProgress}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Under repair</p>
      </Card>

      {/* On Hold */}
      <Card className="p-3.5 bg-white border border-[var(--border)] shadow-xs hover:border-amber-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">On Hold</span>
          <PauseCircle className="h-4 w-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold text-amber-600 font-mono">
          {stats.onHold}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Parts/access</p>
      </Card>

      {/* Resolved */}
      <Card className="p-3.5 bg-white border border-[var(--border)] shadow-xs hover:border-emerald-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Resolved</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-bold text-emerald-600 font-mono">
          {stats.resolved}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Ready to close</p>
      </Card>

      {/* Urgent */}
      <Card className="p-3.5 bg-white border border-[var(--border)] shadow-xs hover:border-rose-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Urgent</span>
          <Flame className="h-4 w-4 text-rose-500" />
        </div>
        <div className="text-2xl font-bold text-rose-600 font-mono">
          {stats.urgent}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">High priority</p>
      </Card>

      {/* Overdue */}
      <Card className="p-3.5 bg-white border border-[var(--border)] shadow-xs hover:border-red-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Overdue</span>
          <ClockAlert className="h-4 w-4 text-red-500" />
        </div>
        <div className="text-2xl font-bold text-red-600 font-mono">
          {stats.overdue}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Past schedule</p>
      </Card>

      {/* Out of Order Rooms */}
      <Card className="p-3.5 bg-white border border-[var(--border)] shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Out of Order</span>
          <ShieldAlert className="h-4 w-4 text-slate-500" />
        </div>
        <div className="text-2xl font-bold text-slate-700 font-mono">
          {stats.outOfOrderRooms}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Rooms blocked</p>
      </Card>
    </div>
  );
}
