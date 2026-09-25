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
    if (!activePropertyId) return;
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
    if (!authLoading && activePropertyId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadData();
      });
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
      {/* Header */}
      <PageHeader
        title="Bookings"
        description="Manage reservations, availability, and upcoming stays."
        breadcrumbs={[
          { label: "Operations", href: "/bookings" },
          { label: "Bookings" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/bookings/calendar">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                Tape Chart
              </Button>
            </Link>
            <Link href="/bookings/new">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Booking
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Section */}
      <BookingKPIGrid stats={stats} loading={loading && reservations.length === 0} />

      {/* Filters */}
      <BookingFilters filters={filters} onFilterChange={handleFilterChange} />

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
