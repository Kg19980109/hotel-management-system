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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

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

  // Next month padding to fill complete weeks (up to 35 or 42 cells)
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
        const confMatch = r.confirmation_number.toLowerCase().includes(q);
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
  // A booking can be: ARRIVAL (checkInDate === date), DEPARTURE (checkOutDate === date), or STAYING (between checkIn and checkOut)
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
      {/* ── CALENDAR TOOLBAR & MONTH CONTROL BAR ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month Selector & Controls */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-xs">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {monthName} {year}
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {monthStats.totalBookings} Stays
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Interactive date-wise reservation schedule & room occupancy
              </p>
            </div>
          </div>

          {/* Quick Search & Status Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search guest, conf #, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 h-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="h-7 w-7 p-0 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-7 px-2.5 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="h-7 w-7 p-0 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── MONTH QUICK METRICS BAR ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Stays
            </span>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              {monthStats.totalBookings}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Arrivals
            </span>
            <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
              {monthStats.totalArrivals}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Departures
            </span>
            <span className="font-extrabold text-sm text-rose-700 dark:text-rose-300">
              {monthStats.totalDepartures}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              Month Value
            </span>
            <span className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
              {formatCurrency(monthStats.totalRevenue, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* ── CALENDAR MATRIX & DAY DETAIL SPLIT VIEW ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT / TOP: CALENDAR MONTH GRID (8 Cols on xl) */}
        <div className="xl:col-span-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center text-[11px] font-black uppercase tracking-wider text-slate-500 py-2.5">
            <span className="text-rose-500">Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-amber-600">Sat</span>
          </div>

          {/* 7-column calendar day grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
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
                  onClick={() => setSelectedDay(cell.date)}
                  className={cn(
                    "min-h-[105px] p-2 transition cursor-pointer flex flex-col justify-between group relative select-none",
                    !cell.isCurrentMonth && "bg-slate-50/40 dark:bg-slate-950/40 opacity-40 hover:opacity-80",
                    cell.isCurrentMonth && "bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50",
                    cell.isSelected && "ring-2 ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20 z-10",
                    cell.isToday && "bg-gradient-to-b from-amber-50/40 to-transparent dark:from-amber-950/30"
                  )}
                >
                  {/* Top Bar inside cell: Date number & counts */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-xs font-black transition",
                        cell.isToday
                          ? "bg-amber-500 text-slate-950 shadow-xs font-extrabold"
                          : cell.isSelected
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                      )}
                    >
                      {cell.dayNum}
                    </span>

                    {totalBookingsCount > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {totalBookingsCount}
                      </span>
                    )}
                  </div>

                  {/* Booking Pills on this day */}
                  <div className="space-y-1 my-1 flex-1 overflow-hidden">
                    {allDayList.slice(0, 2).map(({ res, type }) => {
                      const guestName = res.primary_guest
                        ? `${res.primary_guest.first_name} ${res.primary_guest.last_name[0] || ""}.`
                        : "Guest";
                      const roomNo = res.rooms?.[0]?.room_number || "Unassigned";

                      return (
                        <div
                          key={`${res.id}-${type}`}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9.5px] font-bold truncate flex items-center gap-1 border transition-transform hover:scale-[1.02]",
                            type === "arrival"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800"
                              : type === "departure"
                              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300/60 dark:border-rose-800"
                              : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300/60 dark:border-indigo-800"
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
                            {roomNo !== "Unassigned" ? `Rm ${roomNo}` : "Unass."} · {guestName}
                          </span>
                        </div>
                      );
                    })}

                    {totalBookingsCount > 2 && (
                      <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 pl-1">
                        +{totalBookingsCount - 2} more
                      </div>
                    )}
                  </div>

                  {/* Mini status indicator footer */}
                  <div className="flex items-center gap-1 text-[8.5px] font-bold opacity-80">
                    {dayData.arrivals.length > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ↓{dayData.arrivals.length} In
                      </span>
                    )}
                    {dayData.departures.length > 0 && (
                      <span className="text-rose-600 dark:text-rose-400">
                        ↑{dayData.departures.length} Out
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT / BOTTOM: SELECTED DATE INSPECTOR PANEL (4 Cols on xl) */}
        <div className="xl:col-span-4 space-y-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            {/* Header of selected day */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {selectedDay.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedDayAllBookings.length} bookings on this date
                  </p>
                </div>
              </div>

              <Link href={`/bookings/new?checkIn=${selectedDayStr}`}>
                <Button size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950">
                  <span>+ Book</span>
                </Button>
              </Link>
            </div>

            {/* List of bookings on selected date */}
            {selectedDayAllBookings.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <BedDouble className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  No Bookings On This Date
                </h4>
                <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">
                  Click "+ Book" to create a new reservation checking in on this day.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {selectedDayAllBookings.map(({ res, role }) => {
                  const guestName = res.primary_guest
                    ? `${res.primary_guest.first_name} ${res.primary_guest.last_name}`.trim()
                    : "Guest";
                  const firstRoom = res.rooms?.[0];
                  const roomNo = firstRoom?.room_number;
                  const roomType = firstRoom?.room_type_name || "Standard Room";

                  return (
                    <div
                      key={`${res.id}-${role}`}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5 hover:border-amber-500/40 transition shadow-2xs"
                    >
                      {/* Top: Status & Role Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1",
                            role === "ARRIVAL"
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                              : role === "DEPARTURE"
                              ? "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300"
                              : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300"
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {role === "ARRIVAL"
                            ? "Check-In Day"
                            : role === "DEPARTURE"
                            ? "Check-Out Day"
                            : "In-House Stay"}
                        </span>

                        <BookingStatusBadge status={res.status} />
                      </div>

                      {/* Guest & Room Info */}
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white">
                            {guestName}
                          </h4>
                          <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                            {formatCurrency(res.total_amount, currency)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                            #{res.confirmation_number}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <BedDouble className="h-3 w-3 text-slate-400" />
                            {roomNo ? `Room ${roomNo}` : "Unassigned Room"}
                          </span>
                        </div>

                        {res.primary_guest?.phone && (
                          <div className="text-[10.5px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5" />
                            <span>{res.primary_guest.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Schedule Bar */}
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[10.5px]">
                        <div>
                          <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Check-In</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{res.check_in_date}</span>
                        </div>
                        <div className="text-center font-bold text-slate-400">
                          {res.nights || 1}N
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Check-Out</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{res.check_out_date}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        {firstRoom && !firstRoom.room_number && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAssignRoomClick(res, firstRoom)}
                            className="h-7 px-2 text-[10.5px] font-bold rounded-lg border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            Assign Room
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onStatusClick(res)}
                          className="h-7 px-2 text-[10.5px] font-bold rounded-lg text-slate-600 hover:text-slate-900"
                        >
                          Status
                        </Button>
                        <Link href={`/bookings/${res.id}`}>
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-[10.5px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="h-3 w-3" />
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
    </div>
  );
}
