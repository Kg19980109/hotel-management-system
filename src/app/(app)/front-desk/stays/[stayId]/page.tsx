"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { fetchStayById } from "@/lib/front-desk/queries";
import type { Stay } from "@/lib/front-desk/types";
import { StayStatusBadge } from "@/components/front-desk/stay-status-badge";
import { CheckOutModal } from "@/components/front-desk/check-out-modal";
import { ReassignStayRoomModal } from "@/components/front-desk/reassign-stay-room-modal";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  ArrowLeft,
  Calendar,
  User,
  BedDouble,
  LogOut,
  ArrowRightLeft,
  FileText,
  Clock,
  ExternalLink,
  ShieldCheck,
  Receipt,
} from "lucide-react";

export default function StayDetailPage() {
  const params = useParams();
  const stayId = params?.stayId as string;

  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stay, setStay] = React.useState<Stay | null>(null);

  // Modals
  const [showCheckOut, setShowCheckOut] = React.useState(false);
  const [showReassign, setShowReassign] = React.useState(false);

  const loadStay = React.useCallback(async () => {
    if (!activePropertyId || !stayId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchStayById(supabase, activePropertyId, stayId);
      if (!data) {
        setError("Stay record not found or inaccessible for this property.");
      } else {
        setStay(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load stay record";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, stayId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && activePropertyId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadStay();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadStay]);

  if (authLoading || loading) {
    return <LoadingState message="Loading stay occupancy record..." />;
  }

  if (error || !stay) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Stay Profile"
          description="Error loading stay record"
          breadcrumbs={[
            { label: "Front Desk", href: "/front-desk" },
            { label: "Stay" },
          ]}
        />
        <ErrorState
          title="Stay Not Found"
          description={error || "The requested stay record could not be retrieved."}
          onRetry={loadStay}
        />
      </div>
    );
  }

  const guest = stay.guest;
  const guestName = guest ? `${guest.first_name} ${guest.last_name}`.trim() : "Guest";

  const checkInFormatted = stay.actual_check_in_at
    ? new Date(stay.actual_check_in_at).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  const checkOutFormatted = stay.actual_check_out_at
    ? new Date(stay.actual_check_out_at).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title={`Stay: Room ${stay.room?.room_number || "Unassigned"}`}
        description={`In-house occupancy record for ${guestName} • Status: ${stay.status}`}
        breadcrumbs={[
          { label: "Front Desk", href: "/front-desk" },
          { label: `Room ${stay.room?.room_number || "Stay"}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/front-desk">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Front Desk
              </Button>
            </Link>
            {stay.status === "CHECKED_IN" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReassign(true)}
                  className="gap-1.5"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Move Room
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCheckOut(true)}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Check Out
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Stay & Room Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Card 1: Operational Status & Stay Window */}
          <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Stay Occupancy Details</h3>
                <p className="text-xs text-slate-500">Live physical lifecycle on premises</p>
              </div>
              <StayStatusBadge status={stay.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-[var(--radius-md)] border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-semibold block mb-1">
                  Actual Check-In
                </span>
                <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  {checkInFormatted}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-[var(--radius-md)] border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-semibold block mb-1">
                  Expected Check-Out Date
                </span>
                <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                  {stay.expected_check_out_date}
                </div>
              </div>

              {stay.actual_check_out_at && (
                <div className="p-3 bg-slate-50 rounded-[var(--radius-md)] border border-slate-200 col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold block mb-1">
                    Actual Check-Out Completed
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                    <LogOut className="h-3.5 w-3.5 text-slate-500" />
                    {checkOutFormatted}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 text-xs grid grid-cols-2 gap-2 text-slate-600">
              <div>
                <span className="font-semibold text-slate-800">Occupants: </span>
                {stay.adults} Adult{stay.adults > 1 ? "s" : ""}, {stay.children} Child{stay.children === 1 ? "" : "ren"}
              </div>
              <div>
                <span className="font-semibold text-slate-800">Room Status: </span>
                <span className="font-mono">{stay.room?.status}</span>
              </div>
            </div>

            {stay.notes && (
              <div className="pt-3 border-t border-[var(--border)] text-xs">
                <span className="font-semibold text-slate-800 block mb-1">Front Desk Notes:</span>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 italic">
                  {stay.notes}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Physical Room Information */}
          <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900">Room Inventory Unit</h3>
              </div>
              {stay.room?.id && (
                <Link href={`/rooms/${stay.room.id}`}>
                  <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">
                    Room Inventory
                  </Button>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Physical Room</span>
                <span className="font-mono text-base font-bold text-slate-900">Room {stay.room?.room_number}</span>
                {stay.room?.room_name && <div className="text-slate-500 text-[11px]">{stay.room.room_name}</div>}
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Category</span>
                <span className="font-semibold text-slate-900 text-sm">
                  {stay.room?.room_type?.name} ({stay.room?.room_type?.code})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Housekeeping State</span>
                <span className="text-slate-800 font-medium">{stay.room?.housekeeping_status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current Operational State</span>
                <span className="font-medium text-emerald-700 font-mono">{stay.room?.status}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Upcoming Modules Integration Placeholders */}
          <div className="bg-white border border-dashed border-slate-300 rounded-[var(--radius-lg)] p-5 text-xs text-slate-500 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Receipt className="h-4 w-4 text-slate-400" />
              <span>Guest Folio & Room Charges (Phase 16 Preview)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Real-time room charges, restaurant POS postings, tax compliance, and guest invoice folios will integrate seamlessly here in Phase 16 (Billing, Payments & Folios).
            </p>
          </div>
        </div>

        {/* Right Column: Guest & Parent Reservation */}
        <div className="space-y-6">
          {/* Guest Profile Card */}
          <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900">Guest Information</h3>
              </div>
              {stay.guest_id && (
                <Link
                  href={`/guests/${stay.guest_id}`}
                  className="text-xs text-[var(--primary)] hover:underline font-medium flex items-center gap-1"
                >
                  CRM Profile →
                </Link>
              )}
            </div>

            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Full Name</span>
                {stay.guest_id ? (
                  <Link
                    href={`/guests/${stay.guest_id}`}
                    className="font-semibold text-[var(--primary)] hover:underline text-sm inline-block"
                  >
                    {guestName}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-900 text-sm">{guestName}</span>
                )}
              </div>

              {guest?.email && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Email</span>
                  <span className="text-slate-800">{guest.email}</span>
                </div>
              )}

              {guest?.phone && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Phone</span>
                  <span className="text-slate-800 font-mono">{guest.phone}</span>
                </div>
              )}

              {guest?.nationality && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Nationality</span>
                  <span className="text-slate-800">{guest.nationality}</span>
                </div>
              )}
            </div>
          </div>

          {/* Parent Reservation Reference Card */}
          <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900">Booking Contract</h3>
              </div>
              <Link
                href={`/bookings/${stay.reservation_id}`}
                className="text-[11px] text-[var(--primary)] hover:underline flex items-center gap-0.5"
              >
                View
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>

            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Confirmation Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {stay.reservation?.confirmation_number}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Contract Status</span>
                <span className="font-medium text-slate-800">{stay.reservation?.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Booking Window</span>
                <span className="text-slate-800">
                  {stay.reservation?.check_in_date} → {stay.reservation?.check_out_date}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Channel</span>
                <span className="text-slate-800 capitalize">
                  {stay.reservation?.booking_source.toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Invariants Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Stay Domain Separation
            </div>
            <p className="text-[11px] leading-relaxed">
              This record tracks physical in-house occupancy. Commercial folio billing, payment ledgers, and housekeeping inspection cycles operate in their respective decoupled domains.
            </p>
          </div>
        </div>
      </div>

      {/* Check Out Modal */}
      <CheckOutModal
        open={showCheckOut}
        stay={{
          stayId: stay.id,
          reservationId: stay.reservation_id,
          confirmationNumber: stay.reservation?.confirmation_number || "REF",
          guestId: stay.guest_id,
          guestName,
          roomId: stay.room_id,
          roomNumber: stay.room?.room_number || "Room",
          roomTypeName: stay.room?.room_type?.name || "Standard",
          actualCheckInAt: stay.actual_check_in_at || "",
          expectedCheckOutDate: stay.expected_check_out_date,
          adults: stay.adults,
          children: stay.children,
          status: stay.status,
          notes: stay.notes,
        }}
        propertyId={activePropertyId || ""}
        onClose={() => setShowCheckOut(false)}
        onSuccess={loadStay}
      />

      {/* Reassign Room Modal */}
      <ReassignStayRoomModal
        open={showReassign}
        stay={{
          stayId: stay.id,
          reservationId: stay.reservation_id,
          confirmationNumber: stay.reservation?.confirmation_number || "REF",
          guestId: stay.guest_id,
          guestName,
          guestPhone: stay.guest?.phone || null,
          roomId: stay.room_id,
          roomNumber: stay.room?.room_number || "Room",
          roomTypeName: stay.room?.room_type?.name || "Standard",
          actualCheckInAt: stay.actual_check_in_at || "",
          expectedCheckOutDate: stay.expected_check_out_date,
          adults: stay.adults,
          children: stay.children,
          status: stay.status,
          notes: stay.notes,
        }}
        propertyId={activePropertyId || ""}
        onClose={() => setShowReassign(false)}
        onSuccess={loadStay}
      />
    </div>
  );
}
