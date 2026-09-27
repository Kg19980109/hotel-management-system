"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/reports/formatters";
import type { RoomBookingPerformanceSummary } from "@/lib/reports/business-types";
import {
  BedDouble,
  DoorOpen,
  CalendarCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  Users,
} from "lucide-react";

interface RoomBookingPerformanceProps {
  performance: RoomBookingPerformanceSummary;
  currency?: string;
}

export function RoomBookingPerformance({
  performance,
  currency = "INR",
}: RoomBookingPerformanceProps) {
  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-primary" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            Room & Booking Performance
          </CardTitle>
        </div>
        <Link href="/reports/occupancy">
          <span className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
            Full Occupancy Analytics <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Occupancy Rate
            </span>
            <span className="text-lg font-bold text-foreground font-mono">
              {performance.occupancyRate}%
            </span>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Average Daily Rate
            </span>
            <span className="text-lg font-bold text-foreground font-mono">
              {formatCurrency(performance.adr, currency)}
            </span>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              RevPAR
            </span>
            <span className="text-lg font-bold text-foreground font-mono">
              {formatCurrency(performance.revpar, currency)}
            </span>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Avg Length of Stay
            </span>
            <span className="text-lg font-bold text-foreground font-mono">
              {performance.alos} {performance.alos === 1 ? "night" : "nights"}
            </span>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Avg Booking Lead Time
            </span>
            <span className="text-lg font-bold text-foreground font-mono">
              {performance.leadTimeDays} days
            </span>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Sellable Rooms
            </span>
            <span className="text-lg font-bold text-foreground font-mono">
              {performance.sellableRooms}
            </span>
          </div>
        </div>

        {/* Operational Flow Sub-grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/20 p-3 rounded-xl border border-border/40">
          <div>
            <span className="text-muted-foreground block text-[11px]">Arrivals Checked In</span>
            <span className="font-bold text-foreground font-mono text-sm">
              {performance.arrivals}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Departures Checked Out</span>
            <span className="font-bold text-foreground font-mono text-sm">
              {performance.departures}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Cancellations</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-sm">
              {performance.cancellations}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">No Shows</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">
              {performance.noShows}
            </span>
          </div>
        </div>

        {/* Booking Channels */}
        {performance.bookingSources.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <span className="text-xs font-semibold text-foreground block">
              Booking Source Distribution
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {performance.bookingSources.map((s) => (
                <div
                  key={s.source}
                  className="p-2.5 bg-muted/40 rounded-lg border border-border/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-medium text-foreground block uppercase text-[11px]">
                      {s.source}
                    </span>
                    <span className="text-muted-foreground text-[10px]">{s.count} bookings</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold">{formatCurrency(s.revenue, currency)}</span>
                    <span className="text-[10px] text-muted-foreground block">({s.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
