"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import type { FrontDeskKPIStats } from "@/lib/front-desk/types";
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
      {/* Arrivals */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-indigo-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Arrivals</span>
          <LogIn className="h-4 w-4 text-indigo-500" />
        </div>
        <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
          {stats.todayArrivals}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Scheduled today</p>
      </Card>

      {/* Departures */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-amber-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Departures</span>
          <LogOut className="h-4 w-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
          {stats.todayDepartures}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Expected checkout</p>
      </Card>

      {/* In-House */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-emerald-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">In-House</span>
          <Users className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
          {stats.inHouseGuests}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Guests on premises</p>
      </Card>

      {/* Occupied Rooms */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-purple-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Occupied</span>
          <BedDouble className="h-4 w-4 text-purple-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
            {stats.occupiedRooms}
          </div>
          <span className="text-xs font-semibold text-purple-600">
            {stats.occupancyRate}%
          </span>
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Of {stats.totalRooms} rooms</p>
      </Card>

      {/* Available Rooms */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-teal-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Available</span>
          <CheckCircle className="h-4 w-4 text-teal-500" />
        </div>
        <div className="text-2xl font-bold text-[var(--foreground)] font-mono">
          {stats.availableRooms}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Ready for booking</p>
      </Card>

      {/* Attention Required */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-rose-300 transition-colors">
        <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Attention</span>
          <AlertTriangle className="h-4 w-4 text-rose-500" />
        </div>
        <div className="text-2xl font-bold text-rose-600 font-mono">
          {stats.attentionRooms}
        </div>
        <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">Dirty / Out of Order</p>
      </Card>
    </div>
  );
}
