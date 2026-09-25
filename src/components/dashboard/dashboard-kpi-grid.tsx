"use client";

import * as React from "react";
import type { DashboardMetrics } from "@/lib/dashboard/types";
import { formatCurrency, formatPercentage } from "@/lib/dashboard/formatters";
import {
  BedDouble,
  DoorOpen,
  CalendarCheck,
  CalendarX,
  Users,
  TrendingUp,
} from "lucide-react";
import { KPIWidget } from "@/components/hotel/hotel-cards";

interface DashboardKpiGridProps {
  metrics: DashboardMetrics | null;
  loading?: boolean;
}

export function DashboardKpiGrid({ metrics, loading }: DashboardKpiGridProps) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <KPIWidget key={i} title="Loading..." value="---" loading={true} />
        ))}
      </div>
    );
  }

  const isInventoryConfigured = metrics.roomStatus === "configured" && metrics.totalRooms > 0;
  const currency = metrics.revenueCurrency || "INR";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. Occupancy */}
      <KPIWidget
        title="Occupancy"
        value={formatPercentage(metrics.occupancyRate)}
        icon={<BedDouble className="h-5 w-5" />}
        trendLabel={
          isInventoryConfigured
            ? `${metrics.totalRooms - metrics.availableRooms} of ${metrics.totalRooms} rooms occupied`
            : "No inventory configured yet"
        }
        color="primary"
      />

      {/* 2. Available Rooms */}
      <KPIWidget
        title="Available Rooms"
        value={metrics.availableRooms.toString()}
        icon={<DoorOpen className="h-5 w-5" />}
        trendLabel={
          isInventoryConfigured
            ? `${metrics.availableRooms} rooms vacant & clean`
            : "Setup rooms to track inventory"
        }
        color="info"
      />

      {/* 3. Arrivals Today */}
      <KPIWidget
        title="Today's Arrivals"
        value={metrics.arrivalsToday.toString()}
        icon={<CalendarCheck className="h-5 w-5" />}
        trendLabel={
          metrics.arrivalsPending > 0
            ? `${metrics.arrivalsPending} pending check-in`
            : "No check-ins scheduled"
        }
        color="success"
      />

      {/* 4. Departures Today */}
      <KPIWidget
        title="Today's Departures"
        value={metrics.departuresToday.toString()}
        icon={<CalendarX className="h-5 w-5" />}
        trendLabel={
          metrics.departuresPending > 0
            ? `${metrics.departuresPending} pending check-out`
            : "No check-outs scheduled"
        }
        color="warning"
      />

      {/* 5. In-House Guests */}
      <KPIWidget
        title="In-House Guests"
        value={metrics.inHouseGuests.toString()}
        icon={<Users className="h-5 w-5" />}
        trendLabel="Active registered guests"
        color="accent"
      />

      {/* 6. Today's Revenue */}
      <KPIWidget
        title="Today's Revenue"
        value={formatCurrency(metrics.todayRevenue, currency)}
        icon={<TrendingUp className="h-5 w-5" />}
        trendLabel="Billing module not yet enabled"
        color="success"
      />
    </div>
  );
}
