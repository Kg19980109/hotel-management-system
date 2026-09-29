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

  // Day navigation for the right inspector
  const handlePrevDay = () => {
    const prev = new Date(selectedDay);
    prev.setDate(prev.getDate() - 1);
    setSelectedDay(prev);
    if (prev.getMonth() !== month) {
      onDateChange(new Date(prev.getFullYear(), prev.getMonth(), 1));
    }
  };

  const handleNextDay = () => {
    const next = new Date(selectedDay);
    next.setDate(next.getDate() + 1);
    setSelectedDay(next);
    if (next.getMonth() !== month) {
      onDateChange(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* ── 1. UNIFIED LUXURY COMMAND CENTER HERO ── */}
      <div
        className="w-full rounded-2xl p-4 sm:p-5 shadow-2xl text-white relative overflow-hidden border border-white/15"
        style={{
          background: "linear-gradient(135deg, #091224 0%, #0F1D38 45%, #14244A 100%)",
        }}
      >
        {/* Ambient glows */}
        <div
          className="absolute -top-16 -right-16 h-56 w-56 rounded-full pointer-events-none opacity-25"
          style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }}
        />

        <div className="relative z-10 space-y-3.5">
          {/* Top Bar: Title, Date navigation & View mode switchers */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Left: Brand / Title */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 ring-2 ring-amber-400/40">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {monthName} {year}
                  </h1>
                  <span className="text-[10.5px] font-black px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    {monthStats.totalBookings} Active Stays
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-400 mt-0.5 font-medium">
                  Live Visual Reservation Grid &amp; Interactive Side Inspector
                </p>
              </div>
            </div>

            {/* Right: View Switchers + Navigation Controls */}
            <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
              {/* Segmented View Mode */}
              <div className="flex items-center bg-black/50 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-inner">
                <button
                  type="button"
                  onClick={() => setSubView("month")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                    subView === "month"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md scale-[1.02]"
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Calendar &amp; Inspector</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubView("week")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all",
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
                    "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                    subView === "day"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md scale-[1.02]"
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Day Agenda</span>
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevMonth}
                  className="h-7 w-7 p-0 text-slate-200 hover:text-white hover:bg-white/15 rounded-lg"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="h-7 px-2.5 text-xs font-black text-amber-300 hover:text-amber-200 hover:bg-white/15 rounded-lg"
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextMonth}
                  className="h-7 w-7 p-0 text-slate-200 hover:text-white hover:bg-white/15 rounded-lg"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Link href={`/bookings/new?checkIn=${selectedDayStr}`}>
                <Button
                  size="sm"
                  className="h-8 px-3 gap-1.5 font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-105 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>New Booking</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Bottom Filter & Metric Badges */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-3 border-t border-white/15 items-center">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search guest, room #, conf..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-white/10 hover:bg-white/15 focus:bg-slate-950 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 rounded-xl h-8 transition"
              />
            </div>

            {/* Status Select */}
            <div className="md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-8 px-2.5 rounded-xl text-xs font-bold bg-slate-900 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60 cursor-pointer"
              >
                <option value="ALL">All Reservation Statuses</option>
                <option value="CONFIRMED">Confirmed Only</option>
                <option value="PENDING">Pending Inquiries</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed Stays</option>
              </select>
            </div>

            {/* Live Metric Badges */}
            <div className="md:col-span-5 flex items-center gap-2 justify-start md:justify-end flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black shadow-xs">
                <LogIn className="h-3.5 w-3.5 text-emerald-400" />
                <span>{monthStats.totalArrivals} In</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[11px] font-black shadow-xs">
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span>{monthStats.totalDepartures} Out</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-black shadow-xs">
                <span>{formatCurrency(monthStats.totalRevenue, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SIDE-BY-SIDE VIEW: CALENDAR (LEFT) & BOOKINGS INSPECTOR (RIGHT) ── */}
      {subView === "month" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full max-w-full items-start">
          {/* ── LEFT COLUMN: CALENDAR GRID + OPERATIONS DOCK (7-8 COLS) ── */}
          <div className="lg:col-span-7 xl:col-span-8 w-full min-w-0 space-y-4">
            {/* Calendar Grid Card */}
            <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden">
            {/* Weekdays Header Strip */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-800/90 text-center text-[10.5px] font-black uppercase tracking-wider py-2.5">
              <span className="text-rose-600 dark:text-rose-400">Sun</span>
              <span className="text-slate-700 dark:text-slate-300">Mon</span>
              <span className="text-slate-700 dark:text-slate-300">Tue</span>
              <span className="text-slate-700 dark:text-slate-300">Wed</span>
              <span className="text-slate-700 dark:text-slate-300">Thu</span>
              <span className="text-slate-700 dark:text-slate-300">Fri</span>
              <span className="text-amber-600 dark:text-amber-400">Sat</span>
            </div>

            {/* 7-Column Day Card Matrix */}
            <div className="grid grid-cols-7 gap-1.5 p-2 bg-slate-50/80 dark:bg-slate-950/50">
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
                      "min-h-[88px] p-2 rounded-xl transition-all duration-150 cursor-pointer flex flex-col justify-between group relative select-none border",
                      !cell.isCurrentMonth
                        ? "bg-slate-100/40 dark:bg-slate-900/30 border-transparent opacity-40 hover:opacity-80"
                        : "bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/60 hover:border-amber-300 hover:shadow-xs",
                      cell.isSelected &&
                        "border-2 border-amber-500 bg-gradient-to-b from-amber-50/90 via-white to-amber-50/40 dark:from-amber-950/70 dark:via-slate-800 dark:to-amber-950/50 shadow-md shadow-amber-500/15 scale-[1.01] z-10",
                      cell.isToday && !cell.isSelected && "border-amber-400 bg-amber-50/25 dark:bg-amber-950/20"
                    )}
                  >
                    {/* Cell Top: Date Number & Count Badges */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-black transition-all",
                          cell.isToday
                            ? "bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/40"
                            : cell.isSelected
                            ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-black shadow-xs"
                            : "text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400"
                        )}
                      >
                        {cell.dayNum}
                      </span>

                      {totalBookingsCount > 0 && (
                        <div className="flex items-center gap-1">
                          {dayData.arrivals.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-xs" title={`${dayData.arrivals.length} arrivals`} />
                          )}
                          {dayData.departures.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-xs" title={`${dayData.departures.length} departures`} />
                          )}
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                            {totalBookingsCount}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Booking Pills */}
                    <div className="space-y-1 my-1 flex-1 overflow-hidden">
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
                              "px-1.5 py-0.5 rounded-md text-[9px] font-black truncate flex items-center gap-1 border shadow-2xs transition-all hover:scale-[1.02]",
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
                            <span className="font-mono font-black text-[8.5px] px-0.5 rounded bg-black/5 dark:bg-white/10 shrink-0">
                              {roomNo !== "Unass" ? `R${roomNo}` : "Unass"}
                            </span>
                            <span className="truncate font-bold">
                              {guestName}
                            </span>
                          </div>
                        );
                      })}

                      {totalBookingsCount > 2 && (
                        <div className="text-[8.5px] font-black text-amber-600 dark:text-amber-400 pl-0.5 flex items-center gap-0.5">
                          <Flame className="h-2 w-2" />
                          <span>+{totalBookingsCount - 2} more</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Day Indicator Pills */}
                    <div className="flex items-center justify-between text-[8px] font-extrabold text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-700/60">
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

          {/* ── HOTEL OPERATIONS & INVENTORY INTELLIGENCE DOCK (BELOW CALENDAR) ── */}
          <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
            {/* Dock Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
                  <Flame className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Front Desk Intelligence &amp; Operational Flow
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live operational metrics for {selectedDay.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link href="/front-desk">
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300">
                    <LogIn className="h-3 w-3 mr-1" />
                    Front Desk
                  </Button>
                </Link>
                <Link href="/housekeeping">
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-indigo-300 text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Housekeeping
                  </Button>
                </Link>
                <Link href="/bookings/calendar">
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200">
                    <LayoutGrid className="h-3 w-3 mr-1" />
                    Tape Chart
                  </Button>
                </Link>
              </div>
            </div>

            {/* 4 Colorful Operational Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Arrivals Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                  <span className="text-[10px] font-black uppercase tracking-wider">Arrivals</span>
                  <LogIn className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-black text-emerald-900 dark:text-emerald-200 font-mono">
                  {selectedDayData.arrivals.length}
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                  {selectedDayData.arrivals.filter((r) => r.rooms?.some((rm) => !!rm.room_number)).length} with rooms assigned
                </div>
              </div>

              {/* Departures Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/30 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-rose-800 dark:text-rose-300">
                  <span className="text-[10px] font-black uppercase tracking-wider">Departures</span>
                  <LogOut className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-black text-rose-900 dark:text-rose-200 font-mono">
                  {selectedDayData.departures.length}
                </div>
                <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                  Check-out &amp; Folio settlement
                </div>
              </div>

              {/* In-House Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/30 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-indigo-800 dark:text-indigo-300">
                  <span className="text-[10px] font-black uppercase tracking-wider">In-House</span>
                  <BedDouble className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-black text-indigo-900 dark:text-indigo-200 font-mono">
                  {selectedDayData.inHouse.length}
                </div>
                <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                  Active guest stays in rooms
                </div>
              </div>

              {/* Unassigned Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                  <span className="text-[10px] font-black uppercase tracking-wider">Unassigned</span>
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-black text-amber-900 dark:text-amber-200 font-mono">
                  {filteredReservations.filter((r) => r.rooms?.some((rm) => !rm.room_number) && r.status !== "CANCELLED").length}
                </div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  Awaiting room assignment
                </div>
              </div>
            </div>

            {/* Room Demand & Category Distribution */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-500" />
                  <span>Room Type Distribution in Current View</span>
                </span>
                <span className="text-slate-500 font-mono text-[10.5px]">
                  {filteredReservations.length} Active Bookings
                </span>
              </div>

              {/* Mini distribution bars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                {Object.entries(
                  filteredReservations.reduce<Record<string, number>>((acc, r) => {
                    r.rooms?.forEach((rm) => {
                      const name = rm.room_type_name || "Standard Room";
                      acc[name] = (acc[name] || 0) + 1;
                    });
                    return acc;
                  }, {})
                ).slice(0, 3).map(([typeName, count], idx) => {
                  const colors = [
                    "bg-amber-500 text-amber-900 border-amber-300",
                    "bg-indigo-500 text-indigo-900 border-indigo-300",
                    "bg-emerald-500 text-emerald-900 border-emerald-300",
                  ];
                  return (
                    <div
                      key={typeName}
                      className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={cn("h-2 w-2 rounded-full", colors[idx % colors.length].split(" ")[0])} />
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{typeName}</span>
                      </div>
                      <span className="font-mono font-black text-xs text-slate-900 dark:text-white pl-2">
                        {count} {count === 1 ? "stay" : "stays"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

          {/* ── RIGHT COLUMN: SELECTED DATE & BOOKINGS INSPECTOR (4-5 COLS) ── */}
          <div className="lg:col-span-5 xl:col-span-4 w-full min-w-0 space-y-3 sticky top-4">
            {/* Selected Date Header Card */}
            <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 shadow-xl space-y-3">
              {/* Day Navigation & Title */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                      {selectedDay.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {selectedDayAllBookings.length} total scheduled stays
                    </p>
                  </div>
                </div>

                {/* Day Navigation Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevDay}
                    className="h-6 w-6 p-0 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-lg"
                    title="Previous Day"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextDay}
                    className="h-6 w-6 p-0 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-lg"
                    title="Next Day"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Day Sub-Filter Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[10.5px] font-black">
                <button
                  type="button"
                  onClick={() => setDayTabFilter("ALL")}
                  className={cn(
                    "py-1 rounded-lg transition text-center",
                    dayTabFilter === "ALL"
                      ? "bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  All ({selectedDayAllBookings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDayTabFilter("ARRIVALS")}
                  className={cn(
                    "py-1 rounded-lg transition text-center text-emerald-700 dark:text-emerald-400",
                    dayTabFilter === "ARRIVALS"
                      ? "bg-emerald-500 text-slate-950 font-black shadow-xs"
                      : "hover:bg-emerald-50/50"
                  )}
                >
                  In ({selectedDayData.arrivals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDayTabFilter("IN_HOUSE")}
                  className={cn(
                    "py-1 rounded-lg transition text-center text-indigo-700 dark:text-indigo-400",
                    dayTabFilter === "IN_HOUSE"
                      ? "bg-indigo-600 text-white font-black shadow-xs"
                      : "hover:bg-indigo-50/50"
                  )}
                >
                  Stay ({selectedDayData.inHouse.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDayTabFilter("DEPARTURES")}
                  className={cn(
                    "py-1 rounded-lg transition text-center text-rose-700 dark:text-rose-400",
                    dayTabFilter === "DEPARTURES"
                      ? "bg-rose-500 text-white font-black shadow-xs"
                      : "hover:bg-rose-50/50"
                  )}
                >
                  Out ({selectedDayData.departures.length})
                </button>
              </div>

              {/* Stays List on Selected Day (Scrollable) */}
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredDayBookings.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                      <BedDouble className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      No stays matching this filter
                    </h4>
                    <p className="text-[10.5px] text-slate-500">
                      Click below to create a new reservation.
                    </p>
                    <Link href={`/bookings/new?checkIn=${selectedDayStr}`} className="inline-block pt-1">
                      <Button size="sm" className="h-7 px-3 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg">
                        + New Booking
                      </Button>
                    </Link>
                  </div>
                ) : (
                  filteredDayBookings.map(({ res, role }) => {
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
                          "p-3 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md space-y-2",
                          isCardSelected
                            ? "bg-amber-50/50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30"
                            : "bg-slate-50/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-amber-400"
                        )}
                      >
                        {/* Top: Role & Status */}
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1",
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

                        {/* Guest & Amount */}
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {guestName}
                            </h4>
                            <span className="font-mono text-xs font-black text-slate-900 dark:text-white shrink-0">
                              {formatCurrency(res.total_amount, currency)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 flex-wrap font-medium">
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded">
                              #{res.confirmation_number}
                            </span>
                            <span>•</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {roomNo ? `Room ${roomNo}` : "Unassigned"}
                            </span>
                          </div>
                        </div>

                        {/* Duration Strip */}
                        <div className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[10px]">
                          <span className="text-slate-600 dark:text-slate-300">
                            {res.check_in_date} → {res.check_out_date}
                          </span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {res.nights || 1}N
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
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
                            className="h-6 px-2 text-[10px] font-bold rounded-md text-slate-600 hover:text-slate-900"
                          >
                            Status
                          </Button>
                          <Link href={`/bookings/${res.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="h-6 px-2.5 text-[10px] font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                            >
                              <span>Inspect</span>
                              <ArrowRight className="h-2.5 w-2.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Link href={`/bookings/new?checkIn=${selectedDayStr}`} className="block">
                  <Button size="sm" className="w-full h-8 font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 text-slate-950 rounded-xl text-xs">
                    + Create Booking for {selectedDay.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. 7-DAY WEEK VIEW (GRAPHICAL HORIZONTAL GANTT STRIP) ── */}
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

      {/* ── 4. DAY OPERATIONS DESK (SWIMLANE WORKSTATION) ── */}
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
