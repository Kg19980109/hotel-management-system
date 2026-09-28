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
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Completed</span>
        </span>
      );
    }
    if (isCancelledOrRejected) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>{currentStatus === "CANCELLED" ? "Cancelled" : "Declined"}</span>
        </span>
      );
    }
    if (currentStatus === "IN_PROGRESS") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>In Progress</span>
        </span>
      );
    }
    if (currentStatus === "ASSIGNED") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-violet-400" />
          <span>Staff Assigned</span>
        </span>
      );
    }
    if (currentStatus === "ACKNOWLEDGED") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>Acknowledged</span>
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-violet-400" />
        <span>Submitted</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-28">
      {/* ── 1. LUXURY VIOLET HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B132B] border border-violet-500/30 text-white shadow-xl shadow-violet-950/40">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-violet-900/30 via-[#0B132B] to-indigo-950/40 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-600/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-6 space-y-3.5">
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/requests"
              className="inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-white transition font-medium"
              aria-label="Back to Requests"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Requests</span>
            </Link>
            <span className="text-[10.5px] uppercase font-bold text-violet-200 bg-violet-950/70 border border-violet-400/40 px-3 py-1 rounded-full">
              {request.category}
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-200 text-[10px] font-semibold tracking-wide backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Live Concierge Tracking</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight leading-snug">
              {request.title}
            </h1>
            <p className="text-xs text-slate-300/85 leading-relaxed font-sans">
              Service Type: <span className="text-violet-300 font-semibold">{request.request_type}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-w-lg mx-auto">
        {/* ── 2. HERO STATUS & STEPPER CARD ── */}
        <div className="p-5 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 shadow-lg shadow-violet-950/20 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-violet-950/60 text-violet-300 border border-violet-500/30 flex items-center justify-center shrink-0">
                <CategoryIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">Current Status</p>
                <p className="text-xs font-semibold text-white mt-0.5 font-sans">
                  {STATUS_MESSAGES[currentStatus] || `Status: ${currentStatus}`}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* 5-Stage Stepper */}
          {!isCancelledOrRejected && (
            <div className="pt-2 border-t border-violet-500/20">
              <div className="grid grid-cols-5 gap-1 pt-1">
                {stages.map((st, idx) => {
                  const Icon = st.icon;
                  const isCurrent = stage === idx + 1;
                  return (
                    <div key={st.label} className="flex flex-col items-center text-center space-y-1.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          st.completed
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-md shadow-violet-950/30"
                            : "bg-[#0B132B]/80 text-slate-500 border border-violet-500/15"
                        } ${isCurrent ? "ring-2 ring-violet-400 animate-pulse" : ""}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-[8.5px] font-semibold leading-tight ${
                          st.completed ? "text-white" : "text-slate-400"
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

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-violet-500/20 font-sans">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              <span>
                Submitted at {new Date(request.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {request.completed_at && (
              <span className="text-emerald-300 font-medium">
                Completed at {new Date(request.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* ── 3. ROOM & GUEST CONTEXT CARD ── */}
        <div className="p-4 rounded-2xl bg-[#111C38]/80 border border-violet-500/20 flex items-center justify-between shadow-md shadow-violet-950/15 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-950/60 border border-violet-500/30 text-violet-300 flex items-center justify-center shrink-0">
              <BedDouble className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">Service Location</span>
              <p className="text-xs font-semibold text-white">Room {request.room_number}</p>
            </div>
          </div>
          <span className="text-[10px] text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30">
            Verified Room Session
          </span>
        </div>

        {/* ── 4. STAFF MESSAGE / NOTES (IF AVAILABLE) ── */}
        {guestNotes && (
          <div className="p-4 rounded-2xl bg-violet-950/60 border border-violet-500/40 space-y-1.5 shadow-md shadow-violet-950/20 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase font-bold text-violet-300 tracking-wider font-sans">
              <Info className="w-3.5 h-3.5 text-violet-400" />
              <span>Message from Hotel Concierge</span>
            </div>
            <p className="text-xs text-white leading-relaxed font-sans">{guestNotes}</p>
          </div>
        )}

        {/* ── 5. ORIGINAL REQUEST DETAILS CARD ── */}
        <div className="p-5 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 space-y-3 shadow-lg shadow-violet-950/20 backdrop-blur-md">
          <div className="flex items-center gap-2 pb-2 border-b border-violet-500/20">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans">
              Request Details
            </h2>
          </div>

          <div className="space-y-2 text-xs font-sans">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Service Category:</span>
              <span className="font-semibold text-white">{request.category}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Request Type:</span>
              <span className="font-semibold text-white">{request.request_type}</span>
            </div>

            {request.description && (
              <div className="pt-2 border-t border-violet-500/20 space-y-1">
                <span className="text-[11px] text-slate-400">Guest Note / Specifications:</span>
                <p className="text-xs text-slate-200 bg-[#0B132B]/80 p-3 rounded-xl border border-violet-500/20 leading-relaxed whitespace-pre-line">
                  {request.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── 6. TIMELINE EVENTS CARD ── */}
        <div className="p-5 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 space-y-3.5 shadow-lg shadow-violet-950/20 backdrop-blur-md">
          <div className="flex items-center gap-2 pb-2 border-b border-violet-500/20">
            <Clock className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans">
              Progress Timeline
            </h2>
          </div>

          <div className="space-y-3">
            {(request.events || []).length === 0 ? (
              <div className="flex items-start gap-3 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-400 mt-1 shrink-0 ring-4 ring-violet-500/20" />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">SUBMITTED</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(request.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Request recorded in hotel system</p>
                </div>
              </div>
            ) : (
              (request.events || []).map((evt, idx) => (
                <div key={evt.id || idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-400 mt-1 shrink-0 ring-4 ring-violet-500/20" />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{evt.to_status}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {evt.actor_type === "GUEST" ? "Guest Action" : "Hotel Operations Update"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── 7. CANCELLATION ACTION ── */}
        {isCancellable && (
          <div className="pt-2">
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="w-full py-3 px-4 rounded-2xl border border-rose-500/30 text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>Cancel Service Request</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
