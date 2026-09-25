"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ArrivalItem, DepartureItem } from "@/lib/dashboard/types";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import {
  CalendarCheck,
  CalendarX,
  ArrowUpRight,
  Clock,
  BedDouble,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TodayArrivalsDeparturesProps {
  arrivals: ArrivalItem[];
  departures: DepartureItem[];
  loading?: boolean;
}

export function TodayArrivalsDepartures({
  arrivals,
  departures,
  loading,
}: TodayArrivalsDeparturesProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("arrivals");

  if (loading) {
    return (
      <div className="stayhub-card p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  const tabItems = [
    {
      key: "arrivals",
      label: "Arrivals",
      icon: <CalendarCheck className="h-4 w-4" />,
      count: arrivals.length,
    },
    {
      key: "departures",
      label: "Departures",
      icon: <CalendarX className="h-4 w-4" />,
      count: departures.length,
    },
  ];

  return (
    <div className="stayhub-card p-5">
      {/* Card Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <Tabs
          tabs={tabItems}
          activeKey={activeTab}
          onChange={setActiveTab}
          variant="pill"
          size="sm"
        />

        <Link
          href="/bookings"
          className="text-[12px] font-medium text-[var(--primary)] hover:underline flex items-center gap-1 self-end sm:self-auto"
        >
          All Bookings <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ARRIVALS CONTENT */}
      {activeTab === "arrivals" && (
        <div className="mt-0">
          {arrivals.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<CalendarCheck className="h-8 w-8 text-[var(--foreground-subtle)]" />}
              title="No arrivals scheduled for today"
              description="Confirmed bookings scheduled to arrive today will appear here for front-desk check-in."
              action={{
                label: "Create Booking",
                onClick: () => {
                  router.push("/bookings/new");
                },
              }}
              className="py-8 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]"
            />
          ) : (
            <div className="space-y-2.5">
              {arrivals.map((arrival) => (
                <div
                  key={arrival.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30 transition-all gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-semibold text-xs shrink-0">
                      {arrival.guestName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13.5px] text-[var(--foreground)]">
                          {arrival.guestName}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--foreground-subtle)]">
                          {arrival.bookingReference}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-[var(--foreground-muted)] mt-0.5">
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-3 w-3" />
                          {arrival.roomNumber ? `Room ${arrival.roomNumber}` : "Room Unassigned"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ETA {arrival.arrivalTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <StatusBadge
                      status={arrival.status === "confirmed" ? "confirmed" : "pending"}
                    />
                    <Link href={`/front-desk?action=checkin&id=${arrival.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Check In
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DEPARTURES CONTENT */}
      {activeTab === "departures" && (
        <div className="mt-0">
          {departures.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<CalendarX className="h-8 w-8 text-[var(--foreground-subtle)]" />}
              title="No departures scheduled for today"
              description="In-house guests scheduled to depart today will appear here for check-out and folio settlement."
              className="py-8 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]"
            />
          ) : (
            <div className="space-y-2.5">
              {departures.map((departure) => (
                <div
                  key={departure.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--warning)]/30 transition-all gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[var(--warning-light)] text-[var(--warning)] flex items-center justify-center font-semibold text-xs shrink-0">
                      {departure.guestName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13.5px] text-[var(--foreground)]">
                          {departure.guestName}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--foreground-subtle)]">
                          {departure.bookingReference}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-[var(--foreground-muted)] mt-0.5">
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-3 w-3" />
                          Room {departure.roomNumber || "---"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Depart {departure.departureTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <StatusBadge status="pending" />
                    <Link href={`/front-desk?action=checkout&id=${departure.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Check Out
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
