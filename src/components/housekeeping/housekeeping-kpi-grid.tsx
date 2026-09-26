"use client";

import * as React from "react";
import type { HousekeepingKPIs } from "@/lib/housekeeping/types";
import { KPIWidget } from "@/components/hotel/hotel-cards";
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* Dirty Rooms */}
      <KPIWidget
        title="Dirty Rooms"
        value={stats.dirtyRooms}
        icon={<AlertTriangle className="h-4 w-4" />}
        color="danger"
        trendLabel="Awaiting cleaning"
        loading={loading}
      />

      {/* Cleaning in progress */}
      <KPIWidget
        title="Cleaning"
        value={stats.cleaningInProgress}
        icon={<Sparkles className="h-4 w-4" />}
        color="primary"
        trendLabel="In progress now"
        loading={loading}
      />

      {/* Inspection Pending */}
      <KPIWidget
        title="Inspection"
        value={stats.inspectionPending}
        icon={<Clock className="h-4 w-4" />}
        color="warning"
        trendLabel="Ready for review"
        loading={loading}
      />

      {/* Ready / Clean */}
      <KPIWidget
        title="Ready / Clean"
        value={stats.readyClean}
        icon={<CheckCircle2 className="h-4 w-4" />}
        color="success"
        trendLabel="Available for check-in"
        loading={loading}
      />

      {/* Priority Tasks */}
      <KPIWidget
        title="Priority"
        value={stats.priorityTasks}
        icon={<Flame className="h-4 w-4" />}
        color="accent"
        trendLabel="High / Urgent queue"
        loading={loading}
      />

      {/* Out of Order / Service */}
      <KPIWidget
        title="Out of Service"
        value={stats.outOfServiceOrOrder}
        icon={<ShieldAlert className="h-4 w-4" />}
        color="info"
        trendLabel="Maintenance / Blocked"
        loading={loading}
      />
    </div>
  );
}
