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
  const [lastName, setLastName] = React.useState("");
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

  // 3. Room QR — Seamless Frictionless Demo Experience
  if (resolution.qr_type === "ROOM") {
    return (
      <div className="p-6 space-y-6">
        {/* Room Header Hero */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            Room {resolution.room_number} • {resolution.room_type || "Deluxe Ocean View Room"}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Welcome to Room {resolution.room_number}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Instant guest portal for in-room dining, housekeeping requests, and hotel services.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Seamless Action Button */}
        <div className="space-y-3">
          <button
            onClick={handleSeamlessUnlock}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Unlocking Room {resolution.room_number}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Enter Room {resolution.room_number} Portal</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-slate-500">
            {loading ? "Establishing encrypted in-room session..." : "No confirmation number required • Instant demo access"}
          </p>
        </div>

        {/* Service Feature Highlights */}
        <div className="grid grid-cols-1 gap-2 pt-2">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
              🛎️
            </div>
            <div>
              <p className="text-xs font-bold text-white">Housekeeping & Towels</p>
              <p className="text-[10px] text-slate-400">Order fresh towels, extra pillows, or room cleaning with one tap</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
              🍽️
            </div>
            <div>
              <p className="text-xs font-bold text-white">In-Room Dining</p>
              <p className="text-[10px] text-slate-400">Browse hotel menus, customize items, and track live kitchen orders</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
              ⚡
            </div>
            <div>
              <p className="text-xs font-bold text-white">Maintenance & Assistance</p>
              <p className="text-[10px] text-slate-400">Direct buzzer alerts to on-duty staff with instant acknowledgement</p>
            </div>
          </div>
        </div>

        {/* Optional Collapsible Manual Override */}
        <div className="pt-2 text-center">
          {!showManualForm ? (
            <button
              type="button"
              onClick={() => setShowManualForm(true)}
              className="text-[10px] text-slate-500 hover:text-slate-400 underline transition"
            >
              Manual reservation lookup (optional)
            </button>
          ) : (
            <form onSubmit={handleVerifyStay} className="space-y-3 pt-3 border-t border-slate-800 text-left">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Confirmation Code</label>
                <input
                  type="text"
                  placeholder="e.g. GA-26-100103"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Submit Code
              </button>
            </form>
          )}
        </div>

        {/* Security & Privacy Notice */}
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>Frictionless Guest Access • Active In-Room Session</span>
        </div>
      </div>
    );
  }

  return null;
}
