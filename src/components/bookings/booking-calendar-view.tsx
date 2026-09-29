"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  BedDouble,
  Search,
  Plus,
  Layers,
  Sparkles,
  Users,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BookingCalendarView({
  rooms,
  bookings,
  startDate,
  daysToShow = 14,
  onDateChange,
  loading,
}: BookingCalendarViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRoomType, setSelectedRoomType] = React.useState<string>("ALL");

  // Generate date columns
  const dateColumns: {
    date: Date;
    dateStr: string;
    label: string;
    dayName: string;
    dayNum: number;
    isWeekend: boolean;
    isToday: boolean;
  }[] = [];
  const todayStr = formatLocalDate(new Date());

  for (let i = 0; i < daysToShow; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const dateStr = formatLocalDate(d);
    const isToday = dateStr === todayStr;
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayNum = d.getDate();
    dateColumns.push({ date: d, dateStr, label, dayName, dayNum, isWeekend, isToday });
  }

  const handlePrev = () => {
    onDateChange(new Date(startDate.getTime() - 7 * 86400000));
  };

  const handleNext = () => {
    onDateChange(new Date(startDate.getTime() + 7 * 86400000));
  };

  const handleToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    onDateChange(d);
  };

  // Filter rooms
  const roomTypes = React.useMemo(() => {
    const types = new Set<string>();
    rooms.forEach((r) => {
      if (r.room_type?.code) types.add(r.room_type.code);
    });
    return Array.from(types);
  }, [rooms]);

  const filteredRooms = React.useMemo(() => {
    return rooms.filter((r) => {
      if (selectedRoomType !== "ALL" && r.room_type?.code !== selectedRoomType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = r.room_number?.toLowerCase().includes(q);
        const nameMatch = r.room_name?.toLowerCase().includes(q);
        const typeMatch = r.room_type?.name.toLowerCase().includes(q);
        if (!numMatch && !nameMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [rooms, searchQuery, selectedRoomType]);

  return (
    <div className="space-y-4">
      {/* ── COMMAND BAR ── */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-black text-white shadow-md">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  Tape Chart Timeline
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-indigo-300 border border-indigo-400/30">
                  {dateColumns[0]?.label} – {dateColumns[dateColumns.length - 1]?.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Visual matrix of room assignments, stay lengths, and live bookings
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-slate-400 h-8 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            {/* Room Type */}
            {roomTypes.length > 0 && (
              <select
                value={selectedRoomType}
                onChange={(e) => setSelectedRoomType(e.target.value)}
                className="h-8 px-2.5 rounded-xl text-xs font-bold bg-slate-800 border border-white/15 text-white focus:outline-none"
              >
                <option value="ALL">All Room Types</option>
                {roomTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            {/* Nav buttons */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="h-7 w-7 p-0 text-slate-300 hover:text-white rounded-lg"
                title="Previous 7 Days"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-7 px-2.5 text-xs font-black text-amber-400 hover:text-amber-300 rounded-lg"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="h-7 w-7 p-0 text-slate-300 hover:text-white rounded-lg"
                title="Next 7 Days"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAPE CHART GRID ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-md">
        <div className="overflow-x-auto max-h-[680px]">
          <table className="w-full border-collapse text-xs min-w-[950px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/90 sticky top-0 z-20">
                <th className="p-3 w-48 text-left font-black text-slate-900 dark:text-white sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 border-r border-slate-200 dark:border-slate-700 shadow-sm">
                  Room &amp; Category
                </th>
                {dateColumns.map((col) => (
                  <th
                    key={col.dateStr}
                    className={cn(
                      "p-2 text-center border-r border-slate-200 dark:border-slate-800 min-w-[68px] transition-colors",
                      col.isToday
                        ? "bg-amber-500/15 text-amber-900 dark:text-amber-300 font-black ring-1 ring-amber-500/40"
                        : col.isWeekend
                        ? "bg-slate-200/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold"
                        : "text-slate-600 dark:text-slate-400 font-semibold"
                    )}
                  >
                    <div className="text-[9.5px] uppercase tracking-wider font-extrabold">{col.dayName}</div>
                    <div className="text-xs font-black">{col.dayNum}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {loading ? (
                <tr>
                  <td colSpan={dateColumns.length + 1} className="p-12 text-center text-slate-500 animate-pulse">
                    Loading reservation timeline...
                  </td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={dateColumns.length + 1} className="p-12 text-center text-slate-500">
                    No matching rooms found.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => {
                  const roomBookings = bookings.filter((b) => b.roomId === room.id);

                  return (
                    <tr key={room.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Room Column */}
                      <td className="p-2.5 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-slate-900 dark:text-white">
                            Room {room.room_number}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {room.room_type?.code || "STD"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[160px] mt-0.5">
                          {room.room_name || room.room_type?.name || "Standard Unit"}
                        </div>
                      </td>

                      {/* Date Cells */}
                      {dateColumns.map((col) => {
                        const booking = roomBookings.find(
                          (b) => b.checkInDate <= col.dateStr && b.checkOutDate > col.dateStr
                        );

                        const isCheckInDay = booking && booking.checkInDate === col.dateStr;

                        return (
                          <td
                            key={col.dateStr}
                            className={cn(
                              "p-1 border-r border-slate-100 dark:border-slate-800/60 h-11 text-center align-middle relative group/cell",
                              col.isToday && "bg-amber-500/[0.04]",
                              col.isWeekend && "bg-slate-50/40 dark:bg-slate-900/40"
                            )}
                          >
                            {booking ? (
                              <Link
                                href={`/bookings/${booking.id}`}
                                title={`${booking.confirmationNumber} • ${booking.guestName} (${booking.checkInDate} to ${booking.checkOutDate})`}
                                className={cn(
                                  "block w-full py-1 px-1 rounded-md text-[10px] font-black truncate transition-all hover:scale-[1.03] shadow-xs",
                                  booking.status === "CONFIRMED"
                                    ? "bg-indigo-600 text-white shadow-indigo-500/20"
                                    : booking.status === "PENDING"
                                    ? "bg-amber-500 text-slate-950 shadow-amber-500/20 font-black"
                                    : "bg-slate-700 text-white"
                                )}
                              >
                                {isCheckInDay ? (
                                  <span className="truncate flex items-center justify-center gap-0.5">
                                    <span>▶</span> {booking.guestName?.split(" ")[0] || "Guest"}
                                  </span>
                                ) : (
                                  <span className="truncate opacity-90">
                                    {booking.guestName?.split(" ")[0] || "Stay"}
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <Link
                                href={`/bookings/new?roomId=${room.id}&checkIn=${col.dateStr}`}
                                className="hidden group-hover/cell:flex items-center justify-center text-[9px] font-extrabold text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 py-1 rounded transition"
                                title={`Book Room ${room.room_number} on ${col.label}`}
                              >
                                + Book
                              </Link>
                            )}
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
