"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { Reservation, ReservationRoom } from "@/lib/bookings/types";
import { fetchBookingById } from "@/lib/bookings/queries";
import {
  BookingStatusBadge,
  BookingSourceBadge,
  CancelBookingModal,
  StatusChangeModal,
  AssignRoomModal,
} from "@/components/bookings";
import { StayStatusBadge } from "@/components/front-desk/stay-status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { formatCurrency } from "@/lib/dashboard/formatters";
import {
  ArrowLeft,
  Calendar,
  User,
  BedDouble,
  FileText,
  Edit2,
  XCircle,
  RefreshCw,
  Info,
  ExternalLink,
  Clock,
} from "lucide-react";

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reservation, setReservation] = React.useState<Reservation | null>(null);

  // Modals
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [assignRoomItem, setAssignRoomItem] = React.useState<ReservationRoom | null>(null);

  const loadBooking = React.useCallback(async () => {
    if (!activePropertyId || !bookingId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchBookingById(supabase, activePropertyId, bookingId);
      if (!data) {
        setError("Reservation not found or you do not have permission to view it.");
      } else {
        setReservation(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load reservation";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, bookingId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && activePropertyId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadBooking();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadBooking]);

  const currency = currentProperty?.currency || "INR";

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reservation Details"
          description="Loading reservation profile..."
          breadcrumbs={[
            { label: "Bookings", href: "/bookings" },
            { label: "Details" },
          ]}
        />
        <LoadingState message="Loading reservation details..." />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reservation Details"
          description="Error loading record"
          breadcrumbs={[
            { label: "Bookings", href: "/bookings" },
            { label: "Details" },
          ]}
        />
        <ErrorState
          title="Reservation Not Found"
          description={error || "The requested booking could not be retrieved."}
          onRetry={loadBooking}
        />
      </div>
    );
  }

  const guest = reservation.primary_guest;
  const guestName = guest ? `${guest.first_name} ${guest.last_name}`.trim() : "Guest";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── LUXURY RESERVATION DOSSIER HERO ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 py-7 border border-white/10"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Decorative ambient radial glows */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.20) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.10) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex-1 min-w-0">
            {/* Breadcrumb Context Tag */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Link
                href="/bookings"
                className="text-white/50 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Bookings
              </Link>
              <span className="text-white/30 text-xs">/</span>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-0.5 rounded-full border"
                style={{
                  color: "var(--brand-gold)",
                  borderColor: "rgba(214,168,90,0.30)",
                  background: "rgba(214,168,90,0.10)",
                }}
              >
                Reservation Dossier
              </span>
              <BookingStatusBadge status={reservation.status} className="text-xs" />
              <BookingSourceBadge source={reservation.booking_source} className="text-xs" />
            </div>

            {/* Confirmation Number Hero */}
            <h1 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight leading-none">
              {reservation.confirmation_number}
            </h1>
            <p className="text-white/70 text-sm mt-1.5 font-medium">
              Guest: <span className="text-white font-bold">{guestName}</span>
            </p>

            {/* Sub-meta */}
            <div className="flex items-center gap-4 mt-3 text-xs text-white/60 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-white/40" />
                {reservation.check_in_date} → {reservation.check_out_date} ({reservation.nights || 1} Nights)
              </span>
              <span className="text-white/20">·</span>
              <span>
                Booked on {new Date(reservation.booked_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Right: Total & Action Toolbar */}
          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block">
                Total Commitment
              </span>
              <span className="text-2xl font-bold text-white">
                {formatCurrency(reservation.total_amount, currency)}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/bookings/${reservation.id}/edit`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10 border border-white/10 h-8 gap-1"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusOpen(true)}
                className="text-white/80 hover:text-white hover:bg-white/10 border border-white/10 h-8 gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Status
              </Button>

              {reservation.status !== "CANCELLED" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelOpen(true)}
                  className="h-8 gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Guest & Stay Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Guest Profile Card */}
          <div className="stayhub-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="font-semibold text-sm text-[var(--foreground)]">Guest Profile</h3>
              </div>
              {guest?.id && (
                <Link
                  href={`/guests/${guest.id}`}
                  className="text-xs text-[var(--primary)] hover:underline font-medium flex items-center gap-1"
                >
                  View CRM Profile →
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[var(--foreground-muted)] block">Full Name</span>
                {guest?.id ? (
                  <Link
                    href={`/guests/${guest.id}`}
                    className="font-semibold text-[var(--primary)] hover:underline text-sm inline-flex items-center gap-1"
                  >
                    {guestName}
                  </Link>
                ) : (
                  <span className="font-semibold text-[var(--foreground)] text-sm">{guestName}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--foreground-muted)] block">Email</span>
                <span className="text-[var(--foreground)]">{guest?.email || "Not provided"}</span>
              </div>
              <div>
                <span className="text-[var(--foreground-muted)] block">Phone Number</span>
                <span className="text-[var(--foreground)]">{guest?.phone || "Not provided"}</span>
              </div>
              <div>
                <span className="text-[var(--foreground-muted)] block">Nationality</span>
                <span className="text-[var(--foreground)]">{guest?.nationality || "Not specified"}</span>
              </div>
            </div>
          </div>

          {/* Reserved Rooms & Allocations */}
          <div className="stayhub-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="font-semibold text-sm text-[var(--foreground)]">Reserved Room Inventory</h3>
              </div>
              <span className="text-xs text-[var(--foreground-muted)]">
                {reservation.rooms?.length || 1} Room{(reservation.rooms?.length || 1) > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {(reservation.rooms || []).map((roomItem) => (
                <div
                  key={roomItem.id}
                  className="p-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-slate-50/50 flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[var(--foreground)]">
                          {roomItem.room_number ? `Room ${roomItem.room_number}` : "Room: Unassigned"}
                        </span>
                        {roomItem.room_number ? (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Physical Room Allocated
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Awaiting Front Desk Allocation
                          </span>
                        )}
                        {roomItem.stay && (
                          <StayStatusBadge status={roomItem.stay.status} className="text-[10px] px-1.5 py-0.5" />
                        )}
                      </div>
                      <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                        Category: <span className="font-medium text-slate-800">{roomItem.room_type_name}</span> ({roomItem.room_type_code})
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <div className="font-semibold text-[var(--foreground)]">
                          {formatCurrency(roomItem.total_amount, currency)}
                        </div>
                        <div className="text-[10px] text-[var(--foreground-muted)]">
                          {formatCurrency(roomItem.nightly_rate, currency)} / night
                        </div>
                      </div>

                      {reservation.status !== "CANCELLED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAssignRoomItem(roomItem)}
                          className="text-xs h-8"
                        >
                          {roomItem.room_number ? "Change Room" : "Assign Room"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Operational Stay Lifecycle Details */}
                  {roomItem.stay ? (
                    <div className="pt-2 mt-1 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-4 text-slate-600">
                        {roomItem.stay.actual_check_in_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-emerald-600" />
                            Checked In: {new Date(roomItem.stay.actual_check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(roomItem.stay.actual_check_in_at).toLocaleDateString()})
                          </span>
                        )}
                        {roomItem.stay.actual_check_out_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            Checked Out: {new Date(roomItem.stay.actual_check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(roomItem.stay.actual_check_out_at).toLocaleDateString()})
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/front-desk/stays/${roomItem.stay.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>View Stay Console</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : reservation.status === "CONFIRMED" && (
                    <div className="pt-2 mt-1 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                      <span>Not checked in yet</span>
                      <Link
                        href="/front-desk"
                        className="text-indigo-600 hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Go to Front Desk Arrivals</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Special Requests */}
          <div className="stayhub-card p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <FileText className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="font-semibold text-sm text-[var(--foreground)]">Special Requests & Notes</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Guest Special Requests</span>
                <p className="text-[var(--foreground-muted)] bg-slate-50 p-2.5 rounded-[var(--radius-md)] border border-slate-200">
                  {reservation.special_requests || "No special requests specified."}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Internal Staff Notes</span>
                <p className="text-[var(--foreground-muted)] bg-slate-50 p-2.5 rounded-[var(--radius-md)] border border-slate-200">
                  {reservation.internal_notes || "No internal notes recorded."}
                </p>
              </div>

              {reservation.cancellation_reason && (
                <div>
                  <span className="font-semibold text-rose-700 block mb-0.5">Cancellation Reason</span>
                  <p className="text-rose-700 bg-rose-50 p-2.5 rounded-[var(--radius-md)] border border-rose-200">
                    {reservation.cancellation_reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Stay Summary & System Metadata */}
        <div className="space-y-6">
          {/* Stay Timeline Card */}
          <div className="stayhub-card p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <Calendar className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="font-semibold text-sm text-[var(--foreground)]">Stay Dates</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[var(--foreground-muted)] block">Check-in</span>
                <span className="font-semibold text-sm text-[var(--foreground)]">
                  {reservation.check_in_date}
                </span>
                <span className="text-[10px] text-slate-500 block">From 14:00 (Standard)</span>
              </div>

              <div>
                <span className="text-[var(--foreground-muted)] block">Check-out</span>
                <span className="font-semibold text-sm text-[var(--foreground)]">
                  {reservation.check_out_date}
                </span>
                <span className="text-[10px] text-slate-500 block">Until 11:00 (Standard)</span>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[var(--foreground-muted)]">Stay Duration:</span>
                <span className="font-semibold font-mono bg-slate-100 px-2 py-0.5 rounded">
                  {reservation.nights || 1} Night{(reservation.nights || 1) > 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--foreground-muted)]">Occupants:</span>
                <span className="font-semibold">
                  {reservation.adults} Adults {reservation.children > 0 ? `• ${reservation.children} Children` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Future Integration Placeholders */}
          <div className="p-5 bg-slate-50 rounded-[var(--radius-xl)] border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Info className="h-4 w-4 text-slate-600" />
              <h3 className="font-semibold text-sm text-slate-800">Operational Roadmap</h3>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2 rounded bg-white border border-slate-200">
                <span className="font-semibold text-slate-700 block">Phase 8: Front Desk & Stay Lifecycle</span>
                <span>Guest check-in, key card allocation, room moves, and check-out workflows.</span>
              </div>
              <div className="p-2 rounded bg-white border border-slate-200">
                <span className="font-semibold text-slate-700 block">Phase 16: Billing & Folios</span>
                <span>Invoice generation, split billing, payment gateway settlements, and receipts.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CancelBookingModal
        open={cancelOpen}
        reservation={reservation}
        propertyId={activePropertyId || ""}
        onClose={() => setCancelOpen(false)}
        onSuccess={loadBooking}
      />

      <StatusChangeModal
        open={statusOpen}
        reservation={reservation}
        propertyId={activePropertyId || ""}
        onClose={() => setStatusOpen(false)}
        onSuccess={loadBooking}
      />

      {assignRoomItem && (
        <AssignRoomModal
          open={Boolean(assignRoomItem)}
          reservationId={reservation.id}
          reservationRoom={assignRoomItem}
          propertyId={activePropertyId || ""}
          onClose={() => setAssignRoomItem(null)}
          onSuccess={loadBooking}
        />
      )}
    </div>
  );
}
