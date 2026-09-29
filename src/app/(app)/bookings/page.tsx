"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
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

// Light components loaded eagerly (needed on first paint)
import { BookingKPIGrid, BookingFilters } from "@/components/bookings";

// Heavy view components — lazy-loaded so the initial page JS bundle is smaller
const BookingMonthlyCalendar = dynamic(
  () => import("@/components/bookings").then((m) => ({ default: m.BookingMonthlyCalendar })),
  { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /> }
);
const BookingTable = dynamic(
  () => import("@/components/bookings").then((m) => ({ default: m.BookingTable })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /> }
);
const CancelBookingModal = dynamic(
  () => import("@/components/bookings").then((m) => ({ default: m.CancelBookingModal })),
  { ssr: false }
);
const StatusChangeModal = dynamic(
  () => import("@/components/bookings").then((m) => ({ default: m.StatusChangeModal })),
  { ssr: false }
);
const AssignRoomModal = dynamic(
  () => import("@/components/bookings").then((m) => ({ default: m.AssignRoomModal })),
  { ssr: false }
);

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
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

export default function BookingsPage() {
  return (
    <RoutePermissionGuard permission="bookings.view" moduleName="Reservations & Bookings">
      <BookingsContent />
    </RoutePermissionGuard>
  );
}

function BookingsContent() {
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
    <div className="space-y-4">
      {/* ── TOP VIEW SWITCHER & QUICK STATS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-900 border border-white/10 shadow-lg text-white">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle Switch */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition",
                viewMode === "calendar"
                  ? "bg-amber-500 text-slate-950 shadow-md scale-[1.02]"
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
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition",
                viewMode === "table"
                  ? "bg-amber-500 text-slate-950 shadow-md scale-[1.02]"
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
              className="text-white/90 hover:text-white hover:bg-white/10 border border-white/15 h-8 gap-1.5 rounded-xl font-bold text-xs"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Tape Chart</span>
            </Button>
          </Link>

          <Link href="/bookings/new">
            <Button
              variant="primary"
              size="sm"
              className="h-8 gap-1.5 shadow-md bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Booking</span>
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-300 pr-2 flex-wrap">
          <div>
            <span className="font-bold text-white">{totalCount}</span> Total Stays
          </div>
          <span className="text-white/20">·</span>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-bold text-white">{stats.confirmed}</span> confirmed
          </div>
          <span className="text-white/20">·</span>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            <span className="font-bold text-white">{stats.activeStays}</span> in-house
          </div>
        </div>
      </div>

      {/* KPI Section when in table view */}
      {viewMode === "table" && (
        <BookingKPIGrid stats={stats} loading={loading && reservations.length === 0} />
      )}

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
