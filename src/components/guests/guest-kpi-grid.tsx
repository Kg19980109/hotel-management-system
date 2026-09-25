"use client";

import * as React from "react";
import { KPIWidget } from "@/components/hotel/hotel-cards";
import { GuestKPIStats } from "@/lib/guests/types";
import { Users, UserCheck, Sparkles, Home, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface GuestKPIGridProps {
  stats: GuestKPIStats;
}

export function GuestKPIGrid({ stats }: GuestKPIGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      <KPIWidget
        title="Total Guests"
        value={stats.totalGuests}
        trendLabel="Registered guest database"
        icon={<Users className="h-4 w-4" />}
        color="primary"
      />

      <KPIWidget
        title="Active Guests"
        value={stats.activeGuests}
        trendLabel="Operational status active"
        icon={<UserCheck className="h-4 w-4" />}
        color="success"
      />

      <KPIWidget
        title="Returning Guests"
        value={stats.returningGuests}
        trendLabel="Repeat hotel visitors"
        icon={<Sparkles className="h-4 w-4" />}
        color="accent"
      />

      <KPIWidget
        title="Currently In-House"
        value={stats.currentlyInHouse}
        trendLabel="Checked-in stay guests"
        icon={<Home className="h-4 w-4" />}
        color="info"
      />

      <KPIWidget
        title="Arriving Today"
        value={stats.arrivingToday}
        trendLabel="Expected arrivals today"
        icon={<ArrowDownLeft className="h-4 w-4" />}
        color="warning"
      />

      <KPIWidget
        title="Departing Today"
        value={stats.departingToday}
        trendLabel="Expected departures today"
        icon={<ArrowUpRight className="h-4 w-4" />}
        color="danger"
      />
    </div>
  );
}
