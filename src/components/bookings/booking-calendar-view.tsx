"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface CalendarBookingItem {
  id: string;
  confirmationNumber: string;
  status: string;
  guestName: string;
  roomId: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
}

interface RoomItem {
  id: string;
  room_number: string;
  room_name: string | null;
  room_type?: { name: string; code: string };
}

interface BookingCalendarViewProps {
  rooms: RoomItem[];
  bookings: CalendarBookingItem[];
  startDate: Date;
  daysToShow?: number;
  onDateChange: (newDate: Date) => void;
  loading?: boolean;
}

export function BookingCalendarView({
  rooms,
  bookings,
  startDate,
  daysToShow = 14,
  onDateChange,
  loading,
}: BookingCalendarViewProps) {
  // Generate date columns
  const dateColumns: { date: Date; dateStr: string; label: string; dayName: string; isToday: boolean }[] = [];
  const todayStr = new Date().toISOString().split("T")[0];

  for (let i = 0; i < daysToShow; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    const isToday = dateStr === todayStr;
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dateColumns.push({ date: d, dateStr, label, dayName, isToday });
  }

  const handlePrev = () => {
    onDateChange(new Date(startDate.getTime() - 7 * 86400000));
  };

  const handleNext = () => {
    onDateChange(new Date(startDate.getTime() + 7 * 86400000));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="space-y-3">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-[var(--radius-lg)] border border-[var(--border)] shadow-xs">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-[var(--primary)]" />
          <span className="font-semibold text-sm text-[var(--foreground)]">
            Tape Chart ({dateColumns[0]?.label} – {dateColumns[dateColumns.length - 1]?.label})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs h-8">
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              className="h-8 w-8 p-0"
              title="Previous 7 Days"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="h-8 w-8 p-0"
              title="Next 7 Days"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tape Chart Grid */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)]">
                <th className="p-3 w-40 text-left font-semibold text-[var(--foreground)] sticky left-0 bg-[var(--surface-elevated)] z-10 border-r border-[var(--border)]">
                  Room
                </th>
                {dateColumns.map((col) => (
                  <th
                    key={col.dateStr}
                    className={`p-2 text-center font-medium border-r border-[var(--border)] min-w-[70px] ${
                      col.isToday ? "bg-amber-50/70 text-amber-900 font-bold" : "text-[var(--foreground-muted)]"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider">{col.dayName}</div>
                    <div className="text-xs">{col.label.split(" ")[1]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={dateColumns.length + 1} className="p-8 text-center text-slate-500 animate-pulse">
                    Loading reservation timeline...
                  </td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={dateColumns.length + 1} className="p-8 text-center text-slate-500">
                    No physical rooms configured yet. Add rooms in Room Management.
                  </td>
                </tr>
              ) : (
                rooms.map((room) => {
                  const roomBookings = bookings.filter((b) => b.roomId === room.id);

                  return (
                    <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Room Label Column */}
                      <td className="p-3 sticky left-0 bg-white z-10 border-r border-[var(--border)] font-medium text-[var(--foreground)]">
                        <div className="flex items-center gap-1.5 font-bold">
                          Room {room.room_number}
                        </div>
                        <div className="text-[10px] text-[var(--foreground-muted)] truncate max-w-[130px]">
                          {room.room_type?.code || "STD"} {room.room_name ? `• ${room.room_name}` : ""}
                        </div>
                      </td>

                      {/* Date Cells */}
                      {dateColumns.map((col) => {
                        // Find booking that covers this night: checkIn <= col.dateStr AND checkOut > col.dateStr
                        const booking = roomBookings.find(
                          (b) => b.checkInDate <= col.dateStr && b.checkOutDate > col.dateStr
                        );

                        const isCheckInDay = booking && booking.checkInDate === col.dateStr;

                        return (
                          <td
                            key={col.dateStr}
                            className={`p-1 border-r border-[var(--border)] h-12 text-center align-middle relative ${
                              col.isToday ? "bg-amber-50/20" : ""
                            }`}
                          >
                            {booking ? (
                              <Link
                                href={`/bookings/${booking.id}`}
                                title={`${booking.confirmationNumber} • ${booking.guestName} (${booking.checkInDate} to ${booking.checkOutDate})`}
                                className={`block w-full py-1.5 px-1 rounded text-[11px] font-semibold truncate transition-transform hover:scale-[1.02] shadow-2xs ${
                                  booking.status === "CONFIRMED"
                                    ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                                    : booking.status === "PENDING"
                                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {isCheckInDay ? (
                                  <span className="truncate">
                                    ▶ {booking.confirmationNumber}
                                  </span>
                                ) : (
                                  <span className="truncate opacity-80">
                                    {booking.guestName.split(" ")[0]}
                                  </span>
                                )}
                              </Link>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
