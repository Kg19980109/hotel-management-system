"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  PhoneCall,
  Loader2,
  BedDouble,
  UtensilsCrossed,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { GuestQrResolutionResult } from "@/lib/guest-portal/types";
import { 
  verifyStayAndCreateSessionAction, 
  establishPublicHotelSessionAction,
  unlockSeamlessRoomSessionAction
} from "@/lib/guest-portal/actions";

interface StayVerificationCardProps {
  rawToken: string;
  resolution: GuestQrResolutionResult;
}

export function StayVerificationCard({ rawToken, resolution }: StayVerificationCardProps) {
  const router = useRouter();
  const [confirmationNumber, setConfirmationNumber] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showManualForm, setShowManualForm] = React.useState(false);

  // Seamless 1-tap or automated room unlock for demo & frictionless guest experience
  const handleSeamlessUnlock = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await unlockSeamlessRoomSessionAction(rawToken);
      if (res.success) {
        router.push("/guest/home");
        router.refresh();
      } else {
        setError(res.error || "Unable to establish room session.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [rawToken, router]);

  // Auto-unlock room session immediately only IF room has an active checked-in stay
  React.useEffect(() => {
    let isMounted = true;
    if (resolution.valid && resolution.qr_type === "ROOM" && resolution.has_active_stay) {
      setLoading(true);
      void unlockSeamlessRoomSessionAction(rawToken).then((res) => {
        if (!isMounted) return;
        if (res.success) {
          router.push("/guest/home");
          router.refresh();
        } else {
          setLoading(false);
          setError(res.error || "Unable to establish room session.");
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [rawToken, resolution.valid, resolution.qr_type, resolution.has_active_stay, router]);

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

  // If manual entry fallback is used
  const handleVerifyStay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationNumber.trim()) {
      void handleSeamlessUnlock();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyStayAndCreateSessionAction({
        rawToken,
        confirmationNumber: confirmationNumber.trim(),
        lastName: undefined,
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
      <div className="p-8 text-center space-y-5 rounded-3xl bg-white border border-[#EAE3D2] shadow-xl max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-serif font-bold text-slate-900">Invalid or Expired QR Code</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {resolution.error || "This QR code is no longer active. Please scan the current QR code in your room or contact the front desk."}
          </p>
        </div>
      </div>
    );
  }

  // 2. Hotel General QR Experience
  if (resolution.qr_type === "HOTEL_GENERAL") {
    return (
      <div className="p-6 space-y-6 text-center rounded-3xl bg-white border border-[#EAE3D2] shadow-xl max-w-md mx-auto relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-[#0B1526] text-[#E4C980] border border-[#D4AF37]/35 mx-auto flex items-center justify-center shadow-md">
          <Building2 className="w-8 h-8 text-[#D4AF37]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF4E6] border border-[#D4AF37]/30 text-[#A67C1E] text-[10px] font-semibold uppercase tracking-wider font-serif">
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span>Luxury Hotel Portal</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
            Welcome to {resolution.property_name}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            Explore our hotel directory, fine dining restaurants, in-room service menus, and guest amenities.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handlePublicEntry}
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
          ) : (
            <>
              <span>Explore Guest Experience</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            </>
          )}
        </button>

        <div className="pt-4 border-t border-[#EAE3D2] text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-[#A67C1E]" />
          <span>Concierge &amp; Front Desk: {resolution.phone || "Available 24/7"}</span>
        </div>
      </div>
    );
  }

  // 3. Room QR — Seamless Frictionless Experience
  if (resolution.qr_type === "ROOM") {
    return (
      <div className="p-6 space-y-6 rounded-3xl bg-white border border-[#EAE3D2] shadow-xl max-w-md mx-auto relative overflow-hidden">
        {/* Room Header Hero */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF4E6] border border-[#D4AF37]/35 text-[#A67C1E] text-xs font-semibold uppercase tracking-wider font-serif">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Room {resolution.room_number} • {resolution.room_type || "Deluxe Suite"}
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
            {resolution.has_active_stay
              ? `Welcome to Room ${resolution.room_number}`
              : `Room ${resolution.room_number} — Check-In Required`}
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            {resolution.has_active_stay
              ? "Your private digital portal for in-room gourmet dining, housekeeping, and concierge assistance."
              : `No guest is currently checked into Room ${resolution.room_number}. Please check in at the Front Desk to activate in-room services.`}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 relative z-10">
          {resolution.has_active_stay ? (
            <button
              onClick={handleSeamlessUnlock}
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
                  <span>Entering Room {resolution.room_number}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>Enter Room {resolution.room_number} Portal</span>
                  <ArrowRight className="w-4 h-4 ml-1 text-[#D4AF37]" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handlePublicEntry}
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
              ) : (
                <>
                  <span>Browse Hotel &amp; Dining (Public View)</span>
                  <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                </>
              )}
            </button>
          )}

          <p className="text-center text-[11px] text-slate-500">
            {resolution.has_active_stay
              ? loading
                ? "Establishing encrypted in-room guest session..."
                : "Verified in-house guest • Active Room QR"
              : "Room requires staff assignment & check-in before in-room ordering"}
          </p>
        </div>

        {/* Service Feature Highlights */}
        <div className="grid grid-cols-1 gap-2.5 pt-2 relative z-10">
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2] text-left flex items-center gap-3 transition">
            <div className="w-9 h-9 rounded-xl bg-[#FAF4E6] text-[#A67C1E] border border-[#D4AF37]/30 flex items-center justify-center font-bold text-sm shrink-0">
              <UtensilsCrossed className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-900 font-serif">In-Room Dining &amp; Bar</p>
              <p className="text-[10.5px] text-slate-500">Browse live menus, order chef dishes, and track kitchen prep in real time</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2] text-left flex items-center gap-3 transition">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-900 font-serif">Housekeeping &amp; Amenities</p>
              <p className="text-[10.5px] text-slate-500">Request extra towels, toiletries, or room cleaning with one tap</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2] text-left flex items-center gap-3 transition">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-sm shrink-0">
              <KeyRound className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-900 font-serif">Maintenance &amp; Concierge</p>
              <p className="text-[10.5px] text-slate-500">Direct instant alerts to hotel staff with real-time tracking</p>
            </div>
          </div>
        </div>

        {/* Optional Collapsible Manual Override */}
        <div className="pt-2 text-center relative z-10">
          {!showManualForm ? (
            <button
              type="button"
              onClick={() => setShowManualForm(true)}
              className="text-[11px] text-slate-500 hover:text-[#A67C1E] underline transition"
            >
              Manual reservation lookup (optional)
            </button>
          ) : (
            <form onSubmit={handleVerifyStay} className="space-y-3 pt-3 border-t border-[#EAE3D2] text-left">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-serif">Confirmation Code</label>
                <input
                  type="text"
                  placeholder="e.g. GA-26-100103"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#EAE3D2] text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] uppercase font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 font-semibold text-xs transition"
              >
                Submit Code
              </button>
            </form>
          )}
        </div>

        {/* Security & Privacy Notice */}
        <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2] text-[11px] text-slate-600 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Encrypted Guest Access • Active In-Room Session</span>
        </div>
      </div>
    );
  }

  return null;
}
