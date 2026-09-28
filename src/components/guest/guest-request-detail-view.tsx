"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Clock, 
  BedDouble, 
  Sparkles, 
  XCircle, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  UserCheck,
  Wrench,
  Shirt,
  Flower2,
  Car,
  Utensils,
  Compass,
  Crown,
  BellRing,
  Info,
  Check,
} from "lucide-react";
import { GuestServiceRequestDetail, ServiceRequestCategory, ServiceRequestStatus } from "@/lib/guest-services/types";
import { cancelGuestServiceRequestAction, getGuestRequestLiveStatusAction } from "@/lib/guest-services/actions";
import { createClient } from "@/lib/supabase/client";

interface GuestRequestDetailViewProps {
  request: GuestServiceRequestDetail;
}

const CATEGORY_ICON_MAP: Record<ServiceRequestCategory, React.ComponentType<{ className?: string }>> = {
  HOUSEKEEPING: Sparkles,
  FRONT_DESK: BedDouble,
  MAINTENANCE: Wrench,
  LAUNDRY: Shirt,
  SPA: Flower2,
  TRANSPORT: Car,
  ROOM_SERVICE: Utensils,
  CONCIERGE: Compass,
  OTHER: Crown,
};

const STATUS_MESSAGES: Record<ServiceRequestStatus, string> = {
  SUBMITTED: "Your request has been received.",
  ACKNOWLEDGED: "Our team has acknowledged your request.",
  ASSIGNED: "A team member has been assigned.",
  IN_PROGRESS: "Our team is currently handling your request.",
  COMPLETED: "Your request has been completed.",
  CANCELLED: "This request has been cancelled.",
  REJECTED: "Your request could not be completed.",
};

