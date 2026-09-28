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
      <div className="p-8 text-center space-y-5 rounded-3xl bg-[#111C38]/95 border border-rose-500/30 shadow-2xl shadow-violet-950/40 max-w-sm mx-auto backdrop-blur-md">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-serif font-bold text-white">Invalid or Expired QR Code</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {resolution.error || "This QR code is no longer active. Please scan the current QR code in your room or contact the front desk."}
          </p>
        </div>
      </div>
    );
  }

  // 2. Hotel General QR Experience
  if (resolution.qr_type === "HOTEL_GENERAL") {
    return (
      <div className="p-6 space-y-6 text-center rounded-3xl bg-[#111C38]/95 border border-violet-500/30 shadow-2xl shadow-violet-950/40 max-w-md mx-auto relative overflow-hidden backdrop-blur-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-violet-900/30">
          <Building2 className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/35 text-violet-200 text-[10px] font-bold uppercase tracking-wider font-sans">
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span>Luxury Hotel Portal</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
            Welcome to {resolution.property_name}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto font-sans">
            Explore our hotel directory, fine dining restaurants, in-room service menus, and guest amenities.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handlePublicEntry}
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-violet-950/40 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <>
              <span>Explore Guest Experience</span>
              <ArrowRight className="w-4 h-4 text-violet-200" />
            </>
          )}
        </button>

        <div className="pt-4 border-t border-violet-500/20 text-xs text-slate-400 flex items-center justify-center gap-1.5 font-sans">
          <PhoneCall className="w-3.5 h-3.5 text-violet-400" />
          <span>Concierge &amp; Front Desk: {resolution.phone || "Available 24/7"}</span>
        </div>
      </div>
    );
  }

  // 3. Room QR — Seamless Frictionless Experience
  if (resolution.qr_type === "ROOM") {
    return (
      <div className="p-6 space-y-6 rounded-3xl bg-[#111C38]/95 border border-violet-500/30 shadow-2xl shadow-violet-950/40 max-w-md mx-auto relative overflow-hidden backdrop-blur-md">
        {/* Room Header Hero */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/35 text-violet-200 text-xs font-bold uppercase tracking-wider font-sans">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Room {resolution.room_number} • {resolution.room_type || "Deluxe Suite"}
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
            {resolution.has_active_stay
              ? `Welcome to Room ${resolution.room_number}`
              : `Room ${resolution.room_number} — Check-In Required`}
          </h2>
          <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed font-sans">
            {resolution.has_active_stay
              ? "Your private digital portal for in-room gourmet dining, housekeeping, and concierge assistance."
              : `No guest is currently checked into Room ${resolution.room_number}. Please check in at the Front Desk to activate in-room services.`}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 relative z-10">
          {resolution.has_active_stay ? (
            <button
              onClick={handleSeamlessUnlock}
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-violet-950/40 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Entering Room {resolution.room_number}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-violet-200" />
                  <span>Enter Room {resolution.room_number} Portal</span>
                  <ArrowRight className="w-4 h-4 ml-1 text-violet-200" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handlePublicEntry}
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-violet-950/40 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Browse Hotel &amp; Dining (Public View)</span>
                  <ArrowRight className="w-4 h-4 text-violet-200" />
                </>
              )}
            </button>
          )}

          <p className="text-center text-[11px] text-slate-400 font-sans">
            {resolution.has_active_stay
              ? loading
                ? "Establishing encrypted in-room guest session..."
                : "Verified in-house guest • Active Room QR"
              : "Room requires staff assignment & check-in before in-room ordering"}
          </p>
        </div>

        {/* Service Feature Highlights */}
        <div className="grid grid-cols-1 gap-2.5 pt-2 relative z-10">
          <div className="p-3.5 rounded-2xl bg-[#0B132B]/80 border border-violet-500/20 text-left flex items-center gap-3 transition">
            <div className="w-9 h-9 rounded-xl bg-violet-950/60 text-violet-300 border border-violet-500/30 flex items-center justify-center font-bold text-sm shrink-0">
              <UtensilsCrossed className="w-4 h-4 text-violet-300" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-white font-serif">In-Room Dining &amp; Bar</p>
              <p className="text-[10.5px] text-slate-400 font-sans">Browse live menus, order chef dishes, and track kitchen prep in real time</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0B132B]/80 border border-violet-500/20 text-left flex items-center gap-3 transition">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-white font-serif">Housekeeping &amp; Amenities</p>
              <p className="text-[10.5px] text-slate-400 font-sans">Request extra towels, toiletries, or room cleaning with one tap</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0B132B]/80 border border-violet-500/20 text-left flex items-center gap-3 transition">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-sm shrink-0">
              <KeyRound className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-white font-serif">Maintenance &amp; Concierge</p>
              <p className="text-[10.5px] text-slate-400 font-sans">Direct instant alerts to hotel staff with real-time tracking</p>
            </div>
          </div>
        </div>

        {/* Optional Collapsible Manual Override */}
        <div className="pt-2 text-center relative z-10">
          {!showManualForm ? (
            <button
              type="button"
              onClick={() => setShowManualForm(true)}
              className="text-[11px] text-violet-400 hover:text-violet-300 underline transition font-medium"
            >
              Manual reservation lookup (optional)
            </button>
          ) : (
            <form onSubmit={handleVerifyStay} className="space-y-3 pt-3 border-t border-violet-500/20 text-left">
              <div className="space-y-1">
                <label className="text-[10px] text-violet-300 font-bold uppercase tracking-wider font-sans">Confirmation Code</label>
                <input
                  type="text"
                  placeholder="e.g. GA-26-100103"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B132B] border border-violet-500/25 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 uppercase font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-md shadow-violet-950/30"
              >
                Submit Code
              </button>
            </form>
          )}
        </div>

        {/* Security & Privacy Notice */}
        <div className="p-3 rounded-2xl bg-[#0B132B]/80 border border-violet-500/20 text-[11px] text-slate-300 flex items-center justify-center gap-2 font-sans">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Encrypted Guest Access • Active In-Room Session</span>
        </div>
      </div>
    );
  }

  return null;
}
