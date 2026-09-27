"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ArrivalItem, DepartureItem } from "@/lib/dashboard/types";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { CalendarCheck, CalendarX, ArrowUpRight, Clock, BedDouble, UserCheck, LogIn, LogOut } from "lucide-react";
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
      <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded-xl" />
          <div className="h-32 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const tabItems = [
    {
      key: "arrivals",
      label: `Today's Arrivals (${arrivals.length})`,
      icon: <CalendarCheck className="h-4 w-4" />,
    },
    {
      key: "departures",
      label: `Today's Departures (${departures.length})`,
      icon: <CalendarX className="h-4 w-4" />,
    },
  ];

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300">
      {/* Card Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 self-start">
          <button
            onClick={() => setActiveTab("arrivals")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all",
              activeTab === "arrivals"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Arrivals</span>
            <span
              className={cn(
                "px-2 py-0.2 rounded-full text-[10px] font-black",
                activeTab === "arrivals"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-200 text-slate-700"
              )}
            >
              {arrivals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("departures")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all",
              activeTab === "departures"
                ? "bg-white text-amber-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CalendarX className="w-3.5 h-3.5 text-amber-600" />
            <span>Departures</span>
            <span
              className={cn(
                "px-2 py-0.2 rounded-full text-[10px] font-black",
                activeTab === "departures"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-700"
              )}
            >
              {departures.length}
            </span>
          </button>
        </div>

        <Link
          href="/bookings"
          className="inline-flex items-center gap-1 text-[12px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-3 py-1 rounded-lg border border-indigo-200/60 transition-all self-end sm:self-auto shadow-xs"
        >
          <span>All Bookings</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ARRIVALS CONTENT */}
      {activeTab === "arrivals" && (
        <div>
          {arrivals.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<CalendarCheck className="h-8 w-8 text-slate-400" />}
              title="No arrivals scheduled for today"
              description="Confirmed bookings scheduled to arrive today will appear here for front-desk check-in."
              action={{
                label: "Create Booking",
                onClick: () => router.push("/bookings/new"),
              }}
              className="py-8 border border-dashed border-slate-200 rounded-2xl"
            />
          ) : (
            <div className="space-y-2.5">
              {arrivals.map((arrival) => (
                <div
                  key={arrival.id}
                  className="group/item flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-200 transition-all duration-200 gap-3.5 shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Luxury Avatar Initial */}
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-[12px] text-white shadow-xs shrink-0 border border-indigo-300/40">
                      {arrival.guestName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[14px] text-slate-900 leading-tight">
                          {arrival.guestName}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                          {arrival.bookingReference}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[12px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <BedDouble className="h-3.5 w-3.5 text-indigo-500" />
                          {arrival.roomNumber ? `Room ${arrival.roomNumber}` : "Unassigned"}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          ETA {arrival.arrivalTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    <StatusBadge
                      status={arrival.status === "confirmed" ? "confirmed" : "pending"}
                      size="sm"
                    />
                    <Link href={`/front-desk?action=checkin&id=${arrival.id}`}>
                      <Button
                        size="sm"
                        className="h-8.5 px-3.5 text-[12px] font-bold rounded-xl gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm shadow-indigo-900/20"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Check In</span>
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
        <div>
          {departures.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<CalendarX className="h-8 w-8 text-slate-400" />}
              title="No departures scheduled for today"
              description="In-house guests scheduled to depart today will appear here for check-out and folio settlement."
              className="py-8 border border-dashed border-slate-200 rounded-2xl"
            />
          ) : (
            <div className="space-y-2.5">
              {departures.map((departure) => (
                <div
                  key={departure.id}
                  className="group/item flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-amber-50/30 hover:border-amber-200 transition-all duration-200 gap-3.5 shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-extrabold text-[12px] text-white shadow-xs shrink-0 border border-amber-300/40">
                      {departure.guestName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[14px] text-slate-900 leading-tight">
                          {departure.guestName}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                          {departure.bookingReference}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[12px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <BedDouble className="h-3.5 w-3.5 text-amber-500" />
                          Room {departure.roomNumber || "---"}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          Depart {departure.departureTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    <StatusBadge status="pending" size="sm" />
                    <Link href={`/front-desk?action=checkout&id=${departure.id}`}>
                      <Button
                        size="sm"
                        className="h-8.5 px-3.5 text-[12px] font-bold rounded-xl gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm shadow-amber-900/20"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Check Out</span>
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