export function GuestRequestDetailView({ request }: GuestRequestDetailViewProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = React.useState<ServiceRequestStatus>(request.status);
  const [guestNotes, setGuestNotes] = React.useState<string | null | undefined>(request.guest_visible_notes);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const currentStatusRef = React.useRef(currentStatus);

  React.useEffect(() => {
    currentStatusRef.current = currentStatus;
  }, [currentStatus]);

  // Real-time listener for live status updates without browser refresh
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`stayhub:guest-request:${request.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "guest_service_requests",
          filter: `id=eq.${request.id}`,
        },
        (payload) => {
          const updated = payload.new as {
            status?: ServiceRequestStatus;
            guest_visible_notes?: string | null;
          };
          if (updated.status) {
            setCurrentStatus(updated.status);
          }
          if (updated.guest_visible_notes !== undefined) {
            setGuestNotes(updated.guest_visible_notes);
          }
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [request.id, router]);

  // Guaranteed live path: secure server-action poll (validates httpOnly
  // session cookie + RPC). Updates stepper the moment staff changes status.
  React.useEffect(() => {
    const isTerminal = ["COMPLETED", "CANCELLED", "REJECTED"].includes(currentStatusRef.current);
    if (isTerminal) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const currentTerminal = ["COMPLETED", "CANCELLED", "REJECTED"].includes(currentStatusRef.current);
      if (currentTerminal) {
        if (timer) clearInterval(timer);
        return;
      }

      try {
        const res = await getGuestRequestLiveStatusAction(request.id);
        if (res.success) {
          if (res.status && res.status !== currentStatusRef.current) {
            setCurrentStatus(res.status as ServiceRequestStatus);
            router.refresh(); // pull fresh timeline events only when status changes
          }
          if (res.guest_visible_notes !== undefined) setGuestNotes(res.guest_visible_notes);
        }
      } catch {
        // offline — next tick retries
      }
    };

    timer = setInterval(() => void poll(), 8000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [request.id, router]);

  const isCancellable =
    currentStatus === "SUBMITTED" || currentStatus === "ACKNOWLEDGED";

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this service request?")) return;

    setIsCancelling(true);
    setErrorMsg(null);

    const res = await cancelGuestServiceRequestAction(
      request.id,
      "Cancelled by guest"
    );

    setIsCancelling(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to cancel request.");
      return;
    }

    setCurrentStatus("CANCELLED");
    router.refresh();
  };

  // Determine Stepper Stage: 1 = Submitted, 2 = Acknowledged, 3 = Assigned, 4 = In Progress, 5 = Completed
  let stage = 1;
  if (currentStatus === "ACKNOWLEDGED") stage = 2;
  else if (currentStatus === "ASSIGNED") stage = 3;
  else if (currentStatus === "IN_PROGRESS") stage = 4;
  else if (currentStatus === "COMPLETED") stage = 5;

  const isCancelledOrRejected = currentStatus === "CANCELLED" || currentStatus === "REJECTED";

  const stages = [
    { label: "Submitted", icon: Clock, completed: stage >= 1 },
    { label: "Acknowledged", icon: Sparkles, completed: stage >= 2 },
    { label: "Staff Assigned", icon: UserCheck, completed: stage >= 3 },
    { label: "In Progress", icon: Wrench, completed: stage >= 4 },
    { label: "Completed", icon: CheckCircle2, completed: stage >= 5 },
  ];

  const CategoryIcon = CATEGORY_ICON_MAP[request.category as ServiceRequestCategory] || Sparkles;

  const getStatusBadge = () => {
    if (currentStatus === "COMPLETED") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Completed</span>
        </span>
      );
    }
    if (isCancelledOrRejected) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>{currentStatus === "CANCELLED" ? "Cancelled" : "Declined"}</span>
        </span>
      );
    }
    if (currentStatus === "IN_PROGRESS") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>In Progress</span>
        </span>
      );
    }
    if (currentStatus === "ASSIGNED") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Staff Assigned</span>
        </span>
      );
    }
    if (currentStatus === "ACKNOWLEDGED") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>Acknowledged</span>
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF4E6] text-[#A67C1E] border border-[#D4AF37]/40 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-[#A67C1E]" />
        <span>Submitted</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-28">
      {/* ── 1. EDITORIAL HEADER BANNER ── */}
      <div className="relative overflow-hidden bg-[#0B1526] text-white">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0B1526] via-[#111D31] to-[#0B1526]">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6 space-y-3.5">
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/requests"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
              aria-label="Back to Requests"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Requests</span>
            </Link>
            <span className="text-[10.5px] uppercase font-semibold text-[#E4C980] bg-white/10 border border-[#D4AF37]/35 px-3 py-1 rounded-full">
              {request.category}
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-[#D4AF37]/35 text-[#E4C980] text-[10px] font-medium tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Live Concierge Tracking</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-serif font-semibold text-white tracking-tight leading-snug">
              {request.title}
            </h1>
            <p className="text-xs text-slate-300/80 leading-relaxed">
              Service Type: <span className="text-[#E4C980] font-medium">{request.request_type}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 max-w-lg mx-auto">
        {/* ── 2. HERO STATUS & STEPPER CARD ── */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/40 border border-purple-200/90 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25 flex items-center justify-center shrink-0">
                <CategoryIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">Current Status</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {STATUS_MESSAGES[currentStatus] || `Status: ${currentStatus}`}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* 5-Stage Stepper */}
          {!isCancelledOrRejected && (
            <div className="pt-2 border-t border-purple-200/70">
              <div className="grid grid-cols-5 gap-1 pt-1">
                {stages.map((st, idx) => {
                  const Icon = st.icon;
                  const isCurrent = stage === idx + 1;
                  return (
                    <div key={st.label} className="flex flex-col items-center text-center space-y-1.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          st.completed
                            ? "bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-bold shadow-xs"
                            : "bg-purple-100/50 text-slate-400 border border-purple-200/60"
                        } ${isCurrent ? "ring-2 ring-purple-500 animate-pulse" : ""}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-[8.5px] font-bold leading-tight ${
                          st.completed ? "text-slate-900" : "text-slate-400"
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-purple-200/60">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>
                Submitted at {new Date(request.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {request.completed_at && (
              <span className="text-emerald-700 font-bold">
                Completed at {new Date(request.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* ── 3. ROOM & GUEST CONTEXT CARD ── */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border border-emerald-200/90 flex items-center justify-between shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-600" />
          <div className="flex items-center gap-3 pt-0.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0">
              <BedDouble className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Service Location</span>
              <p className="text-xs font-bold text-slate-900">Room {request.room_number}</p>
            </div>
          </div>
          <span className="text-[10px] text-emerald-800 font-bold px-2.5 py-1 rounded-full bg-emerald-100/90 border border-emerald-300/80">
            Verified Room Session
          </span>
        </div>

        {/* ── 4. STAFF MESSAGE / NOTES (IF AVAILABLE) ── */}
        {guestNotes && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 border border-amber-300/90 space-y-1.5 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase font-bold text-amber-800 tracking-wider font-serif pt-0.5">
              <Info className="w-3.5 h-3.5 text-amber-600" />
              <span>Message from Hotel Concierge</span>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-semibold">{guestNotes}</p>
          </div>
        )}

        {/* ── 5. ORIGINAL REQUEST DETAILS CARD ── */}
        <div className="p-5 rounded-3xl bg-white border border-[#EAE3D2] space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-[#EAE3D2]">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
              Request Details
            </h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Service Category:</span>
              <span className="font-bold text-slate-900">{request.category}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Request Type:</span>
              <span className="font-bold text-slate-900">{request.request_type}</span>
            </div>

            {request.description && (
              <div className="pt-2 border-t border-[#EAE3D2]/70 space-y-1">
                <span className="text-[11px] text-slate-500">Guest Note / Specifications:</span>
                <p className="text-xs text-slate-800 bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE3D2] leading-relaxed whitespace-pre-line">
                  {request.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── 6. TIMELINE EVENTS CARD ── */}
        <div className="p-5 rounded-3xl bg-white border border-[#EAE3D2] space-y-3.5 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-[#EAE3D2]">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
              Progress Timeline
            </h2>
          </div>

          <div className="space-y-3">
            {(request.events || []).length === 0 ? (
              <div className="flex items-start gap-3 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-600 mt-1 shrink-0 ring-4 ring-purple-500/20" />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">SUBMITTED</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(request.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Request recorded in hotel system</p>
                </div>
              </div>
            ) : (
              (request.events || []).map((evt, idx) => (
                <div key={evt.id || idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-600 mt-1 shrink-0 ring-4 ring-purple-500/20" />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{evt.to_status}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {evt.actor_type === "GUEST" ? "Guest Action" : "Hotel Operations Update"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── 7. CANCELLATION ACTION ── */}
        {isCancellable && (
          <div className="pt-2">
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="w-full py-3 px-4 rounded-2xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold text-xs transition active:scale-95 duration-75 tap-active disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xs"
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>Cancel Service Request</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
