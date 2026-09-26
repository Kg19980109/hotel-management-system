"use client";

import * as React from "react";
import type { MaintenanceKPIs } from "@/lib/maintenance/types";
import { KPIWidget } from "@/components/hotel/hotel-cards";
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {/* Open */}
      <KPIWidget
        title="Open"
        value={stats.open}
        icon={<Wrench className="h-4 w-4" />}
        color="info"
        trendLabel="Unassigned"
        loading={loading}
      />

      {/* Assigned */}
      <KPIWidget
        title="Assigned"
        value={stats.assigned}
        icon={<UserCheck className="h-4 w-4" />}
        color="primary"
        trendLabel="Technician set"
        loading={loading}
      />

      {/* In Progress */}
      <KPIWidget
        title="In Progress"
        value={stats.inProgress}
        icon={<PlayCircle className="h-4 w-4" />}
        color="primary"
        trendLabel="Under repair"
        loading={loading}
      />

      {/* On Hold */}
      <KPIWidget
        title="On Hold"
        value={stats.onHold}
        icon={<PauseCircle className="h-4 w-4" />}
        color="warning"
        trendLabel="Parts/access"
        loading={loading}
      />

      {/* Resolved */}
      <KPIWidget
        title="Resolved"
        value={stats.resolved}
        icon={<CheckCircle2 className="h-4 w-4" />}
        color="success"
        trendLabel="Ready to close"
        loading={loading}
      />

      {/* Urgent */}
      <KPIWidget
        title="Urgent"
        value={stats.urgent}
        icon={<Flame className="h-4 w-4" />}
        color="danger"
        trendLabel="High priority"
        loading={loading}
      />

      {/* Overdue */}
      <KPIWidget
        title="Overdue"
        value={stats.overdue}
        icon={<ClockAlert className="h-4 w-4" />}
        color="danger"
        trendLabel="Past schedule"
        loading={loading}
      />

      {/* Out of Order Rooms */}
      <KPIWidget
        title="Out of Order"
        value={stats.outOfOrderRooms}
        icon={<ShieldAlert className="h-4 w-4" />}
        color="accent"
        trendLabel="Rooms blocked"
        loading={loading}
      />
    </div>
  );
}
