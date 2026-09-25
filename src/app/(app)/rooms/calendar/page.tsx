"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { fetchRooms } from "@/lib/rooms/queries";
import { fetchCalendarBookings } from "@/lib/bookings/queries";
import type { Room } from "@/lib/rooms/types";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BedDouble,
  Calendar as CalendarIcon,
} from "lucide-react";

export default function RoomCalendarPage() {
  const router = useRouter();
  const { currentProperty } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [calendarBookings, setCalendarBookings] = React.useState<
    {
      id: string;
      confirmationNumber: string;
      status: string;
      guestName: string;
      roomId: string;
      roomNumber: string;
      checkInDate: string;
      checkOutDate: string;
    }[]
  >([]);

  const [loading, setLoading] = React.useState(true);
  const [daysCount] = React.useState(14);
  const [startDate, setStartDate] = React.useState<Date>(() => new Date());

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) return;
    setLoading(true);

    const startStr = startDate.toISOString().split("T")[0];
    const end = new Date(startDate.getTime() + (daysCount + 1) * 86400000);
    const endStr = end.toISOString().split("T")[0];

    try {
      const [roomsData, bookingsData] = await Promise.all([
        fetchRooms(supabase, activePropertyId, { pageSize: 100, isActive: true }),
        fetchCalendarBookings(supabase, activePropertyId, startStr, endStr),
      ]);
      setRooms(roomsData.rooms);
      setCalendarBookings(bookingsData);
    } catch (err) {
      console.error("Error loading room calendar data:", err);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, startDate, daysCount, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (activePropertyId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadData();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [activePropertyId, loadData]);

  // Generate date columns
  const dateColumns = React.useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [startDate, daysCount]);

  const handlePrev = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setStartDate(d);
  };

  const handleNext = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setStartDate(d);
  };

  const handleToday = () => {
    setStartDate(new Date());
  };

  if (loading && rooms.length === 0) {
    return <LoadingState message="Loading availability calendar matrix..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Room Availability Matrix"
        description="Daily operational room grid and live reservation schedule."
        breadcrumbs={[
          { label: "Operations", href: "/rooms" },
          { label: "Rooms", href: "/rooms" },
          { label: "Calendar" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/rooms">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Table View
              </Button>
            </Link>
            <Link href="/bookings/calendar">
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-1.5" />
                Tape Chart
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <div className="flex items-center gap-1 border border-[var(--border)] rounded-[var(--radius-md)] p-0.5 bg-[var(--surface-elevated)]">
              <Button size="sm" variant="ghost" onClick={handlePrev} className="h-7 w-7 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleNext} className="h-7 w-7 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
      />

      {/* Legend Bar */}
      <div className="flex items-center gap-4 p-3 bg-white border border-[var(--border)] rounded-[var(--radius-lg)] text-xs text-[var(--foreground-muted)] shadow-xs">
        <span className="font-semibold text-[var(--foreground)]">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-100 border border-emerald-300" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-indigo-100 border border-indigo-300" />
          <span>Booked (Confirmed)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-100 border border-amber-300" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-slate-300 border border-slate-400" />
          <span>Out of Order</span>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="stayhub-card p-10">
          <EmptyState
            icon={<BedDouble className="h-10 w-10 text-[var(--foreground-subtle)]" />}
            title="No room inventory to display"
            description="Add physical rooms to populate your property's tape chart and calendar matrix."
            action={{
              label: "Add Room",
              onClick: () => router.push("/rooms/new"),
            }}
          />
        </div>
      ) : (
        <div className="stayhub-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)]">
                  <th className="py-3 px-3 w-44 sticky left-0 bg-[var(--surface-elevated)] z-10 border-r border-[var(--border)] font-semibold text-[var(--foreground)]">
                    Room / Type
                  </th>
                  {dateColumns.map((date, idx) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNum = date.getDate();
                    const monthName = date.toLocaleDateString("en-US", { month: "short" });

                    return (
                      <th
                        key={idx}
                        className={`py-2 px-2 text-center min-w-[70px] border-r border-[var(--border)] last:border-r-0 ${
                          isToday ? "bg-indigo-50 font-bold text-[var(--primary)]" : "text-[var(--foreground-muted)]"
                        }`}
                      >
                        <div className="text-[10px] uppercase">{dayName}</div>
                        <div className="text-sm font-bold text-[var(--foreground)]">{dayNum}</div>
                        <div className="text-[9px] text-[var(--foreground-subtle)]">{monthName}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rooms.map((room) => {
                  const typeCode = room.room_type?.code || "STD";
                  const roomBookings = calendarBookings.filter((b) => b.roomId === room.id);

                  return (
                    <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                      {/* Fixed Room Col */}
                      <td className="py-2.5 px-3 sticky left-0 bg-white z-10 border-r border-[var(--border)] font-medium">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-[13px] text-[var(--foreground)]">
                            {room.room_number}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]">
                            {typeCode}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--foreground-muted)] truncate block">
                          {room.room_type?.name || "Standard"}
                        </span>
                      </td>

                      {/* Date Cells */}
                      {dateColumns.map((date, dIdx) => {
                        const dateStr = date.toISOString().split("T")[0];
                        const isOutOfOrder =
                          room.status === "OUT_OF_ORDER" || room.status === "OUT_OF_SERVICE";

                        // Check if booked on this night
                        const booking = roomBookings.find(
                          (b) => b.checkInDate <= dateStr && b.checkOutDate > dateStr
                        );

                        return (
                          <td
                            key={dIdx}
                            className="p-1 text-center border-r border-[var(--border)] last:border-r-0 h-11"
                          >
                            {isOutOfOrder ? (
                              <div
                                className="h-full w-full rounded bg-slate-200/80 border border-slate-300 flex items-center justify-center text-[10px] text-slate-600 font-medium"
                                title="Room Out of Order"
                              >
                                OOO
                              </div>
                            ) : booking ? (
                              <Link
                                href={`/bookings/${booking.id}`}
                                title={`Booked: ${booking.confirmationNumber} (${booking.guestName})`}
                                className={`h-full w-full rounded flex items-center justify-center text-[10px] font-semibold truncate px-1 transition-transform hover:scale-[1.03] ${
                                  booking.status === "CONFIRMED"
                                    ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                                    : "bg-amber-100 text-amber-900 border border-amber-200"
                                }`}
                              >
                                {booking.confirmationNumber.split("-").slice(-1)[0]}
                              </Link>
                            ) : (
                              <div
                                className="h-full w-full rounded bg-emerald-50/60 border border-emerald-100 flex items-center justify-center text-[10px] text-emerald-700 font-medium hover:bg-emerald-100/70 transition-colors"
                                title="Available for reservation"
                              >
                                Avail
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
