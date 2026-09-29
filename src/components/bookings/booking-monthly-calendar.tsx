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
  Flame,
  Plus,
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
type DayFilterTab = "ALL" | "ARRIVALS" | "IN_HOUSE" | "DEPARTURES";

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
  const [dayTabFilter, setDayTabFilter] = React.useState<DayFilterTab>("ALL");
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
    selectedDayData.inHouse.forEach((r) => list.push({ res: r, role: "IN_HOUSE" }));
    selectedDayData.departures.forEach((r) => list.push({ res: r, role: "DEPARTURE" }));
    return list;
  }, [selectedDayData]);

  // Filtered Day Bookings for Tab View
  const filteredDayBookings = React.useMemo(() => {
    if (dayTabFilter === "ARRIVALS") return selectedDayAllBookings.filter((b) => b.role === "ARRIVAL");
    if (dayTabFilter === "IN_HOUSE") return selectedDayAllBookings.filter((b) => b.role === "IN_HOUSE");
    if (dayTabFilter === "DEPARTURES") return selectedDayAllBookings.filter((b) => b.role === "DEPARTURE");
    return selectedDayAllBookings;
  }, [selectedDayAllBookings, dayTabFilter]);

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
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* ── 1. UNIFIED LUXURY COMMAND CENTER HERO ── */}
      <div
        className="w-full rounded-2xl p-5 shadow-2xl text-white relative overflow-hidden border border-white/15"
        style={{
          background: "linear-gradient(135deg, #091224 0%, #0F1D38 45%, #14244A 100%)",
        }}
      >
        {/* Ambient background glows */}
        <div
          className="absolute -top-16 -right-16 h-56 w-56 rounded-full pointer-events-none opacity-25"
          style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }}
        />

        <div className="relative z-10 space-y-4">
          {/* Top Bar: Title, Date navigation & View mode switchers */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Brand / Title */}
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 ring-2 ring-amber-400/40">
                <CalendarDays className="h-6 w-6" />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {monthName} {year}
                  </h1>
                  <span className="text-[11px] font-black px-3 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1.5 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    {monthStats.totalBookings} Active Stays
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Live Visual Reservation Grid, Room Occupancy &amp; Guest Schedules
                </p>
              </div>
            </div>

            {/* Right: View Segmented Toggle + Navigation + Action */}
            <div className="flex items-center gap-2.5 flex-wrap justify-start lg:justify-end">
              {/* Segmented View Mode */}
              <div className="flex items-center bg-black/50 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-inner">
                <button
                  type="button"
                  onClick={() => setSubView("month")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                    subView === "month"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md scale-[1.02]"
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Month Matrix</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubView("week")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                    subView === "week"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md scale-[1.02]"
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  <Columns className="h-3.5 w-3.5" />
                  <span>7-Day Week</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubView("day")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                    subView === "day"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md scale-[1.02]"
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Day Operations</span>
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 p-0 text-slate-200 hover:text-white hover:bg-white/15 rounded-lg"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="h-8 px-3 text-xs font-black text-amber-300 hover:text-amber-200 hover:bg-white/15 rounded-lg"
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextMonth}
                  className="h-8 w-8 p-0 text-slate-200 hover:text-white hover:bg-white/15 rounded-lg"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Link href={`/bookings/new?checkIn=${selectedDayStr}`}>
                <Button
                  size="sm"
                  className="h-9 px-3.5 gap-1.5 font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-105 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 text-xs"
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                  <span>New Booking</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Bottom Bar: Search, Status Filter & Live Glowing Metric Chips */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3.5 border-t border-white/15 items-center">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Quick search guest, room #, conf..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 focus:bg-slate-950 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 rounded-xl h-9 transition"
              />
            </div>

            {/* Status Select */}
            <div className="md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs font-bold bg-slate-900 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60 cursor-pointer"
              >
                <option value="ALL">All Reservation Statuses</option>
                <option value="CONFIRMED">Confirmed Only</option>
                <option value="PENDING">Pending Inquiries</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed Stays</option>
              </select>
            </div>

            {/* Live Vibrant Stat Badges */}
            <div className="md:col-span-5 flex items-center gap-2 justify-start md:justify-end flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black shadow-xs">
                <LogIn className="h-3.5 w-3.5 text-emerald-400" />
                <span>{monthStats.totalArrivals} Arrivals</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-black shadow-xs">
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span>{monthStats.totalDepartures} Departures</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-black shadow-xs">
                <span>{formatCurrency(monthStats.totalRevenue, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. MAIN MONTH MATRIX (GRAPHICAL, HIGH-CONTRAST & COLORFUL) ── */}
      {subView === "month" && (
        <div className="space-y-4 w-full">
          {/* Month Calendar Grid Card */}
          <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden">
            {/* Weekdays Header Strip */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-800/90 text-center text-[11px] font-black uppercase tracking-wider py-3">
              <span className="text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
                <span>Sun</span>
              </span>
              <span className="text-slate-700 dark:text-slate-300">Mon</span>
              <span className="text-slate-700 dark:text-slate-300">Tue</span>
              <span className="text-slate-700 dark:text-slate-300">Wed</span>
              <span className="text-slate-700 dark:text-slate-300">Thu</span>
              <span className="text-slate-700 dark:text-slate-300">Fri</span>
              <span className="text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                <span>Sat</span>
              </span>
            </div>

            {/* 7-Column Day Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
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
                      "min-h-[92px] p-2 transition-all duration-150 cursor-pointer flex flex-col justify-between group relative select-none",
                      !cell.isCurrentMonth && "bg-slate-50/40 dark:bg-slate-950/40 opacity-40 hover:opacity-80",
                      cell.isCurrentMonth && "bg-white dark:bg-slate-900 hover:bg-amber-50/20 dark:hover:bg-slate-800/50",
                      cell.isSelected && "ring-2 ring-amber-500 bg-amber-50/40 dark:bg-amber-950/30 z-10 shadow-md",
                      cell.isToday && "bg-gradient-to-br from-amber-100/50 via-amber-50/20 to-transparent dark:from-amber-950/40"
                    )}
                  >
                    {/* Cell Top Header: Date badge + Total Stay Counter */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center text-xs font-black transition-all",
                          cell.isToday
                            ? "bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-400/50 scale-105"
                            : cell.isSelected
                            ? "bg-indigo-600 text-white font-black shadow-xs scale-105"
                            : "text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400"
                        )}
                      >
                        {cell.dayNum}
                      </span>

                      {totalBookingsCount > 0 && (
                        <div className="flex items-center gap-1">
                          {dayData.arrivals.length > 0 && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" title={`${dayData.arrivals.length} arrivals`} />
                          )}
                          {dayData.departures.length > 0 && (
                            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-xs" title={`${dayData.departures.length} departures`} />
                          )}
                          <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                            {totalBookingsCount}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Booking Graphical Pills */}
                    <div className="space-y-1 my-1.5 flex-1 overflow-hidden">
                      {allDayList.slice(0, 2).map(({ res, type }) => {
                        const guestName = res.primary_guest
                          ? `${res.primary_guest.first_name} ${res.primary_guest.last_name?.[0] || ""}.`
                          : "Guest";
                        const roomNo = res.rooms?.[0]?.room_number || "Unass";

                        return (
                          <div
                            key={`${res.id}-${type}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(cell.date);
                              setSelectedReservation(res);
                            }}
                            className={cn(
                              "px-1.5 py-1 rounded-md text-[9.5px] font-black truncate flex items-center gap-1.5 border shadow-2xs transition-all hover:scale-[1.02]",
                              type === "arrival"
                                ? "bg-gradient-to-r from-emerald-50 to-emerald-100/80 dark:from-emerald-950/80 dark:to-emerald-900/60 text-emerald-900 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800"
                                : type === "departure"
                                ? "bg-gradient-to-r from-rose-50 to-rose-100/80 dark:from-rose-950/80 dark:to-rose-900/60 text-rose-900 dark:text-rose-300 border-rose-300/80 dark:border-rose-800"
                                : "bg-gradient-to-r from-indigo-50 to-indigo-100/80 dark:from-indigo-950/80 dark:to-indigo-900/60 text-indigo-900 dark:text-indigo-300 border-indigo-300/80 dark:border-indigo-800"
                            )}
                            title={`${guestName} (Room ${roomNo}) - ${res.status}`}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full shrink-0",
                                type === "arrival"
                                  ? "bg-emerald-500 animate-pulse"
                                  : type === "departure"
                                  ? "bg-rose-500"
                                  : "bg-indigo-500"
                              )}
                            />
                            <span className="font-mono font-black text-[9px] px-1 rounded bg-black/5 dark:bg-white/10 shrink-0">
                              {roomNo !== "Unass" ? `R${roomNo}` : "Unass"}
                            </span>
                            <span className="truncate font-bold">
                              {guestName}
                            </span>
                          </div>
                        );
                      })}

                      {totalBookingsCount > 2 && (
                        <div className="text-[9px] font-black text-amber-600 dark:text-amber-400 pl-1 flex items-center gap-1">
                          <Flame className="h-2.5 w-2.5" />
                          <span>+{totalBookingsCount - 2} more stays</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Day Indicator Pills */}
                    <div className="flex items-center justify-between text-[8.5px] font-extrabold text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {dayData.arrivals.length > 0 ? `↓ ${dayData.arrivals.length} In` : ""}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        {dayData.departures.length > 0 ? `↑ ${dayData.departures.length} Out` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 3. SELECTED DATE COMMAND STATION (RICH, LUXURIOUS & INTERACTIVE) ── */}
          <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xl space-y-4">
            {/* Header: Date + Filter Tabs + New Booking Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black shrink-0 ring-1 ring-amber-500/30">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    {selectedDay.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedDayAllBookings.length} total scheduled stays ({selectedDayData.arrivals.length} arrivals, {selectedDayData.departures.length} departures)
                  </p>
                </div>
              </div>

              {/* Sub-Tabs for this day & Action */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setDayTabFilter("ALL")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition",
                      dayTabFilter === "ALL"
                        ? "bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400"
                    )}
                  >
                    All ({selectedDayAllBookings.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDayTabFilter("ARRIVALS")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1",
                      dayTabFilter === "ARRIVALS"
                        ? "bg-emerald-500 text-slate-950 font-black shadow-xs"
                        : "text-emerald-700 dark:text-emerald-400"
                    )}
                  >
                    <span>Arrivals ({selectedDayData.arrivals.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDayTabFilter("IN_HOUSE")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1",
                      dayTabFilter === "IN_HOUSE"
                        ? "bg-indigo-600 text-white font-black shadow-xs"
                        : "text-indigo-700 dark:text-indigo-400"
                    )}
                  >
                    <span>In-House ({selectedDayData.inHouse.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDayTabFilter("DEPARTURES")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1",
                      dayTabFilter === "DEPARTURES"
                        ? "bg-rose-500 text-white font-black shadow-xs"
                        : "text-rose-700 dark:text-rose-400"
                    )}
                  >
                    <span>Departures ({selectedDayData.departures.length})</span>
                  </button>
                </div>

                <Link href={`/bookings/new?checkIn=${selectedDayStr}`}>
                  <Button size="sm" className="h-8 px-3 text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 text-slate-950 rounded-xl shadow-xs">
                    + Book This Date
                  </Button>
                </Link>
              </div>
            </div>

            {/* List of Stays Grid for Selected Day */}
            {filteredDayBookings.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-slate-800 text-amber-500 mx-auto flex items-center justify-center border border-amber-200/60 dark:border-slate-700">
                  <BedDouble className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No reservations matching filter on this date
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Click &ldquo;+ Book This Date&rdquo; to create a new reservation checking in on this day.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {filteredDayBookings.map(({ res, role }) => {
                  const guestName = res.primary_guest
                    ? `${res.primary_guest.first_name} ${res.primary_guest.last_name}`.trim()
                    : "Guest";
                  const firstRoom = res.rooms?.[0];
                  const roomNo = firstRoom?.room_number;
                  const roomTypeName = firstRoom?.room_type_name || "Standard Room";
                  const isCardSelected = selectedReservation?.id === res.id;

                  return (
                    <div
                      key={`${res.id}-${role}`}
                      onClick={() => setSelectedReservation(res)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md space-y-3",
                        isCardSelected
                          ? "bg-amber-50/50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30"
                          : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-amber-400"
                      )}
                    >
                      {/* Top Row: Role Badge & Reservation Status */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs",
                            role === "ARRIVAL"
                              ? "bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80"
                              : role === "DEPARTURE"
                              ? "bg-rose-100 dark:bg-rose-950/90 text-rose-800 dark:text-rose-300 border border-rose-300/80"
                              : "bg-indigo-100 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-300 border border-indigo-300/80"
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

                      {/* Guest Details & Pricing */}
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {guestName}
                          </h4>
                          <span className="font-mono text-sm font-black text-slate-900 dark:text-white shrink-0">
                            {formatCurrency(res.total_amount, currency)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            #{res.confirmation_number}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {roomNo ? `Room ${roomNo}` : "Unassigned Room"}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500">{roomTypeName}</span>
                        </div>
                      </div>

                      {/* Stay Duration Timeline */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Check-In</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{res.check_in_date}</span>
                        </div>
                        <div className="text-center font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {res.nights || 1}N
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Check-Out</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{res.check_out_date}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        {firstRoom && !firstRoom.room_number && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAssignRoomClick(res, firstRoom);
                            }}
                            className="h-7 px-2.5 text-xs font-bold rounded-lg border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            Assign Room
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusClick(res);
                          }}
                          className="h-7 px-2.5 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-900"
                        >
                          Status
                        </Button>
                        <Link href={`/bookings/${res.id}`} onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs font-black rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-1 shadow-xs"
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
      )}

      {/* ── 4. 7-DAY WEEK VIEW (GRAPHICAL HORIZONTAL GANTT STRIP) ── */}
      {subView === "week" && (
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
                <Columns className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  7-Day Continuous Schedule
                </h3>
                <span className="text-xs text-slate-500 font-bold">
                  {weekDays[0]?.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                  {weekDays[6]?.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>

            <Link href={`/bookings/new?checkIn=${selectedDayStr}`}>
              <Button size="sm" className="h-8 px-3 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl">
                + New Booking
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
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
                    "rounded-2xl border p-3 flex flex-col justify-between min-h-[320px] transition-all cursor-pointer shadow-xs hover:shadow-md",
                    col.isSelected
                      ? "bg-amber-50/50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300",
                    col.isToday && "border-amber-400 bg-amber-50/20"
                  )}
                >
                  {/* Header */}
                  <div className="pb-2.5 border-b border-slate-200/60 dark:border-slate-700/60 text-center">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {col.date.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full mx-auto flex items-center justify-center text-xs font-black mt-1",
                        col.isToday
                          ? "bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/40"
                          : col.isSelected
                          ? "bg-indigo-600 text-white font-black"
                          : "text-slate-800 dark:text-slate-200"
                      )}
                    >
                      {col.date.getDate()}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-1">
                      {allStays.length} stays
                    </div>
                  </div>

                  {/* Stay List */}
                  <div className="space-y-1.5 my-2 flex-1 overflow-y-auto max-h-[200px] pr-0.5">
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
                            "block p-2 rounded-xl border text-[10px] font-bold transition hover:scale-[1.02] shadow-2xs",
                            type === "arrival"
                              ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300/90 text-emerald-800 dark:text-emerald-300"
                              : type === "departure"
                              ? "bg-rose-50 dark:bg-rose-950/80 border-rose-300/90 text-rose-800 dark:text-rose-300"
                              : "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300/90 text-indigo-800 dark:text-indigo-300"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{guestName}</span>
                            <span className="font-mono text-[9px] font-black">{roomNo ? `R${roomNo}` : "Unass"}</span>
                          </div>
                          <div className="text-[8.5px] opacity-80 mt-0.5 flex items-center justify-between">
                            <span>{type === "arrival" ? "↓ In" : type === "departure" ? "↑ Out" : "Stay"}</span>
                            <span>{res.status}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  <Link href={`/bookings/new?checkIn=${col.dateStr}`} className="block">
                    <Button variant="outline" size="sm" className="w-full h-7 text-[10px] font-bold rounded-xl">
                      + Add Stay
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. DAY OPERATIONS DESK (SWIMLANE WORKSTATION) ── */}
      {subView === "day" && (
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
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
                <Button size="sm" className="h-8 gap-1.5 font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl">
                  <span>+ Create Booking</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* 3 Columns: Arrivals | In-House | Departures */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Arrivals Column */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <LogIn className="h-4 w-4" />
                  <span>Arrivals Queue ({selectedDayData.arrivals.length})</span>
                </span>
              </div>

              {selectedDayData.arrivals.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No arrivals today</div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDayData.arrivals.map((res) => (
                    <div
                      key={res.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/80 dark:border-emerald-800 shadow-xs space-y-2"
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
                      <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100 dark:border-slate-700">
                        <Link href={`/bookings/${res.id}`}>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] font-bold">
                            View Folio
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* In-House Column */}
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4" />
                  <span>In-House Stays ({selectedDayData.inHouse.length})</span>
                </span>
              </div>

              {selectedDayData.inHouse.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No in-house stays</div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDayData.inHouse.map((res) => (
                    <div
                      key={res.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200/80 dark:border-indigo-800 shadow-xs space-y-2"
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
                      <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100 dark:border-slate-700">
                        <Link href={`/bookings/${res.id}`}>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] font-bold">
                            Stay Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Departures Column */}
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <LogOut className="h-4 w-4" />
                  <span>Departures Queue ({selectedDayData.departures.length})</span>
                </span>
              </div>

              {selectedDayData.departures.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No departures today</div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDayData.departures.map((res) => (
                    <div
                      key={res.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-rose-200/80 dark:border-rose-800 shadow-xs space-y-2"
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
                      <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100 dark:border-slate-700">
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
