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
  Loader2
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

  // Auto-unlock room session immediately upon scanning room QR
  React.useEffect(() => {
    let isMounted = true;
    if (resolution.valid && resolution.qr_type === "ROOM") {
      setLoading(true);
      void unlockSeamlessRoomSessionAction(rawToken).then((res) => {
        if (!isMounted) return;
        if (res.success) {
          router.push("/guest/home");
          router.refresh();
        } else {
          setLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [rawToken, resolution.valid, resolution.qr_type, router]);

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
      // Fallback to seamless unlock if empty
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
      <div className="p-8 text-center space-y-5 rounded-3xl bg-gradient-to-b from-[#0E1B2E] to-[#08111F] border border-slate-800 shadow-2xl max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center shadow-lg">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-white">Invalid or Expired QR Code</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {resolution.error || "This QR code is no longer active. Please scan the current QR code in your room or contact the front desk."}
          </p>
        </div>
      </div>
    );
  }

  // 2. Hotel General QR Experience
  if (resolution.qr_type === "HOTEL_GENERAL") {
    return (
      <div className="p-6 space-y-6 text-center rounded-3xl bg-gradient-to-b from-[#0E1B2E] via-[#0B1526] to-[#08111F] border border-amber-500/20 shadow-2xl max-w-md mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 mx-auto flex items-center justify-center shadow-xl shadow-amber-500/20">
          <Building2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Luxury Hotel Portal</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Welcome to {resolution.property_name}
          </h2>
          <p className="text-xs text-slate-300/80 leading-relaxed max-w-xs mx-auto">
            Explore our hotel directory, fine dining restaurants, room service menus, and guest amenities.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handlePublicEntry}
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Explore Guest Experience</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
          <span>Concierge & Front Desk: {resolution.phone || "Available 24/7"}</span>
        </div>
      </div>
    );
  }

  // 3. Room QR — Seamless Frictionless Demo Experience
  if (resolution.qr_type === "ROOM") {
    return (
      <div className="p-6 space-y-6 rounded-3xl bg-gradient-to-b from-[#0E1B2E] via-[#0B1526] to-[#08111F] border border-amber-500/20 shadow-2xl max-w-md mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-amber-500/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Room Header Hero */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Room {resolution.room_number} • {resolution.room_type || "Deluxe Suite"}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Welcome to Room {resolution.room_number}
          </h2>
          <p className="text-xs text-slate-300/80 max-w-xs mx-auto leading-relaxed">
            Instant digital portal for in-room gourmet dining, housekeeping, and concierge assistance.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Seamless Action Button */}
        <div className="space-y-3 relative z-10">
          <button
            onClick={handleSeamlessUnlock}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Entering Room {resolution.room_number}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Enter Room {resolution.room_number} Portal</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-slate-400">
            {loading ? "Establishing encrypted in-room guest session..." : "No password needed • Verified room QR scan"}
          </p>
        </div>

        {/* Service Feature Highlights */}
        <div className="grid grid-cols-1 gap-2.5 pt-2 relative z-10">
          <div className="p-3.5 rounded-2xl bg-[#08111F]/70 border border-slate-800 hover:border-amber-500/20 text-left flex items-center gap-3 transition">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              🍽️
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">In-Room Dining & Bar</p>
              <p className="text-[10px] text-slate-400">Browse live menus, order chef dishes, and track kitchen prep in real time</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#08111F]/70 border border-slate-800 hover:border-amber-500/20 text-left flex items-center gap-3 transition">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              🛎️
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">Housekeeping & Amenities</p>
              <p className="text-[10px] text-slate-400">Request extra towels, toiletries, or room cleaning with one tap</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#08111F]/70 border border-slate-800 hover:border-amber-500/20 text-left flex items-center gap-3 transition">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              ⚡
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">Maintenance & Concierge</p>
              <p className="text-[10px] text-slate-400">Direct instant alerts to hotel staff with real-time tracking</p>
            </div>
          </div>
        </div>

        {/* Optional Collapsible Manual Override */}
        <div className="pt-2 text-center relative z-10">
          {!showManualForm ? (
            <button
              type="button"
              onClick={() => setShowManualForm(true)}
              className="text-[11px] text-slate-400 hover:text-amber-300 underline transition"
            >
              Manual reservation lookup (optional)
            </button>
          ) : (
            <form onSubmit={handleVerifyStay} className="space-y-3 pt-3 border-t border-slate-800 text-left">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Confirmation Code</label>
                <input
                  type="text"
                  placeholder="e.g. GA-26-100103"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#08111F] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Submit Code
              </button>
            </form>
          )}
        </div>

        {/* Security & Privacy Notice */}
        <div className="p-3 rounded-2xl bg-[#08111F]/50 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>Encrypted Guest Access • Active In-Room Session</span>
        </div>
      </div>
    );
  }

  return null;
}
