"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ArrivalItem, DepartureItem } from "@/lib/dashboard/types";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { CalendarCheck, CalendarX, ArrowUpRight, Clock, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          <div className="h-8 w-48 bg-[var(--secondary)] rounded-[var(--radius-md)]" />
          <div className="h-36 bg-[var(--secondary)] rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }

  const tabItems = [
    {
      key: "arrivals",
      label: "Arrivals",
      icon: <CalendarCheck className="h-3.5 w-3.5" />,
      count: arrivals.length,
    },
    {
      key: "departures",
      label: "Departures",
      icon: <CalendarX className="h-3.5 w-3.5" />,
      count: departures.length,
    },
  ];

  return (
    <div className="stayhub-card p-5">
      {/* Card Header */}
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
          className="flex items-center gap-1 text-[11.5px] font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors self-end sm:self-auto"
        >
          All Bookings
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ARRIVALS */}
      {activeTab === "arrivals" && (
        <div>
          {arrivals.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<CalendarCheck className="h-8 w-8 text-[var(--foreground-subtle)]" />}
              title="No arrivals scheduled for today"
              description="Confirmed bookings scheduled to arrive today will appear here for front-desk check-in."
              action={{
                label: "Create Booking",
                onClick: () => router.push("/bookings/new"),
              }}
              className="py-8 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
            />
          ) : (
            <div className="space-y-2">
              {arrivals.map((arrival) => (
                <div
                  key={arrival.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/25 hover:bg-[var(--primary-subtle)]/30 transition-all gap-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar initials */}
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-[11.5px] shrink-0 text-white"
                      style={{ background: "var(--primary)" }}
                    >
                      {arrival.guestName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[13.5px] text-[var(--foreground)]">
                          {arrival.guestName}
                        </span>
                        <span className="text-[10.5px] font-mono text-[var(--foreground-subtle)] bg-[var(--secondary)] px-1.5 py-0.5 rounded-[var(--radius-xs)]">
                          {arrival.bookingReference}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11.5px] text-[var(--foreground-muted)] mt-0.5">
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-3 w-3" />
                          {arrival.roomNumber ? `Room ${arrival.roomNumber}` : "Unassigned"}
                        </span>
                        <span className="text-[var(--border-strong)]">·</span>
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
                      size="sm"
                    />
                    <Link href={`/front-desk?action=checkin&id=${arrival.id}`}>
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 text-[11.5px] font-semibold"
                      >
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

      {/* DEPARTURES */}
      {activeTab === "departures" && (
        <div>
          {departures.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<CalendarX className="h-8 w-8 text-[var(--foreground-subtle)]" />}
              title="No departures scheduled for today"
              description="In-house guests scheduled to depart today will appear here for check-out and folio settlement."
              className="py-8 border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]"
            />
          ) : (
            <div className="space-y-2">
              {departures.map((departure) => (
                <div
                  key={departure.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--warning)]/25 hover:bg-[var(--warning-light)]/20 transition-all gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-[11.5px] shrink-0"
                      style={{ background: "var(--warning-light)", color: "var(--warning)" }}
                    >
                      {departure.guestName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[13.5px] text-[var(--foreground)]">
                          {departure.guestName}
                        </span>
                        <span className="text-[10.5px] font-mono text-[var(--foreground-subtle)] bg-[var(--secondary)] px-1.5 py-0.5 rounded-[var(--radius-xs)]">
                          {departure.bookingReference}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11.5px] text-[var(--foreground-muted)] mt-0.5">
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-3 w-3" />
                          Room {departure.roomNumber || "---"}
                        </span>
                        <span className="text-[var(--border-strong)]">·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Depart {departure.departureTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <StatusBadge status="pending" size="sm" />
                    <Link href={`/front-desk?action=checkout&id=${departure.id}`}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-[11.5px] font-semibold"
                      >
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
