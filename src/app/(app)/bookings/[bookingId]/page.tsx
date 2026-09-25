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
      {/* Page Header */}
      <PageHeader
        title={`Reservation: ${reservation.confirmation_number}`}
        description={`Booked for ${guestName} • ${reservation.check_in_date} to ${reservation.check_out_date}`}
        breadcrumbs={[
          { label: "Bookings", href: "/bookings" },
          { label: reservation.confirmation_number },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/bookings">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Bookings
              </Button>
            </Link>

            <Link href={`/bookings/${reservation.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusOpen(true)}
              className="gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Status
            </Button>

            {reservation.status !== "CANCELLED" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCancelOpen(true)}
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        }
      />

      {/* Top Banner / Status Overview */}
      <div className="p-4 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookingStatusBadge status={reservation.status} className="text-sm px-2.5 py-1" />
          <BookingSourceBadge source={reservation.booking_source} className="text-sm px-2.5 py-1" />
          <span className="text-xs text-[var(--foreground-muted)]">
            Booked on {new Date(reservation.booked_at).toLocaleDateString()}
          </span>
        </div>

        <div className="text-right">
          <div className="text-xs text-[var(--foreground-muted)]">Room Total</div>
          <div className="text-xl font-bold text-[var(--foreground)]">
            {formatCurrency(reservation.total_amount, currency)}
          </div>
        </div>
      </div>

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Guest & Stay Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Guest Profile Card */}
          <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-3">
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
          <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-3">
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
          <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-3">
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
          <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-3">
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
