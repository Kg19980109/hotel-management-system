"use client";

// ============================================================
// STAYHUB KDS KPI GRID (Phase 13)
// ============================================================

import * as React from "react";
import {
  Flame,
  CheckCircle2,
  AlertTriangle,
  ChefHat,
  Utensils,
  Hourglass,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { KdsKpiSummary } from "@/lib/kds/types";

interface KdsKpiGridProps {
  kpis: KdsKpiSummary;
}

export function KdsKpiGrid({ kpis }: KdsKpiGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Queued Tickets */}
      <Card className="p-3.5 border-border bg-card flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
          <Hourglass className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Queued
          </span>
          <span className="text-xl font-extrabold text-foreground">
            {kpis.queuedTickets}
          </span>
        </div>
      </Card>

      {/* In Progress Tickets */}
      <Card className="p-3.5 border-border bg-card flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
          <ChefHat className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Cooking
          </span>
          <span className="text-xl font-extrabold text-foreground">
            {kpis.inProgressTickets}
          </span>
        </div>
      </Card>

      {/* Ready for Service */}
      <Card className="p-3.5 border-border bg-card flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Ready
          </span>
          <span className="text-xl font-extrabold text-emerald-600">
            {kpis.readyTickets}
          </span>
        </div>
      </Card>

      {/* Delayed Tickets */}
      <Card className="p-3.5 border-border bg-card flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Delayed (&gt;15m)
          </span>
          <span className={`text-xl font-extrabold ${kpis.delayedTickets > 0 ? "text-rose-600" : "text-foreground"}`}>
            {kpis.delayedTickets}
          </span>
        </div>
      </Card>

      {/* Remakes / Re-fires */}
      <Card className="p-3.5 border-border bg-card flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
          <Flame className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Remakes
          </span>
          <span className="text-xl font-extrabold text-foreground">
            {kpis.remakeCount}
          </span>
        </div>
      </Card>

      {/* Completed Today */}
      <Card className="p-3.5 border-border bg-card flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-500/10 text-slate-600 flex items-center justify-center shrink-0">
          <Utensils className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Served Today
          </span>
          <span className="text-xl font-extrabold text-foreground">
            {kpis.completedTodayTickets}
          </span>
        </div>
      </Card>
    </div>
  );
}
