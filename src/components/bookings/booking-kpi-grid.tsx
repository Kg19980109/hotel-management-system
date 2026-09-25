"use client";

import * as React from "react";
import { BookingKPIStats } from "@/lib/bookings/types";
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
  const cards = [
    {
      label: "Today's Expected Arrivals",
      value: stats.todayArrivals,
      icon: LogIn,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      description: "Scheduled to check in today",
    },
    {
      label: "Today's Expected Departures",
      value: stats.todayDepartures,
      icon: LogOut,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      description: "Scheduled to check out today",
    },
    {
      label: "Confirmed Reservations",
      value: stats.confirmed,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      description: "Active confirmed commitments",
    },
    {
      label: "Pending Inquiries",
      value: stats.pending,
      icon: Clock,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
      description: "Awaiting confirmation",
    },
    {
      label: "Active In-House Stays",
      value: stats.activeStays,
      icon: BedDouble,
      color: "text-violet-600 bg-violet-50 border-violet-100",
      description: "Reserved for tonight",
    },
    {
      label: "Cancelled Bookings",
      value: stats.cancelled,
      icon: XCircle,
      color: "text-rose-600 bg-rose-50 border-rose-100",
      description: "Released inventory",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-medium text-[var(--foreground-muted)] line-clamp-1">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-[var(--radius-md)] border ${card.color} shrink-0`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>

            <div>
              {loading ? (
                <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-[var(--radius-sm)] mb-1" />
              ) : (
                <div className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  {card.value}
                </div>
              )}
              <span className="text-[11px] text-[var(--foreground-subtle)] line-clamp-1">
                {card.description}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
