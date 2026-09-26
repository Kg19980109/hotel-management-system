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
  Wrench
} from "lucide-react";
import { GuestServiceRequestDetail, ServiceRequestStatus } from "@/lib/guest-services/types";
import { cancelGuestServiceRequestAction } from "@/lib/guest-services/actions";
import { createClient } from "@/lib/supabase/client";

interface GuestRequestDetailViewProps {
  request: GuestServiceRequestDetail;
}

export function GuestRequestDetailView({ request }: GuestRequestDetailViewProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = React.useState<ServiceRequestStatus>(request.status);
  const [guestNotes, setGuestNotes] = React.useState<string | null | undefined>(request.guest_visible_notes);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

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

  const isCancellable =
    currentStatus === "SUBMITTED" || currentStatus === "ACKNOWLEDGED";

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this request?")) return;

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
    { label: "Assigned", icon: UserCheck, completed: stage >= 3 },
    { label: "In Progress", icon: Wrench, completed: stage >= 4 },
    { label: "Completed", icon: CheckCircle2, completed: stage >= 5 },
  ];

  return (
    <div className="p-4 space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/requests"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Requests</span>
        </Link>
        <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
          {request.category}
        </span>
      </div>

      {/* Hero Status Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {request.request_type}
            </span>
            <h2 className="text-lg font-black text-white">{request.title}</h2>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            currentStatus === "COMPLETED"
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : isCancelledOrRejected
              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
          }`}>
            {currentStatus}
          </span>
        </div>

        {request.description && (
          <p className="text-xs text-slate-300 pt-1 border-t border-slate-800">
            {request.description}
          </p>
        )}

        {/* Live Stepper */}
        {!isCancelledOrRejected && (
          <div className="grid grid-cols-5 gap-1 pt-3 border-t border-slate-800">
            {stages.map((st, idx) => {
              const Icon = st.icon;
              const isCurrent = stage === idx + 1;
              return (
                <div key={st.label} className="flex flex-col items-center text-center space-y-1.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      st.completed
                        ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                        : "bg-slate-800 text-slate-500"
                    } ${isCurrent ? "ring-2 ring-amber-400/50 animate-pulse" : ""}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[8px] sm:text-[9px] font-semibold leading-tight ${
                      st.completed ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>
            Submitted at {new Date(request.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Room Destination */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Room</span>
            <p className="text-xs font-bold text-white">Room {request.room_number}</p>
          </div>
        </div>
      </div>

      {/* Guest-Visible Notes from Hotel Staff */}
      {guestNotes && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
          <span className="text-[10px] uppercase font-bold text-amber-400">Message from Hotel Staff</span>
          <p className="text-slate-200">{guestNotes}</p>
        </div>
      )}

      {/* Timeline Events */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Request Timeline
          </h3>
        </div>

        <div className="space-y-3">
          {(request.events || []).map((evt, idx) => (
            <div key={evt.id || idx} className="flex items-start gap-3 text-xs">
              <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{evt.to_status}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {evt.actor_type === "GUEST" ? "Guest Action" : "Hotel Operations Update"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Cancel Action */}
      {isCancellable && (
        <div className="pt-2">
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full py-3 px-4 rounded-xl border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>Cancel Request</span>
          </button>
        </div>
      )}
    </div>
  );
}
