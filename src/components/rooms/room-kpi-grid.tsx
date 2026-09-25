"use client";

import * as React from "react";
import type { RoomStats } from "@/lib/rooms/types";
import { KPIWidget } from "@/components/hotel/hotel-cards";
import {
  BedDouble,
  DoorOpen,
  Users,
  Sparkles,
  Wrench,
  AlertTriangle,
} from "lucide-react";

interface RoomKpiGridProps {
  stats: RoomStats | null;
  loading?: boolean;
}

export function RoomKpiGrid({ stats, loading }: RoomKpiGridProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <KPIWidget key={i} title="Loading..." value="---" loading={true} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Rooms */}
      <KPIWidget
        title="Total Rooms"
        value={stats.total.toString()}
        icon={<BedDouble className="h-4 w-4" />}
        trendLabel={stats.inactive > 0 ? `${stats.inactive} deactivated` : "Configured rooms"}
        color="primary"
      />

      {/* 2. Available */}
      <KPIWidget
        title="Available"
        value={stats.available.toString()}
        icon={<DoorOpen className="h-4 w-4" />}
        trendLabel="Ready for check-in"
        color="success"
      />

      {/* 3. Occupied */}
      <KPIWidget
        title="Occupied"
        value={stats.occupied.toString()}
        icon={<Users className="h-4 w-4" />}
        trendLabel="In-house stays"
        color="danger"
      />

      {/* 4. Dirty */}
      <KPIWidget
        title="Needs Cleaning"
        value={stats.dirty.toString()}
        icon={<Sparkles className="h-4 w-4" />}
        trendLabel="Pending cleaning"
        color="warning"
      />

      {/* 5. In Cleaning */}
      <KPIWidget
        title="Cleaning / Inspect"
        value={(stats.cleaning + stats.inspected).toString()}
        icon={<AlertTriangle className="h-4 w-4" />}
        trendLabel="Housekeeping active"
        color="info"
      />

      {/* 6. Out of Order */}
      <KPIWidget
        title="Out of Order"
        value={stats.outOfOrder.toString()}
        icon={<Wrench className="h-4 w-4" />}
        trendLabel="Maintenance blocked"
        color="danger"
      />
    </div>
  );
}
