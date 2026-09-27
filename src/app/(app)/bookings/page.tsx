"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import {
  Reservation,
  ReservationRoom,
  BookingKPIStats,
  BookingFilterOptions,
} from "@/lib/bookings/types";
import {
  fetchBookings,
  fetchBookingKPIStats,
  fetchMonthReservations,
} from "@/lib/bookings/queries";
import {
  BookingKPIGrid,
  BookingFilters,
  BookingTable,
  BookingMonthlyCalendar,
  CancelBookingModal,
  StatusChangeModal,
  AssignRoomModal,
} from "@/components/bookings";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  Plus,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  CalendarDays,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BookingsPage() {
  const router = useRouter();
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  // View Mode: calendar (default) or table
  const [viewMode, setViewMode] = React.useState<"calendar" | "table">("calendar");

  const [loading, setLoading] = React.useState(true);
  const [calendarLoading, setCalendarLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [reservations, setReservations] = React.useState<Reservation[]>([]);
  const [monthReservations, setMonthReservations] = React.useState<Reservation[]>([]);
  const [calendarDate, setCalendarDate] = React.useState<Date>(() => new Date());

  const [totalCount, setTotalCount] = React.useState(0);
  const [stats, setStats] = React.useState<BookingKPIStats>({
    todayArrivals: 0,
    todayDepartures: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    activeStays: 0,
    totalBookings: 0,
  });

  const [filters, setFilters] = React.useState<BookingFilterOptions>({
    search: "",
    status: "ALL",
    bookingSource: "ALL",
    datePreset: "ALL",
    page: 1,
    pageSize: 10,
  });

  // Modal states
  const [cancelModalRes, setCancelModalRes] = React.useState<Reservation | null>(null);
  const [statusModalRes, setStatusModalRes] = React.useState<Reservation | null>(null);
  const [assignModalData, setAssignModalData] = React.useState<{
    reservation: Reservation;
    roomItem: ReservationRoom;
  } | null>(null);

  // Load paginated table data & stats
  const loadData = React.useCallback(async () => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [resData, statsData] = await Promise.all([
        fetchBookings(supabase, activePropertyId, filters),
        fetchBookingKPIStats(supabase, activePropertyId),
      ]);

      setReservations(resData.reservations);
      setTotalCount(resData.total);
      setStats(statsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load reservations";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, filters, supabase]);

  // Load full month reservations for calendar
  const loadMonthData = React.useCallback(async () => {
    if (!activePropertyId) return;
    setCalendarLoading(true);

    try {
      const y = calendarDate.getFullYear();
      const m = calendarDate.getMonth();
      const startOfMonth = new Date(y, m - 1, 20).toISOString().split("T")[0];
      const endOfMonth = new Date(y, m + 2, 10).toISOString().split("T")[0];

      const data = await fetchMonthReservations(supabase, activePropertyId, startOfMonth, endOfMonth);
      setMonthReservations(data);
    } catch (err) {
      console.error("loadMonthData error:", err);
    } finally {
      setCalendarLoading(false);
    }
  }, [activePropertyId, calendarDate, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      if (activePropertyId) {
        void Promise.resolve().then(() => {
          if (!isMounted) return;
          loadData();
          loadMonthData();
        });
      } else {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData, loadMonthData]);

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (newFilters: BookingFilterOptions) => {
    setFilters(newFilters);
  };

  const currency = currentProperty?.currency || "INR";

  if (authLoading) {
    return <LoadingState message="Loading property bookings..." />;
  }

  return (
    <div className="space-y-6">
      {/* ── LUXURY BOOKINGS HERO ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10 shadow-2xl"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Ambient radial glows */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.10) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            {/* Tag */}
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.30)",
                background: "rgba(214,168,90,0.10)",
              }}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Reservation Command Center &amp; Calendar
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Bookings &amp; Stays Schedule
              <span className="block text-white/60 text-sm font-normal mt-1">
                Visual Date-Wise Booking Calendar, Front Desk Reservations &amp; In-House Stays
              </span>
            </h1>

            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-white/80">
              <div>
                <span className="font-bold text-white">{totalCount}</span> total bookings recorded
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span><span className="font-bold text-white">{stats.confirmed}</span> confirmed</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span><span className="font-bold text-white">{stats.pending}</span> pending</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                <span><span className="font-bold text-white">{stats.activeStays}</span> active in-house</span>
              </div>
            </div>
          </div>

          {/* Action buttons & View mode switcher */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* View Mode Toggle Switch */}
            <div className="flex items-center bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                  viewMode === "calendar"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-300 hover:text-white"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>Calendar View</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                  viewMode === "table"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-300 hover:text-white"
                )}
              >
                <List className="h-3.5 w-3.5" />
                <span>Table List</span>
              </button>
            </div>

            <Link href="/bookings/calendar">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/90 hover:text-white hover:bg-white/10 border border-white/15 h-9 gap-1.5 rounded-xl font-bold"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Tape Chart</span>
              </Button>
            </Link>

            <Link href="/bookings/new">
              <Button
                variant="primary"
                size="sm"
                className="h-9 gap-1.5 shadow-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl"
              >
                <Plus className="h-4 w-4" />
                <span>New Booking</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <BookingKPIGrid stats={stats} loading={loading && reservations.length === 0} />

      {/* ── MAIN CONTENT VIEW (CALENDAR VS TABLE) ── */}
      {viewMode === "calendar" ? (
        <BookingMonthlyCalendar
          reservations={monthReservations.length > 0 ? monthReservations : reservations}
          currentDate={calendarDate}
          onDateChange={setCalendarDate}
          currency={currency}
          loading={calendarLoading}
          onCancelClick={(res) => setCancelModalRes(res)}
          onStatusClick={(res) => setStatusModalRes(res)}
          onAssignRoomClick={(res, item) => setAssignModalData({ reservation: res, roomItem: item })}
        />
      ) : (
        <div className="space-y-4">
          {/* Filters in stayhub-card */}
          <div className="stayhub-card p-4">
            <BookingFilters filters={filters} onFilterChange={handleFilterChange} />
          </div>

          {/* Content Area */}
          {loading && reservations.length === 0 ? (
            <LoadingState message="Loading reservations..." />
          ) : error ? (
            <ErrorState
              title="Error Loading Reservations"
              description={error}
              onRetry={loadData}
            />
          ) : totalCount === 0 ? (
            <EmptyState
              title="No reservations found"
              description={
                filters.search || filters.status !== "ALL" || filters.bookingSource !== "ALL" || filters.datePreset !== "ALL"
                  ? "No reservations match your current filter parameters. Try clearing your search or filters."
                  : "No reservations have been recorded for this property yet. Create your first booking to start managing guest stays."
              }
              action={{
                label: "Create First Booking",
                onClick: () => router.push("/bookings/new"),
              }}
            />
          ) : (
            <BookingTable
              reservations={reservations}
              total={totalCount}
              page={filters.page || 1}
              pageSize={filters.pageSize || 10}
              onPageChange={handlePageChange}
              currency={currency}
              onCancelClick={(res) => setCancelModalRes(res)}
              onStatusClick={(res) => setStatusModalRes(res)}
              onAssignRoomClick={(res, item) => setAssignModalData({ reservation: res, roomItem: item })}
            />
          )}
        </div>
      )}

      {/* Modals */}
      <CancelBookingModal
        open={Boolean(cancelModalRes)}
        reservation={cancelModalRes}
        propertyId={activePropertyId || ""}
        onClose={() => setCancelModalRes(null)}
        onSuccess={() => {
          loadData();
          loadMonthData();
        }}
      />

      <StatusChangeModal
        open={Boolean(statusModalRes)}
        reservation={statusModalRes}
        propertyId={activePropertyId || ""}
        onClose={() => setStatusModalRes(null)}
        onSuccess={() => {
          loadData();
          loadMonthData();
        }}
      />

      {assignModalData && (
        <AssignRoomModal
          open={Boolean(assignModalData)}
          reservationId={assignModalData.reservation.id}
          reservationRoom={assignModalData.roomItem}
          propertyId={activePropertyId || ""}
          onClose={() => setAssignModalData(null)}
          onSuccess={() => {
            loadData();
            loadMonthData();
          }}
        />
      )}
    </div>
  );
}
