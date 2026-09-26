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
import { fetchBookings, fetchBookingKPIStats } from "@/lib/bookings/queries";
import {
  BookingKPIGrid,
  BookingFilters,
  BookingTable,
  CancelBookingModal,
  StatusChangeModal,
  AssignRoomModal,
} from "@/components/bookings";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Plus, Calendar } from "lucide-react";

export default function BookingsPage() {
  const router = useRouter();
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reservations, setReservations] = React.useState<Reservation[]>([]);
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

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      if (activePropertyId) {
        void Promise.resolve().then(() => {
          if (!isMounted) return;
          loadData();
        });
      } else {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

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
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10"
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
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.08) 0%, transparent 70%)" }}
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
              <Calendar className="h-3 w-3" />
              Reservation Command Center
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Bookings & Stays
              <span className="block text-white/50 text-base font-normal mt-0.5">
                Front Desk Reservations, Tape Chart & Guest Commitments
              </span>
            </h1>

            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-white/70">
              <div>
                <span className="font-bold text-white">{totalCount}</span> total bookings recorded
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--success)" }} />
                <span><span className="font-bold text-white">{stats.confirmed}</span> confirmed</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--warning)" }} />
                <span><span className="font-bold text-white">{stats.pending}</span> pending</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Link href="/bookings/calendar">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 border border-white/10 h-9 gap-1.5"
              >
                <Calendar className="h-4 w-4" />
                Tape Chart
              </Button>
            </Link>
            <Link href="/bookings/new">
              <Button
                variant="primary"
                size="sm"
                className="h-9 gap-1.5 shadow-md"
              >
                <Plus className="h-4 w-4" />
                New Booking
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <BookingKPIGrid stats={stats} loading={loading && reservations.length === 0} />

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

      {/* Modals */}
      <CancelBookingModal
        open={Boolean(cancelModalRes)}
        reservation={cancelModalRes}
        propertyId={activePropertyId || ""}
        onClose={() => setCancelModalRes(null)}
        onSuccess={loadData}
      />

      <StatusChangeModal
        open={Boolean(statusModalRes)}
        reservation={statusModalRes}
        propertyId={activePropertyId || ""}
        onClose={() => setStatusModalRes(null)}
        onSuccess={loadData}
      />

      {assignModalData && (
        <AssignRoomModal
          open={Boolean(assignModalData)}
          reservationId={assignModalData.reservation.id}
          reservationRoom={assignModalData.roomItem}
          propertyId={activePropertyId || ""}
          onClose={() => setAssignModalData(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
