"use client";

import * as React from "react";
import Link from "next/link";
import { Reservation, ReservationRoom } from "@/lib/bookings/types";
import { BookingStatusBadge, BookingSourceBadge } from "./booking-status-badge";
import { formatCurrency } from "@/lib/dashboard/formatters";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  BedDouble,
  Phone,
  Mail,
  ArrowRight,
  Eye,
  Edit2,
  RefreshCw,
  XCircle,
  ShieldCheck,
  Sparkles,
  Search,
  Filter,
  Users,
  CheckCircle2,
  CalendarDays,
  Receipt,
  Layers,
  ArrowUpRight,
  SlidersHorizontal,
  LayoutGrid,
  Columns,
  ListFilter,
  X,
  CreditCard,
  LogIn,
  LogOut,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingMonthlyCalendarProps {
  reservations: Reservation[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  currency: string;
  loading?: boolean;
  onCancelClick: (res: Reservation) => void;
  onStatusClick: (res: Reservation) => void;
  onAssignRoomClick: (res: Reservation, roomItem: ReservationRoom) => void;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type CalendarSubView = "month" | "week" | "day";

export function BookingMonthlyCalendar({
  reservations,
  currentDate,
  onDateChange,
  currency,
  loading = false,
  onCancelClick,
  onStatusClick,
  onAssignRoomClick,
}: BookingMonthlyCalendarProps) {
  const [selectedDay, setSelectedDay] = React.useState<Date>(currentDate);
  const [subView, setSubView] = React.useState<CalendarSubView>("month");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [selectedReservation, setSelectedReservation] = React.useState<Reservation | null>(null);

  // Month navigation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Generate calendar grid days
  const calendarDays: {
    date: Date;
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }[] = [];

  const todayStr = formatLocalDate(new Date());
  const selectedDayStr = formatLocalDate(selectedDay);

  // Prev month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    const dateStr = formatLocalDate(d);
    calendarDays.push({
      date: d,
      dateStr,
      dayNum: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const current = new Date(year, month, d);
    const dateStr = formatLocalDate(current);
    calendarDays.push({
      date: current,
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDayStr,
    });
  }

  // Next month padding to fill complete weeks (35 or 42 cells)
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextD = new Date(year, month + 1, d);
    const dateStr = formatLocalDate(nextD);
    calendarDays.push({
      date: nextD,
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDayStr,
    });
  }

  // Filter reservations based on search query & status filter
  const filteredReservations = React.useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const confMatch = r.confirmation_number?.toLowerCase().includes(q);
        const guestMatch =
          r.primary_guest &&
          `${r.primary_guest.first_name} ${r.primary_guest.last_name}`
            .toLowerCase()
            .includes(q);
        const phoneMatch = r.primary_guest?.phone?.toLowerCase().includes(q);
        const roomMatch = r.rooms?.some(
          (rm) =>
            rm.room_number?.toLowerCase().includes(q) ||
            rm.room_type_name?.toLowerCase().includes(q)
        );
        if (!confMatch && !guestMatch && !phoneMatch && !roomMatch) return false;
      }
      return true;
    });
  }, [reservations, searchQuery, statusFilter]);

  // Index bookings by date
  const bookingsByDate = React.useMemo(() => {
    const map: Record<
      string,
      {
        arrivals: Reservation[];
        departures: Reservation[];
        inHouse: Reservation[];
      }
    > = {};

    filteredReservations.forEach((res) => {
      const checkInStr = res.check_in_date;
      const checkOutStr = res.check_out_date;
      if (!checkInStr || !checkOutStr) return;

      // Add to check-in day
      if (!map[checkInStr]) map[checkInStr] = { arrivals: [], departures: [], inHouse: [] };
      map[checkInStr].arrivals.push(res);

      // Add to check-out day
      if (!map[checkOutStr]) map[checkOutStr] = { arrivals: [], departures: [], inHouse: [] };
      map[checkOutStr].departures.push(res);

      // Add to all intermediate in-house days
      const [sy, sm, sd] = checkInStr.split("-").map(Number);
      const [ey, em, ed] = checkOutStr.split("-").map(Number);
      const cur = new Date(sy, sm - 1, sd + 1, 12, 0, 0);
      const end = new Date(ey, em - 1, ed, 12, 0, 0);

      while (cur < end) {
        const curStr = formatLocalDate(cur);
        if (!map[curStr]) map[curStr] = { arrivals: [], departures: [], inHouse: [] };
        map[curStr].inHouse.push(res);
        cur.setDate(cur.getDate() + 1);
      }
    });

    return map;
  }, [filteredReservations]);

  // Monthly KPI Aggregates
  const monthStats = React.useMemo(() => {
    let totalArrivals = 0;
    let totalDepartures = 0;
    let totalRevenue = 0;
    const uniqueResIds = new Set<string>();

    filteredReservations.forEach((r) => {
      if (r.check_in_date) {
        const [y, m] = r.check_in_date.split("-").map(Number);
        if (m - 1 === month && y === year) {
          totalArrivals++;
        }
      }
      if (r.check_out_date) {
        const [y, m] = r.check_out_date.split("-").map(Number);
        if (m - 1 === month && y === year) {
          totalDepartures++;
        }
      }
      if (!uniqueResIds.has(r.id)) {
        uniqueResIds.add(r.id);
        totalRevenue += Number(r.total_amount || 0);
      }
    });

    return {
      totalBookings: uniqueResIds.size,
      totalArrivals,
      totalDepartures,
      totalRevenue,
    };
  }, [filteredReservations, month, year]);

  // Selected Day Reservations
  const selectedDayData = bookingsByDate[selectedDayStr] || {
    arrivals: [],
    departures: [],
    inHouse: [],
  };

  const selectedDayAllBookings = React.useMemo(() => {
    const list: { res: Reservation; role: "ARRIVAL" | "DEPARTURE" | "IN_HOUSE" }[] = [];
    selectedDayData.arrivals.forEach((r) => list.push({ res: r, role: "ARRIVAL" }));
    selectedDayData.departures.forEach((r) => list.push({ res: r, role: "DEPARTURE" }));
    selectedDayData.inHouse.forEach((r) => list.push({ res: r, role: "IN_HOUSE" }));
    return list;
  }, [selectedDayData]);

  // Week days for Week View
  const weekDays = React.useMemo(() => {
    const startOfWeek = new Date(selectedDay);
    const dayIndex = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayIndex); // start on Sunday

    const days: { date: Date; dateStr: string; isToday: boolean; isSelected: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const str = formatLocalDate(d);
      days.push({
        date: d,
        dateStr: str,
        isToday: str === todayStr,
        isSelected: str === selectedDayStr,
      });
    }
    return days;
  }, [selectedDay, todayStr, selectedDayStr]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    onDateChange(prev);
    setSelectedDay(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    onDateChange(next);
    setSelectedDay(next);
  };

  const handleToday = () => {
    const today = new Date();
    onDateChange(today);
    setSelectedDay(today);
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-4">
      {/* ── ULTRA-CLEAN MODERN COMMAND BAR ── */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Navigation & Current Period Title */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <CalendarDays className="h-6 w-6" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {monthName} {year}
                </h2>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 border border-amber-400/20">
                  {monthStats.totalBookings} Active Stays
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Quickly review room occupancy, arrivals, and guest schedules
              </p>
            </div>
          </div>

          {/* Center / Right: View Mode Switcher + Month Nav + Filter */}
          <div className="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-black/50 p-1 rounded-xl border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setSubView("month")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                  subView === "month"
                    ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Month Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setSubView("week")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                  subView === "week"
                    ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Columns className="h-3.5 w-3.5" />
                <span>7-Day Week</span>
              </button>

              <button
                type="button"
                onClick={() => setSubView("day")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                  subView === "day"
                    ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Day Agenda</span>
              </button>
            </div>

            {/* Previous / Today / Next Controls */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-8 px-3 text-xs font-black text-amber-400 hover:text-amber-300 hover:bg-white/10 rounded-lg"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── FILTER & QUICK STATS STRIP ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 pt-3.5 border-t border-white/10 items-center">
          {/* Quick Search */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search guest, room #, confirmation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white/5 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 h-9"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-xl text-xs font-bold bg-slate-800 border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Mini Monthly KPI Badges */}
          <div className="md:col-span-5 flex items-center gap-2 justify-between sm:justify-end flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{monthStats.totalArrivals} Arrivals</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span>{monthStats.totalDepartures} Departures</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-black">
              {formatCurrency(monthStats.totalRevenue, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. MONTH GRID VIEW (COMPACT, ATTRACTIVE & NON-SCROLLY) ── */}
      {subView === "month" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Main Month Grid (8 Cols) */}
          <div className="xl:col-span-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden flex flex-col">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-center text-[11px] font-black uppercase tracking-wider py-2.5">
              <span className="text-rose-500">Sun</span>
              <span className="text-slate-700 dark:text-slate-300">Mon</span>
              <span className="text-slate-700 dark:text-slate-300">Tue</span>
              <span className="text-slate-700 dark:text-slate-300">Wed</span>
              <span className="text-slate-700 dark:text-slate-300">Thu</span>
              <span className="text-slate-700 dark:text-slate-300">Fri</span>
              <span className="text-amber-500">Sat</span>
            </div>

            {/* 7-column calendar day grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 flex-1">
              {calendarDays.map((cell) => {
                const dayData = bookingsByDate[cell.dateStr] || {
                  arrivals: [],
                  departures: [],
                  inHouse: [],
                };

                const allDayList = [
                  ...dayData.arrivals.map((r) => ({ res: r, type: "arrival" as const })),
                  ...dayData.inHouse.map((r) => ({ res: r, type: "inHouse" as const })),
                  ...dayData.departures.map((r) => ({ res: r, type: "departure" as const })),
                ];

                const totalBookingsCount = allDayList.length;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => {
                      setSelectedDay(cell.date);
                      if (allDayList[0]) {
                        setSelectedReservation(allDayList[0].res);
                      }
                    }}
                    className={cn(
                      "min-h-[82px] p-1.5 transition-all cursor-pointer flex flex-col justify-between group relative select-none",
                      !cell.isCurrentMonth && "bg-slate-50/50 dark:bg-slate-950/40 opacity-40 hover:opacity-80",
                      cell.isCurrentMonth && "bg-white dark:bg-slate-900 hover:bg-amber-50/30 dark:hover:bg-slate-800/60",
                      cell.isSelected && "ring-2 ring-amber-500 bg-amber-50/30 dark:bg-amber-950/30 z-10 shadow-inner",
                      cell.isToday && "bg-gradient-to-br from-amber-50/60 via-transparent to-transparent dark:from-amber-950/40"
                    )}
                  >
                    {/* Date Number & Mini Counters */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-black transition",
                          cell.isToday
                            ? "bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/40"
                            : cell.isSelected
                            ? "bg-indigo-600 text-white font-black"
                            : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                        )}
                      >
                        {cell.dayNum}
                      </span>

                      {totalBookingsCount > 0 && (
                        <div className="flex items-center gap-0.5">
                          {dayData.arrivals.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title={`${dayData.arrivals.length} check-ins`} />
                          )}
                          {dayData.departures.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title={`${dayData.departures.length} check-outs`} />
                          )}
                          <span className="text-[9.5px] font-extrabold px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ml-0.5">
                            {totalBookingsCount}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Booking Pills on this day */}
                    <div className="space-y-0.5 my-1 flex-1 overflow-hidden">
                      {allDayList.slice(0, 2).map(({ res, type }) => {
                        const guestName = res.primary_guest
                          ? `${res.primary_guest.first_name} ${res.primary_guest.last_name?.[0] || ""}.`
                          : "Guest";
                        const roomNo = res.rooms?.[0]?.room_number || "Unass.";

                        return (
                          <div
                            key={`${res.id}-${type}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(cell.date);
                              setSelectedReservation(res);
                            }}
                            className={cn(
                              "px-1 py-0.5 rounded text-[9px] font-extrabold truncate flex items-center gap-1 border transition-all hover:scale-[1.02]",
                              type === "arrival"
                                ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300/70 dark:border-emerald-800"
                                : type === "departure"
                                ? "bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300/70 dark:border-rose-800"
                                : "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300/70 dark:border-indigo-800"
                            )}
                            title={`${guestName} (Room ${roomNo}) - ${res.status}`}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full shrink-0",
                                type === "arrival"
                                  ? "bg-emerald-500"
                                  : type === "departure"
                                  ? "bg-rose-500"
                                  : "bg-indigo-500"
                              )}
                            />
                            <span className="truncate">
                              {roomNo !== "Unass." ? `R${roomNo}` : "Unass"} · {guestName}
                            </span>
                          </div>
                        );
                      })}

                      {totalBookingsCount > 2 && (
                        <div className="text-[8.5px] font-extrabold text-amber-600 dark:text-amber-400 pl-0.5">
                          +{totalBookingsCount - 2} more stays
                        </div>
                      )}
                    </div>

                    {/* Bottom Day Indicator */}
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 opacity-90">
                      <span>{dayData.arrivals.length > 0 ? `+${dayData.arrivals.length} In` : ""}</span>
                      <span>{dayData.departures.length > 0 ? `-${dayData.departures.length} Out` : ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Selected Date Inspector (4 Cols) */}
          <div className="xl:col-span-4 space-y-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
              {/* Day Title & Quick Add Booking */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      {selectedDay.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </h3>
                    <p className="text-[10.5px] text-slate-500">
                      {selectedDayAllBookings.length} bookings scheduled
                    </p>
                  </div>
                </div>

                <Link href={`/bookings/new?checkIn=${selectedDayStr}`}>
                  <Button size="sm" className="h-7 px-2.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg">
                    + New Booking
                  </Button>
                </Link>
              </div>

              {/* Bookings List on Selected Day */}
              {selectedDayAllBookings.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <BedDouble className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    No stays on this date
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">
                    Click "+ New Booking" to book a room checking in on this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {selectedDayAllBookings.map(({ res, role }) => {
                    const guestName = res.primary_guest
                      ? `${res.primary_guest.first_name} ${res.primary_guest.last_name}`.trim()
                      : "Guest";
                    const firstRoom = res.rooms?.[0];
                    const roomNo = firstRoom?.room_number;
                    const isCardSelected = selectedReservation?.id === res.id;

                    return (
                      <div
                        key={`${res.id}-${role}`}
                        onClick={() => setSelectedReservation(res)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer shadow-xs",
                          isCardSelected
                            ? "bg-amber-50/30 dark:bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/40"
                            : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-amber-400/50"
                        )}
                      >
                        {/* Header: Role & Status */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1",
                              role === "ARRIVAL"
                                ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                                : role === "DEPARTURE"
                                ? "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300"
                                : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300"
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {role === "ARRIVAL"
                              ? "Check-In"
                              : role === "DEPARTURE"
                              ? "Check-Out"
                              : "In-House"}
                          </span>

                          <BookingStatusBadge status={res.status} />
                        </div>

                        {/* Guest & Room Details */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white">
                            {guestName}
                          </h4>
                          <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                            {formatCurrency(res.total_amount, currency)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded">
                            #{res.confirmation_number}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {roomNo ? `Room ${roomNo}` : "Unassigned Room"}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          {firstRoom && !firstRoom.room_number && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssignRoomClick(res, firstRoom);
                              }}
                              className="h-6 px-2 text-[10px] font-bold rounded-md border-amber-300 text-amber-800 hover:bg-amber-50"
                            >
                              Assign
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusClick(res);
                            }}
                            className="h-6 px-2 text-[10px] font-bold rounded-md text-slate-600 hover:text-slate-900"
                          >
                            Status
                          </Button>
                          <Link href={`/bookings/${res.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="h-6 px-2 text-[10px] font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white gap-0.5"
                            >
                              <span>View</span>
                              <ArrowRight className="h-2.5 w-2.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. 7-DAY WEEK VIEW (SUPER GRAPHICAL & FAST INSPECTION) ── */}
      {subView === "week" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Columns className="h-4 w-4 text-amber-500" />
              <span>7-Day Comprehensive Schedule</span>
            </h3>
            <span className="text-xs text-slate-500 font-bold">
              {weekDays[0]?.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
              {weekDays[6]?.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
            {weekDays.map((col) => {
              const dayData = bookingsByDate[col.dateStr] || { arrivals: [], departures: [], inHouse: [] };
              const allStays = [
                ...dayData.arrivals.map((r) => ({ res: r, type: "arrival" as const })),
                ...dayData.inHouse.map((r) => ({ res: r, type: "inHouse" as const })),
                ...dayData.departures.map((r) => ({ res: r, type: "departure" as const })),
              ];

              return (
                <div
                  key={col.dateStr}
                  onClick={() => setSelectedDay(col.date)}
                  className={cn(
                    "rounded-xl border p-2.5 flex flex-col justify-between min-h-[320px] transition-all cursor-pointer",
                    col.isSelected
                      ? "bg-amber-50/40 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30"
                      : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300",
                    col.isToday && "border-amber-400 bg-amber-50/20"
                  )}
                >
                  {/* Column Header */}
                  <div className="pb-2 border-b border-slate-200/60 dark:border-slate-700/60 text-center">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {col.date.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div
                      className={cn(
                        "h-7 w-7 rounded-full mx-auto flex items-center justify-center text-xs font-black mt-1",
                        col.isToday
                          ? "bg-amber-500 text-slate-950 shadow-xs"
                          : col.isSelected
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "text-slate-800 dark:text-slate-200"
                      )}
                    >
                      {col.date.getDate()}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-1">
                      {allStays.length} stays
                    </div>
                  </div>

                  {/* List of stays */}
                  <div className="space-y-1.5 my-2 flex-1 overflow-y-auto max-h-[220px] pr-0.5">
                    {allStays.map(({ res, type }) => {
                      const guestName = res.primary_guest
                        ? `${res.primary_guest.first_name} ${res.primary_guest.last_name?.[0] || ""}.`
                        : "Guest";
                      const roomNo = res.rooms?.[0]?.room_number;

                      return (
                        <Link
                          key={`${res.id}-${type}`}
                          href={`/bookings/${res.id}`}
                          className={cn(
                            "block p-1.5 rounded-lg border text-[10px] font-bold transition hover:scale-[1.02] shadow-2xs",
                            type === "arrival"
                              ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300/80 text-emerald-800 dark:text-emerald-300"
                              : type === "departure"
                              ? "bg-rose-50 dark:bg-rose-950/70 border-rose-300/80 text-rose-800 dark:text-rose-300"
                              : "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300/80 text-indigo-800 dark:text-indigo-300"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{guestName}</span>
                            <span className="font-mono text-[9px] font-black">{roomNo ? `R${roomNo}` : "Unass"}</span>
                          </div>
                          <div className="text-[8.5px] opacity-75 mt-0.5 flex items-center justify-between">
                            <span>{type === "arrival" ? "↓ Check-in" : type === "departure" ? "↑ Check-out" : "Stay"}</span>
                            <span>{res.status}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  <Link href={`/bookings/new?checkIn=${col.dateStr}`} className="block">
                    <Button variant="outline" size="sm" className="w-full h-6 text-[10px] font-bold rounded-md">
                      + Add
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. DAY AGENDA VIEW (FULL ROOM & GUEST OPERATIONS) ── */}
      {subView === "day" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-amber-500" />
                <span>
                  {selectedDay.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Front desk checklist for arrivals, departures, and in-house guests on this date
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/bookings/new?checkIn=${selectedDayStr}`}>
                <Button size="sm" className="h-8 gap-1.5 font-black bg-amber-500 hover:bg-amber-600 text-slate-950">
                  <span>+ Create Booking</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* 3 Columns: Arrivals | In-House | Departures */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Arrivals Column */}
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <LogIn className="h-4 w-4" />
                  <span>Arrivals ({selectedDayData.arrivals.length})</span>
                </span>
              </div>

              {selectedDayData.arrivals.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No arrivals today</div>
              ) : (
                <div className="space-y-2">
                  {selectedDayData.arrivals.map((res) => (
                    <div
                      key={res.id}
                      className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200/70 dark:border-emerald-800 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {res.primary_guest ? `${res.primary_guest.first_name} ${res.primary_guest.last_name}` : "Guest"}
                        </h4>
                        <BookingStatusBadge status={res.status} />
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Room {res.rooms?.[0]?.room_number || "Unassigned"}</span>
                        <span className="font-mono font-bold">{formatCurrency(res.total_amount, currency)}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <Link href={`/bookings/${res.id}`}>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] font-bold">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* In-House Column */}
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4" />
                  <span>In-House Stays ({selectedDayData.inHouse.length})</span>
                </span>
              </div>

              {selectedDayData.inHouse.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No in-house stays</div>
              ) : (
                <div className="space-y-2">
                  {selectedDayData.inHouse.map((res) => (
                    <div
                      key={res.id}
                      className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200/70 dark:border-indigo-800 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {res.primary_guest ? `${res.primary_guest.first_name} ${res.primary_guest.last_name}` : "Guest"}
                        </h4>
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          Rm {res.rooms?.[0]?.room_number || "Unassigned"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Check-Out: {res.check_out_date}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{res.nights || 1} Nights</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <Link href={`/bookings/${res.id}`}>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] font-bold">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Departures Column */}
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <LogOut className="h-4 w-4" />
                  <span>Departures ({selectedDayData.departures.length})</span>
                </span>
              </div>

              {selectedDayData.departures.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No departures today</div>
              ) : (
                <div className="space-y-2">
                  {selectedDayData.departures.map((res) => (
                    <div
                      key={res.id}
                      className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-rose-200/70 dark:border-rose-800 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {res.primary_guest ? `${res.primary_guest.first_name} ${res.primary_guest.last_name}` : "Guest"}
                        </h4>
                        <BookingStatusBadge status={res.status} />
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Room {res.rooms?.[0]?.room_number || "Unassigned"}</span>
                        <span className="font-mono font-bold text-rose-600">{formatCurrency(res.total_amount, currency)}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <Link href={`/bookings/${res.id}`}>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] font-bold">
                            Settle Folio
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
