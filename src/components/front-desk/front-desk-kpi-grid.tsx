"use client";

import * as React from "react";
import type { FrontDeskKPIStats } from "@/lib/front-desk/types";
import { KPIWidget } from "@/components/hotel/hotel-cards";
import {
  LogIn,
  LogOut,
  Users,
  BedDouble,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface FrontDeskKPIGridProps {
  stats: FrontDeskKPIStats;
  loading?: boolean;
}

export function FrontDeskKPIGrid({ stats, loading }: FrontDeskKPIGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <KPIWidget key={i} title="Loading..." value="---" loading={true} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Arrivals */}
      <KPIWidget
        title="Arrivals"
        value={stats.todayArrivals.toString()}
        icon={<LogIn className="h-4 w-4" />}
        trendLabel="Scheduled today"
        color="info"
      />

      {/* 2. Departures */}
      <KPIWidget
        title="Departures"
        value={stats.todayDepartures.toString()}
        icon={<LogOut className="h-4 w-4" />}
        trendLabel="Expected checkout"
        color="warning"
      />

      {/* 3. In-House */}
      <KPIWidget
        title="In-House Guests"
        value={stats.inHouseGuests.toString()}
        icon={<Users className="h-4 w-4" />}
        trendLabel="On premises"
        color="accent"
      />

      {/* 4. Occupied Rooms */}
      <KPIWidget
        title="Occupied Rooms"
        value={stats.occupiedRooms.toString()}
        icon={<BedDouble className="h-4 w-4" />}
        trendLabel={`${stats.occupancyRate}% of ${stats.totalRooms} rooms`}
        color="primary"
      />

      {/* 5. Available Rooms */}
      <KPIWidget
        title="Available Rooms"
        value={stats.availableRooms.toString()}
        icon={<CheckCircle className="h-4 w-4" />}
        trendLabel="Ready for check-in"
        color="success"
      />

      {/* 6. Attention Rooms */}
      <KPIWidget
        title="Room Attention"
        value={stats.attentionRooms.toString()}
        icon={<AlertTriangle className="h-4 w-4" />}
        trendLabel="Dirty or maintenance"
        color="danger"
      />
    </div>
  );
}
