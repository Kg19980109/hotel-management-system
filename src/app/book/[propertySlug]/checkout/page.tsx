"use client";

// ============================================================
// STAYHUB PUBLIC BOOKING CHECKOUT (Phase 21)
// Guest contact details and reservation confirmation workflow
// ============================================================

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  getPublicPropertyInfoAction,
  searchPublicAvailabilityAction,
  createPublicBookingAction,
} from "@/lib/booking/actions";
import { calculateBookingPricing } from "@/lib/booking/pricing";
import type { PublicPropertyInfo, PublicRoomType, PublicBookingPricing } from "@/lib/booking/types";
import {
  Calendar,
  Users,
  CreditCard,
  ShieldCheck,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BedDouble,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function PublicBookingCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertySlug = (params?.propertySlug as string) || "stayhub-grand";

  const roomTypeId = searchParams.get("roomTypeId") || "";
  const checkInDate = searchParams.get("checkIn") || "";
  const checkOutDate = searchParams.get("checkOut") || "";
  const adults = Number(searchParams.get("adults")) || 2;
  const children = Number(searchParams.get("children")) || 0;
  const roomsCount = Number(searchParams.get("rooms")) || 1;

  const [property, setProperty] = React.useState<PublicPropertyInfo | null>(null);
  const [selectedRoom, setSelectedRoom] = React.useState<PublicRoomType | null>(null);
  const [pricing, setPricing] = React.useState<PublicBookingPricing | null>(null);

  // Guest details form state
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [specialRequests, setSpecialRequests] = React.useState("");
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const [propRes, availRes] = await Promise.all([
          getPublicPropertyInfoAction(propertySlug),
          searchPublicAvailabilityAction(propertySlug, {
            checkInDate,
            checkOutDate,
            adults,
            children,
            roomsCount,
          }),
        ]);

        if (isMounted) {
          if (propRes.property) setProperty(propRes.property);
          const room = availRes.roomTypes.find((r) => r.id === roomTypeId) || availRes.roomTypes[0];
          if (room) {
            setSelectedRoom(room);
            const calculatedPricing = calculateBookingPricing(
              room.baseRate,
              checkInDate,
              checkOutDate,
              roomsCount,
              propRes.property?.currency || "INR"
            );
            setPricing(calculatedPricing);
          }
        }
      } catch {
        if (isMounted) setErrorMessage("Failed to load reservation checkout details.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [propertySlug, roomTypeId, checkInDate, checkOutDate, adults, children, roomsCount]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setErrorMessage("Please agree to the booking terms and cancellation policy.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createPublicBookingAction({
        propertySlug,
        roomTypeId: selectedRoom?.id || roomTypeId,
        checkInDate,
        checkOutDate,
        adults,
        children,
        roomsCount,
        guestFirstName: firstName,
        guestLastName: lastName,
        guestEmail: email,
        guestPhone: phone,
        specialRequests,
        agreedToTerms: true,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.confirmation) {
        router.push(
          `/book/${propertySlug}/confirmation/${res.confirmation.confirmationNumber}?email=${encodeURIComponent(email)}`
        );
      }
    } catch {
      setErrorMessage("Failed to process reservation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Preparing your reservation checkout...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Consumer Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Room Selection</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure 256-bit Encrypted Checkout</span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form Area (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Guest Contact Details
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Your booking confirmation will be sent to the email address provided below.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">First Name *</label>
                  <Input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. John"
                    className="text-xs bg-slate-50 rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Last Name *</label>
                  <Input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Smith"
                    className="text-xs bg-slate-50 rounded-xl h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Email Address *</label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.smith@example.com"
                  className="text-xs bg-slate-50 rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Phone Number *</label>
                <Input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="text-xs bg-slate-50 rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Special Requests (Optional)</label>
                <Textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={2}
                  placeholder="Early check-in, quiet room, high floor, dietary preferences..."
                  className="text-xs bg-slate-50 rounded-xl"
                />
              </div>

              {/* Settlement Model Notice */}
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>No Prepayment Required • Pay at Hotel</span>
                </div>
                <p className="text-[11px] text-indigo-700/90 leading-relaxed">
                  Your reservation is guaranteed. You will settle the bill directly at the hotel front desk during check-in or check-out.
                </p>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  required
                />
                <label htmlFor="terms" className="text-xs text-slate-600 leading-tight">
                  I agree to the hotel&apos;s <strong>booking terms</strong> and <strong>48-hour free cancellation policy</strong>.
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !agreedToTerms}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm h-11 rounded-xl shadow-sm gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming Reservation...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Reservation</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Summary Sidebar (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 sticky top-20">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Reservation Summary
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {property?.name}
                </h3>
                <p className="text-xs text-slate-500">{property?.address}, {property?.city}</p>
              </div>

              {/* Room & Dates Info */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <BedDouble className="w-3.5 h-3.5 text-indigo-600" />
                    Room Type
                  </span>
                  <span className="font-bold text-slate-900">{selectedRoom?.name}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Check-in
                  </span>
                  <span className="font-semibold text-slate-800">{checkInDate}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Check-out
                  </span>
                  <span className="font-semibold text-slate-800">{checkOutDate}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    Guests
                  </span>
                  <span className="font-semibold text-slate-800">
                    {adults} Adult{adults > 1 ? "s" : ""}{children > 0 ? `, ${children} Child` : ""}
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              {pricing && (
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>{pricing.currency} {pricing.nightlyRate.toFixed(2)} &times; {pricing.nights} night{pricing.nights > 1 ? "s" : ""}</span>
                    <span className="font-medium text-slate-800">{pricing.currency} {pricing.roomSubtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Taxes & Hotel Fees (18%)</span>
                    <span className="font-medium text-slate-800">{pricing.currency} {pricing.taxAmount.toFixed(2)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Total Due at Hotel</span>
                    <span className="text-xl font-black text-indigo-600">
                      {pricing.currency} {pricing.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant Confirmation & Real-time Availability</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
