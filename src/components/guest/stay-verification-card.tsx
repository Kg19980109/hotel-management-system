"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  KeyRound, 
  User, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  PhoneCall,
  Loader2
} from "lucide-react";
import { GuestQrResolutionResult } from "@/lib/guest-portal/types";
import { 
  verifyStayAndCreateSessionAction, 
  establishPublicHotelSessionAction 
} from "@/lib/guest-portal/actions";

interface StayVerificationCardProps {
  rawToken: string;
  resolution: GuestQrResolutionResult;
}

export function StayVerificationCard({ rawToken, resolution }: StayVerificationCardProps) {
  const router = useRouter();
  const [confirmationNumber, setConfirmationNumber] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // If HOTEL_GENERAL QR, allow single-tap entry to explore the property
  const handlePublicEntry = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await establishPublicHotelSessionAction(rawToken);
      if (res.success) {
        router.push("/guest/home");
        router.refresh();
      } else {
        setError(res.error || "Unable to establish hotel session.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If ROOM QR, verify stay
  const handleVerifyStay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationNumber.trim()) {
      setError("Please enter your reservation confirmation number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyStayAndCreateSessionAction({
        rawToken,
        confirmationNumber: confirmationNumber.trim(),
        lastName: lastName.trim() || undefined,
      });

      if (res.success) {
        router.push("/guest/home");
        router.refresh();
      } else {
        setError(res.error || "Unable to verify stay details with the provided information.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Invalid or Expired QR
  if (!resolution.valid) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Invalid or Expired QR Code</h2>
        <p className="text-sm text-slate-400 max-w-xs mx-auto">
          {resolution.error || "This QR code is no longer active. Please scan an updated QR code or contact front desk for assistance."}
        </p>
      </div>
    );
  }

  // 2. Hotel General QR Experience
  if (resolution.qr_type === "HOTEL_GENERAL") {
    return (
      <div className="p-6 space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Building2 className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome to {resolution.property_name}
          </h2>
          <p className="text-sm text-slate-400">
            Explore our hotel directory, amenities, dining, and contactless guest services.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handlePublicEntry}
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Explore Hotel Portal</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
          <span>Front Desk: {resolution.phone || "Available 24/7"}</span>
        </div>
      </div>
    );
  }

  // 3. Room QR — Not Checked In
  if (resolution.qr_type === "ROOM" && !resolution.has_active_stay) {
    return (
      <div className="p-6 space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <Building2 className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 text-xs font-semibold">
            Room {resolution.room_number}
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Room is Not Currently Checked In
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            This room does not have an active guest stay recorded. If you are checking in today or need assistance, please contact the front desk.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2 text-xs">
          <div className="text-slate-400 flex justify-between">
            <span>Check-in Time</span>
            <span className="text-white font-medium">{resolution.check_in_time || "14:00"}</span>
          </div>
          <div className="text-slate-400 flex justify-between">
            <span>Check-out Time</span>
            <span className="text-white font-medium">{resolution.check_out_time || "11:00"}</span>
          </div>
          {resolution.front_desk_phone && (
            <div className="text-slate-400 flex justify-between pt-2 border-t border-slate-800">
              <span>Reception</span>
              <a href={`tel:${resolution.front_desk_phone}`} className="text-amber-400 font-semibold underline">
                {resolution.front_desk_phone}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Room QR — Active Stay Verification Form
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Room {resolution.room_number} • {resolution.room_type || "Deluxe Suite"}
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Verify Your Stay
        </h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Enter your reservation confirmation number to securely unlock in-room services and stay details.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Verification Form */}
      <form onSubmit={handleVerifyStay} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            Confirmation Number <span className="text-amber-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. RES-26-000101"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm tracking-wider uppercase"
          />
          <p className="text-[11px] text-slate-500">Found on your booking confirmation or hotel keycard folder.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Guest Last Name <span className="text-slate-500 text-[10px]">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Sharma"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Verify & Unlock Room Portal</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Privacy Notice */}
      <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-500 flex items-start gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500/70 flex-shrink-0 mt-0.5" />
        <span>Your session is securely encrypted and will automatically expire at checkout.</span>
      </div>
    </div>
  );
}
