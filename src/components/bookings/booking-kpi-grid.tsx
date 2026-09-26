"use client";

import * as React from "react";
import type { BookingKPIStats } from "@/lib/bookings/types";
import { KPIWidget } from "@/components/hotel/hotel-cards";
import {
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  XCircle,
  BedDouble,
} from "lucide-react";

interface BookingKPIGridProps {
  stats: BookingKPIStats;
  loading?: boolean;
}

export function BookingKPIGrid({ stats, loading }: BookingKPIGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <KPIWidget key={idx} title="Loading..." value="---" loading={true} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Today's Arrivals */}
      <KPIWidget
        title="Today's Arrivals"
        value={stats.todayArrivals.toString()}
        icon={<LogIn className="h-4 w-4" />}
        trendLabel="Scheduled check-ins"
        color="info"
      />

      {/* 2. Today's Departures */}
      <KPIWidget
        title="Today's Departures"
        value={stats.todayDepartures.toString()}
        icon={<LogOut className="h-4 w-4" />}
        trendLabel="Scheduled check-outs"
        color="warning"
      />

      {/* 3. Confirmed Reservations */}
      <KPIWidget
        title="Confirmed"
        value={stats.confirmed.toString()}
        icon={<CheckCircle2 className="h-4 w-4" />}
        trendLabel="Active commitments"
        color="success"
      />

      {/* 4. Pending Inquiries */}
      <KPIWidget
        title="Pending Inquiries"
        value={stats.pending.toString()}
        icon={<Clock className="h-4 w-4" />}
        trendLabel="Awaiting confirmation"
        color="accent"
      />

      {/* 5. Active In-House Stays */}
      <KPIWidget
        title="In-House Stays"
        value={stats.activeStays.toString()}
        icon={<BedDouble className="h-4 w-4" />}
        trendLabel="Occupied tonight"
        color="primary"
      />

      {/* 6. Cancelled Bookings */}
      <KPIWidget
        title="Cancelled"
        value={stats.cancelled.toString()}
        icon={<XCircle className="h-4 w-4" />}
        trendLabel="Released inventory"
        color="danger"
      />
    </div>
  );
}
