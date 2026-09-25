"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { getRoomTypeAvailability } from "@/lib/bookings/queries";
import { createBookingAction } from "@/lib/bookings/actions";
import { BookingSource, RoomTypeAvailability } from "@/lib/bookings/types";
import { GuestLookup } from "@/components/guests/guest-lookup";
import { GuestCRM } from "@/lib/guests/types";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { formatCurrency } from "@/lib/dashboard/formatters";
import {
  Calendar,
  BedDouble,
  User,
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function NewBookingPage() {
  const router = useRouter();
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  // Step 1: Dates
  const [checkInDate, setCheckInDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [checkOutDate, setCheckOutDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });

  // Step 2: Guests count
  const [adults, setAdults] = React.useState(1);
  const [children, setChildren] = React.useState(0);

  // Step 3: Room selection
  const [roomTypes, setRoomTypes] = React.useState<RoomTypeAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = React.useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = React.useState<string>("");
  const [selectedPhysicalRoomId, setSelectedPhysicalRoomId] = React.useState<string>("");
  const [customRate, setCustomRate] = React.useState<number | "">("");

  // Step 4: Guest information
  const [selectedGuest, setSelectedGuest] = React.useState<GuestCRM | null>(null);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [nationality, setNationality] = React.useState("");

  const handleSelectGuest = (guest: GuestCRM | null) => {
    setSelectedGuest(guest);
    if (guest) {
      setFirstName(guest.first_name || "");
      setLastName(guest.last_name || "");
      setEmail(guest.email || "");
      setPhone(guest.phone || "");
      setNationality(guest.nationality || "");
    }
  };

  // Step 5: Booking Details
  const [bookingSource, setBookingSource] = React.useState<BookingSource>("DIRECT");
  const [specialRequests, setSpecialRequests] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");

  // Status & submission
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Calculate nights
  const nights = React.useMemo(() => {
    const d1 = new Date(checkInDate);
    const d2 = new Date(checkOutDate);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }, [checkInDate, checkOutDate]);

  // Load room availability whenever dates change
  const loadAvailability = React.useCallback(async () => {
    if (!activePropertyId || !checkInDate || !checkOutDate) return;
    setLoadingAvailability(true);
    try {
      const types = await getRoomTypeAvailability(supabase, activePropertyId, checkInDate, checkOutDate);
      setRoomTypes(types);

      if (!selectedRoomTypeId && types.length > 0) {
        setSelectedRoomTypeId(types[0].roomTypeId);
        setCustomRate(types[0].baseRate);
      } else {
        const found = types.find((t) => t.roomTypeId === selectedRoomTypeId);
        if (found) {
          setCustomRate(found.baseRate);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load availability:", err);
    } finally {
      setLoadingAvailability(false);
    }
  }, [activePropertyId, checkInDate, checkOutDate, selectedRoomTypeId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && activePropertyId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadAvailability();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadAvailability]);

  const handleRoomTypeChange = (typeId: string) => {
    setSelectedRoomTypeId(typeId);
    setSelectedPhysicalRoomId("");
    const found = roomTypes.find((t) => t.roomTypeId === typeId);
    if (found) {
      setCustomRate(found.baseRate);
    }
  };

  const selectedType = roomTypes.find((t) => t.roomTypeId === selectedRoomTypeId);
  const currency = currentProperty?.currency || "INR";
  const effectiveRate = Number(customRate) || (selectedType?.baseRate || 0);
  const totalAmount = effectiveRate * nights;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePropertyId) return;

    if (!selectedRoomTypeId) {
      setError("Please select a room category.");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("Guest first name and last name are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await createBookingAction({
      propertyId: activePropertyId,
      guestId: selectedGuest?.id,
      checkInDate,
      checkOutDate,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      bookingSource,
      specialRequests: specialRequests.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      guest: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        nationality: nationality.trim() || undefined,
      },
      rooms: [
        {
          roomTypeId: selectedRoomTypeId,
          roomId: selectedPhysicalRoomId ? selectedPhysicalRoomId : null,
          adults: Number(adults) || 1,
          children: Number(children) || 0,
          nightlyRate: effectiveRate,
        },
      ],
    });

    setSubmitting(false);

    if (res.success && res.data) {
      router.push(`/bookings/${res.data.bookingId}`);
    } else {
      setError(res.error || "Failed to create reservation.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title="Create New Reservation"
        description="Book a new guest stay, allocate room inventory, and lock in rates."
        breadcrumbs={[
          { label: "Bookings", href: "/bookings" },
          { label: "New Booking" },
        ]}
        actions={
          <Link href="/bookings">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back to Bookings
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-[var(--radius-lg)] text-rose-800 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-rose-900">Reservation Validation Error</h4>
            <p className="mt-0.5 text-xs text-rose-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Stay Dates & Occupants */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
            <Calendar className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="font-semibold text-sm text-[var(--foreground)]">Stay Dates & Occupants</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                Adults (Age 12+) <span className="text-red-500">*</span>
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

          <div className="pt-2 text-xs text-[var(--foreground-muted)] flex items-center gap-2">
            <span className="font-medium text-slate-800">Stay Duration:</span>
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
              {nights} Night{nights > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Section 2: Room Category & Assignment */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="font-semibold text-sm text-[var(--foreground)]">Room Category & Assignment</h3>
            </div>
            {loadingAvailability && (
              <span className="text-xs text-[var(--primary)] animate-pulse">
                Checking availability...
              </span>
            )}
          </div>

          {roomTypes.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] text-xs text-slate-600">
              No room types configured. Please configure room categories in{" "}
              <Link href="/rooms/types" className="text-[var(--primary)] underline font-medium">
                Room Types
              </Link>{" "}
              first.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {roomTypes.map((t) => {
                const isSelected = selectedRoomTypeId === t.roomTypeId;
                const isSoldOut = t.availableRooms === 0;

                return (
                  <div
                    key={t.roomTypeId}
                    onClick={() => !isSoldOut && handleRoomTypeChange(t.roomTypeId)}
                    className={`p-3.5 rounded-[var(--radius-lg)] border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[var(--primary)] bg-indigo-50/40 ring-2 ring-indigo-200"
                        : isSoldOut
                        ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                        : "border-[var(--border)] bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs text-[var(--foreground)]">
                        {t.roomTypeName}
                      </span>
                      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-100 text-slate-700">
                        {t.roomTypeCode}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[var(--foreground)] mt-2">
                      {formatCurrency(t.baseRate, currency)}{" "}
                      <span className="text-[10px] font-normal text-[var(--foreground-muted)]">
                        / night
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border)] text-[11px]">
                      <span className="text-[var(--foreground-muted)]">Max {t.maxOccupancy} Guests</span>
                      <span
                        className={`font-semibold ${
                          t.availableRooms > 0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {t.availableRooms > 0 ? `${t.availableRooms} Available` : "Sold Out"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Physical Room Assignment (Optional) */}
          {selectedType && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--border)]">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                  Specific Physical Room (Optional)
                </label>
                <Select
                  value={selectedPhysicalRoomId}
                  onChange={(e) => setSelectedPhysicalRoomId(e.target.value)}
                >
                  <option value="">-- Unassigned (Assign at Front Desk) --</option>
                  {selectedType.physicalRooms.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      Room {rm.room_number} {rm.room_name ? `(${rm.room_name})` : ""}{" "}
                      {rm.floor_name ? `• ${rm.floor_name}` : ""}
                    </option>
                  ))}
                </Select>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                  You can allocate a physical room number now or leave unassigned for front desk arrival allocation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                  Nightly Rate Override ({currency})
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value === "" ? "" : parseFloat(e.target.value))}
                />
                <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                  Defaults to category base rate ({formatCurrency(selectedType.baseRate, currency)}).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Guest Profile Details */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="font-semibold text-sm text-[var(--foreground)]">Primary Guest Details</h3>
            </div>
            {selectedGuest && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                Existing Guest Selected
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
              Search Existing Guest (CRM Lookup)
            </label>
            <GuestLookup
              propertyId={activePropertyId || ""}
              selectedGuest={selectedGuest}
              onSelectGuest={handleSelectGuest}
              placeholder="Type guest name, email, or phone number to search CRM..."
            />
          </div>

          <div className="pt-2 border-t border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--foreground-muted)] mb-3">
              {selectedGuest ? "Guest details auto-populated from CRM (editable):" : "Or enter guest contact details directly to register:"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john.doe@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Phone Number
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Nationality
              </label>
              <Input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="e.g. Indian, American, British"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Channel & Notes */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
            <FileText className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="font-semibold text-sm text-[var(--foreground)]">Booking Source & Notes</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Booking Source
              </label>
              <Select
                value={bookingSource}
                onChange={(e) => setBookingSource(e.target.value as BookingSource)}
              >
                <option value="DIRECT">Direct (Front Desk Walk-in / Direct Call)</option>
                <option value="WALK_IN">Walk-In Guest</option>
                <option value="PHONE">Phone Reservation</option>
                <option value="EMAIL">Email Inquiry</option>
                <option value="WEBSITE">Direct Brand Website</option>
                <option value="OTA">Online Travel Agent (OTA)</option>
                <option value="CORPORATE">Corporate Contract</option>
                <option value="TRAVEL_AGENT">Travel Agent</option>
                <option value="OTHER">Other Channels</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Special Requests (Guest Facing)
              </label>
              <Textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="e.g. Quiet room requested, high floor, extra pillows..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Internal Staff Notes (Private)
              </label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="e.g. VIP returning customer, corporate billing approval pending..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Section 5: Rate Calculation & Confirm */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <span className="font-semibold text-sm text-[var(--foreground)]">Reservation Summary & Subtotal</span>
            <span className="text-xs text-[var(--foreground-muted)]">
              {nights} night{nights > 1 ? "s" : ""} × {formatCurrency(effectiveRate, currency)}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-2">
            <div>
              <div className="text-xs text-[var(--foreground-muted)]">Estimated Room Subtotal</div>
              <div className="text-xs text-slate-500">Taxes, incidentals & billing folios handled in Phase 16</div>
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">
              {formatCurrency(totalAmount, currency)}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Link href="/bookings">
              <Button type="button" variant="outline" size="sm" disabled={submitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !selectedRoomTypeId || roomTypes.length === 0}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? "Confirming Reservation..." : "Confirm & Create Booking"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
