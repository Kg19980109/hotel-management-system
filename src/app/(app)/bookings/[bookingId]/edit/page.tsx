"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { fetchBookingById } from "@/lib/bookings/queries";
import { updateBookingAction } from "@/lib/bookings/actions";
import { BookingSource, Reservation } from "@/lib/bookings/types";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

export default function EditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reservation, setReservation] = React.useState<Reservation | null>(null);

  // Form fields
  const [checkInDate, setCheckInDate] = React.useState("");
  const [checkOutDate, setCheckOutDate] = React.useState("");
  const [adults, setAdults] = React.useState(1);
  const [children, setChildren] = React.useState(0);
  const [bookingSource, setBookingSource] = React.useState<BookingSource>("DIRECT");
  const [specialRequests, setSpecialRequests] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");

  const loadBooking = React.useCallback(async () => {
    if (!activePropertyId || !bookingId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchBookingById(supabase, activePropertyId, bookingId);
      if (!data) {
        setError("Reservation not found.");
      } else {
        setReservation(data);
        setCheckInDate(data.check_in_date);
        setCheckOutDate(data.check_out_date);
        setAdults(data.adults);
        setChildren(data.children);
        setBookingSource(data.booking_source);
        setSpecialRequests(data.special_requests || "");
        setInternalNotes(data.internal_notes || "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePropertyId || !reservation) return;

    setSaving(true);
    setError(null);

    const res = await updateBookingAction({
      bookingId: reservation.id,
      propertyId: activePropertyId,
      checkInDate,
      checkOutDate,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      bookingSource,
      specialRequests: specialRequests.trim() || null,
      internalNotes: internalNotes.trim() || null,
    });

    setSaving(false);

    if (res.success) {
      router.push(`/bookings/${reservation.id}`);
    } else {
      setError(res.error || "Failed to update reservation.");
    }
  };

  if (authLoading || loading) {
    return <LoadingState message="Loading reservation editor..." />;
  }

  if (error && !reservation) {
    return (
      <ErrorState
        title="Reservation Not Found"
        description={error}
        onRetry={loadBooking}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <PageHeader
        title={`Edit Reservation: ${reservation?.confirmation_number}`}
        description="Modify stay dates, occupant counts, booking channel, and notes."
        breadcrumbs={[
          { label: "Bookings", href: "/bookings" },
          { label: reservation?.confirmation_number || "Booking", href: `/bookings/${bookingId}` },
          { label: "Edit" },
        ]}
        actions={
          <Link href={`/bookings/${bookingId}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Cancel & Return
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-[var(--radius-lg)] text-rose-800 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-rose-900">Update Error</h4>
            <p className="mt-0.5 text-xs text-rose-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
          <h3 className="font-semibold text-sm text-[var(--foreground)] pb-2 border-b border-[var(--border)]">
            Stay Dates & Occupants
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Check-in Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Check-out Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={checkOutDate}
                min={checkInDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Adults <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Children
              </label>
              <Input
                type="number"
                min="0"
                max="6"
                value={children}
                onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
          <h3 className="font-semibold text-sm text-[var(--foreground)] pb-2 border-b border-[var(--border)]">
            Channel & Notes
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Booking Source
              </label>
              <Select
                value={bookingSource}
                onChange={(e) => setBookingSource(e.target.value as BookingSource)}
              >
                <option value="DIRECT">Direct (Front Desk)</option>
                <option value="WALK_IN">Walk-in Guest</option>
                <option value="PHONE">Phone Reservation</option>
                <option value="EMAIL">Email Inquiry</option>
                <option value="WEBSITE">Direct Brand Website</option>
                <option value="OTA">Online Travel Agent (OTA)</option>
                <option value="CORPORATE">Corporate Account</option>
                <option value="TRAVEL_AGENT">Travel Agent</option>
                <option value="OTHER">Other Channels</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Special Requests
              </label>
              <Textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Internal Staff Notes
              </label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/bookings/${bookingId}`}>
            <Button type="button" variant="outline" size="sm" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="sm" disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
