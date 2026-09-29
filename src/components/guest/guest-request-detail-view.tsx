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
  PhoneCall,
  Share2,
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  Headphones,
  Zap,
} from "lucide-react";
import { GuestServiceRequestDetail, ServiceRequestCategory, ServiceRequestStatus } from "@/lib/guest-services/types";
import { cancelGuestServiceRequestAction, getGuestRequestLiveStatusAction } from "@/lib/guest-services/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

const CATEGORY_NAME_MAP: Record<ServiceRequestCategory, string> = {
  HOUSEKEEPING: "Housekeeping Butler",
  FRONT_DESK: "Front Desk & Reception",
  MAINTENANCE: "Engineering & Maintenance",
  LAUNDRY: "Valet & Garment Care",
  SPA: "Spa & Wellness Concierge",
  TRANSPORT: "Chauffeur & Transfers Desk",
  ROOM_SERVICE: "In-Room Dining Concierge",
  CONCIERGE: "Royal Concierge Desk",
  OTHER: "Guest Experience Team",
};

const STATUS_MESSAGES: Record<ServiceRequestStatus, string> = {
  SUBMITTED: "Your request has been received by our front desk.",
  ACKNOWLEDGED: "Concierge desk has acknowledged your request.",
  ASSIGNED: "A dedicated staff specialist has been assigned.",
  IN_PROGRESS: "Our team is actively fulfilling your request.",
  COMPLETED: "Your request has been successfully completed.",
  CANCELLED: "This request has been cancelled.",
  REJECTED: "Your request could not be completed.",
};

export function GuestRequestDetailView({ request }: GuestRequestDetailViewProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = React.useState<ServiceRequestStatus>(request.status);
  const [guestNotes, setGuestNotes] = React.useState<string | null | undefined>(request.guest_visible_notes);
  const [assignedStaffName, setAssignedStaffName] = React.useState<string | null | undefined>(request.assigned_staff_name);
  const [assignedDepartment, setAssignedDepartment] = React.useState<string | null | undefined>(request.assigned_department);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [guestFollowUpNote, setGuestFollowUpNote] = React.useState("");
  const [localFollowUps, setLocalFollowUps] = React.useState<string[]>([]);
  const [followUpSuccess, setFollowUpSuccess] = React.useState(false);

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
          if (res.assigned_staff_name !== undefined) setAssignedStaffName(res.assigned_staff_name);
          if (res.assigned_department !== undefined) setAssignedDepartment(res.assigned_department);
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

  const handleCopyRequestId = () => {
    navigator.clipboard?.writeText(request.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendFollowUp = (noteText?: string) => {
    const textToSend = (noteText || guestFollowUpNote).trim();
    if (!textToSend) return;

    setLocalFollowUps((prev) => [...prev, textToSend]);
    setGuestFollowUpNote("");
    setFollowUpSuccess(true);
    setTimeout(() => setFollowUpSuccess(false), 3000);
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

  const CategoryIcon = CATEGORY_ICON_MAP[request.category as ServiceRequestCategory] || Sparkles;
  const conciergeDeskName = CATEGORY_NAME_MAP[request.category as ServiceRequestCategory] || "Concierge Butler";

  const getStatusBadge = () => {
    if (currentStatus === "COMPLETED") {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Completed</span>
        </span>
      );
    }
    if (isCancelledOrRejected) {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-xs flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{currentStatus === "CANCELLED" ? "Cancelled" : "Declined"}</span>
        </span>
      );
    }
    if (currentStatus === "IN_PROGRESS") {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-xs flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white animate-ping" />
          <span>In Progress</span>
        </span>
      );
    }
    if (currentStatus === "ASSIGNED") {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-600 text-white shadow-xs flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Staff Assigned</span>
        </span>
      );
    }
    if (currentStatus === "ACKNOWLEDGED") {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-sky-600 text-white shadow-xs flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Acknowledged</span>
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#D4AF37] text-[#0B1526] shadow-xs flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span>Submitted</span>
      </span>
    );
  };

  const formattedRequestTime = new Date(request.requested_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-5 pb-32 max-w-lg mx-auto">
      {/* ── 1. EDITORIAL LUXURY HEADER BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#070D18] via-[#0D1829] to-[#0A1322] text-white rounded-b-[2rem] shadow-xl border-b border-[#D4AF37]/25 pb-6 pt-5 px-5">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D4AF37]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="relative z-10 space-y-3.5">
          {/* Top Bar: Back link + Suite Tag */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/requests"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-xs transition active:scale-95"
              aria-label="Back to Requests"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Requests</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-[11px] px-3 py-1 rounded-full bg-white/10 text-[#E4C980] font-semibold border border-[#D4AF37]/35 backdrop-blur-xs">
                Suite {request.room_number}
              </span>
            </div>
          </div>

          {/* Title & Live Status Pulse */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Concierge Desk Connected</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-[#E4C980] bg-white/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                {request.category}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight leading-snug">
              {request.title}
            </h1>
            <p className="text-xs text-slate-300/80 flex items-center gap-2 flex-wrap">
              <span>Service: <strong className="text-white font-semibold">{request.request_type}</strong></span>
              <span>•</span>
              <span>Requested at <strong className="text-white font-semibold">{formattedRequestTime}</strong></span>
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* ── 2. GLOWING PROGRESS TRACKER CARD ── */}
        <div className="p-4 rounded-3xl bg-white border border-[#EAE3D2] shadow-sm space-y-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#0B1526] to-[#1E293B] text-[#E4C980] border border-[#D4AF37]/30 flex items-center justify-center shrink-0 shadow-xs">
                <CategoryIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Status</span>
                <p className="text-xs font-bold text-slate-900 leading-snug">
                  {STATUS_MESSAGES[currentStatus] || `Status: ${currentStatus}`}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Stepper Milestones */}
          {!isCancelledOrRejected && (
            <div className="pt-2 border-t border-[#EAE3D2]">
              <div className="grid grid-cols-5 gap-1 pt-1">
                {stages.map((st, idx) => {
                  const Icon = st.icon;
                  const isCurrent = stage === idx + 1;
                  return (
                    <div key={st.label} className="flex flex-col items-center text-center space-y-1">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-xl flex items-center justify-center transition-all",
                          st.completed
                            ? "bg-[#0B1526] text-[#E4C980] border border-[#D4AF37]/40 shadow-2xs"
                            : "bg-slate-100 text-slate-400 border border-slate-200",
                          isCurrent && "ring-2 ring-[#D4AF37] ring-offset-1 ring-offset-white animate-pulse"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={cn(
                          "text-[8.5px] font-bold leading-tight",
                          st.completed ? "text-slate-900" : "text-slate-400"
                        )}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── 2B. ASSIGNED SERVICE SPECIALIST / BUTLER CARD ── */}
        {assignedStaffName && ["ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(currentStatus) && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0B1526] via-[#101E35] to-[#0A1424] border border-[#D4AF37]/35 shadow-md flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#AA7C11] text-[#0B1526] flex items-center justify-center font-bold shadow-md shadow-[#D4AF37]/20 shrink-0">
                  <UserCheck className="w-5 h-5 text-[#0B1526] stroke-[2.2]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0B1526]" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#E4C980] tracking-wider">
                    Assigned Specialist
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-semibold">
                    Attendant Assigned
                  </span>
                </div>
                <p className="text-sm font-serif font-bold text-white leading-tight">
                  {assignedStaffName}
                </p>
                <p className="text-[10px] text-slate-300">
                  {assignedDepartment ? `${assignedDepartment.replace("_", " ")} Department` : CATEGORY_NAME_MAP[request.category]}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#E4C980] text-[10px] font-bold">
                <Zap className="w-3 h-3 text-[#D4AF37]" />
                <span>Active Duty</span>
              </span>
            </div>
          </div>
        )}

        {/* ── 3. 5-STAR CONCIERGE LIVE CHAT & DIALOGUE ROOM ── */}
        <div className="rounded-3xl bg-gradient-to-b from-[#0B1526] via-[#0F1D33] to-[#0B1526] border border-[#D4AF37]/30 shadow-xl overflow-hidden">
          {/* Chat Room Header */}
          <div className="p-3.5 sm:p-4 bg-[#070D18]/90 border-b border-[#D4AF37]/25 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#AA7C11] text-[#0B1526] flex items-center justify-center font-bold shadow-md shadow-[#D4AF37]/20 shrink-0">
                  <Headphones className="w-5 h-5 text-[#0B1526] stroke-[2.2]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0B1526] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-serif font-bold text-white tracking-wide">
                    {conciergeDeskName}
                  </h3>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-300/80">
                  Direct In-Suite Service Desk • 24/7 Response
                </p>
              </div>
            </div>

            {/* Quick Action Dial / Share */}
            <div className="flex items-center gap-1.5">
              <a
                href="tel:0"
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#E4C980] border border-[#D4AF37]/30 flex items-center gap-1 text-[11px] font-semibold transition active:scale-95 shadow-2xs"
                title="Call Concierge Front Desk"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden sm:inline">Call Desk</span>
              </a>

              <button
                type="button"
                onClick={handleCopyRequestId}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 transition active:scale-95"
                title="Copy Request Reference"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Chat Message Stream */}
          <div className="p-4 space-y-4 max-h-[440px] overflow-y-auto bg-[radial-gradient(#152542_1px,transparent_1px)] [background-size:16px_16px] scrollbar-thin">
            {/* Timestamp separator */}
            <div className="text-center">
              <span className="text-[9.5px] font-medium text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                Today • {formattedRequestTime}
              </span>
            </div>

            {/* ── BUBBLE 1: Butler Welcome Message (Staff) ── */}
            <div className="flex items-start gap-2.5 max-w-[90%]">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#AA7C11] text-[#0B1526] flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs mt-1">
                🛎️
              </div>
              <div className="space-y-1">
                <div className="p-3.5 rounded-2xl rounded-tl-sm bg-[#13233D] border border-white/10 text-white shadow-md space-y-1.5">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                    <span className="text-[10.5px] font-bold text-[#E4C980] flex items-center gap-1 font-serif">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      <span>{conciergeDeskName}</span>
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {formattedRequestTime}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    Namaste &amp; greetings! We have registered your request for <strong className="text-[#E4C980] font-semibold">{request.title}</strong> for Suite {request.room_number}. Our team has been notified and is handling your dispatch.
                  </p>
                </div>
                <span className="text-[9px] text-slate-400 ml-1">Automated Concierge Dispatch</span>
              </div>
            </div>

            {/* ── BUBBLE 2: Guest's Request Details (Guest) ── */}
            <div className="flex items-start justify-end gap-2.5 max-w-[92%] ml-auto">
              <div className="space-y-1 text-right">
                <div className="p-3.5 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#FAF4E6] via-white to-[#F6EDE0] border border-[#D4AF37]/50 text-slate-900 shadow-md space-y-2 text-left">
                  <div className="flex items-center justify-between gap-2 border-b border-[#EAE3D2] pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A67C1E]">
                      Suite {request.room_number} Order
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {formattedRequestTime}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 font-serif">
                      {request.title}
                    </h4>
                    {request.description && (
                      <p className="text-[11.5px] text-slate-700 bg-white/80 p-2 rounded-xl border border-[#EAE3D2] leading-relaxed whitespace-pre-line">
                        &ldquo;{request.description}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[9.5px] font-semibold pt-1 text-slate-600 border-t border-[#EAE3D2]">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Folio Charge Verified
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#FAF4E6] text-[#A67C1E] border border-[#D4AF37]/30">
                      Standard Dispatch
                    </span>
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 mr-1">Sent by Suite {request.room_number}</span>
              </div>

              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-[#E4C980] border border-[#D4AF37]/30 flex items-center justify-center text-xs font-bold shrink-0 shadow-xs mt-1">
                <User className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* ── BUBBLE 3: Operational Timeline Events from Staff ── */}
            {(request.events || []).map((evt, idx) => {
              const isGuest = evt.actor_type === "GUEST";
              const timeStr = new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              if (isGuest) {
                return null; // Guest events already visualized
              }

              let statusEmoji = "📌";
              let statusHeadline = `Status Update: ${evt.to_status}`;
              let statusDesc = "Our team updated your service request status.";

              if (evt.to_status === "ACKNOWLEDGED") {
                statusEmoji = "✨";
                statusHeadline = "Request Acknowledged";
                statusDesc = "Concierge Desk has confirmed and scheduled your request.";
              } else if (evt.to_status === "ASSIGNED") {
                statusEmoji = "👤";
                statusHeadline = "Specialist Assigned";
                statusDesc = assignedStaffName
                  ? `${assignedStaffName} has been assigned to assist Suite ${request.room_number}.`
                  : "A dedicated staff member is assigned to Suite " + request.room_number + ".";
              } else if (evt.to_status === "IN_PROGRESS") {
                statusEmoji = "⚡";
                statusHeadline = "Service in Progress";
                statusDesc = "Our team is actively fulfilling your request right now.";
              } else if (evt.to_status === "COMPLETED") {
                statusEmoji = "✅";
                statusHeadline = "Service Completed";
                statusDesc = "Your request has been fulfilled. Thank you for choosing our hospitality!";
              } else if (evt.to_status === "CANCELLED" || evt.to_status === "REJECTED") {
                statusEmoji = "❌";
                statusHeadline = "Request Closed";
                statusDesc = "This request has been cancelled/closed.";
              }

              return (
                <div key={evt.id || idx} className="flex items-start gap-2.5 max-w-[90%]">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-xs mt-1">
                    {statusEmoji}
                  </div>
                  <div className="space-y-1">
                    <div className="p-3 rounded-2xl rounded-tl-sm bg-[#152745] border border-indigo-400/20 text-white shadow-md space-y-1">
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                        <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1 font-serif">
                          <span>{statusHeadline}</span>
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {timeStr}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-snug">
                        {statusDesc}
                      </p>
                    </div>
                    <span className="text-[9px] text-slate-400 ml-1">Staff Operational Update</span>
                  </div>
                </div>
              );
            })}

            {/* ── BUBBLE 4: Staff Direct Guest Visible Note ── */}
            {guestNotes && (
              <div className="flex items-start gap-2.5 max-w-[92%]">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-[#0B1526] flex items-center justify-center text-xs font-bold shrink-0 shadow-xs mt-1">
                  💬
                </div>
                <div className="space-y-1">
                  <div className="p-3.5 rounded-2xl rounded-tl-sm bg-gradient-to-br from-amber-500/20 via-[#1E293B] to-[#0F1D33] border border-amber-400/50 text-white shadow-lg space-y-1.5">
                    <div className="flex items-center justify-between gap-2 border-b border-amber-400/30 pb-1">
                      <span className="text-[10.5px] font-bold text-[#E4C980] flex items-center gap-1.5 font-serif">
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                        <span>Direct Note from Concierge</span>
                      </span>
                      <span className="text-[9px] text-amber-300 font-mono">Live</span>
                    </div>
                    <p className="text-xs text-amber-100 font-medium leading-relaxed italic">
                      &ldquo;{guestNotes}&rdquo;
                    </p>
                  </div>
                  <span className="text-[9px] text-[#E4C980] ml-1">Staff Note for Suite {request.room_number}</span>
                </div>
              </div>
            )}

            {/* ── BUBBLE 5: Local Follow-Up Notes Sent by Guest in this Session ── */}
            {localFollowUps.map((msg, idx) => (
              <div key={idx} className="flex items-start justify-end gap-2.5 max-w-[90%] ml-auto animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-1 text-right">
                  <div className="p-3 rounded-2xl rounded-tr-sm bg-[#FAF4E6] border border-[#D4AF37]/50 text-slate-900 shadow-sm text-left">
                    <div className="flex items-center justify-between gap-2 border-b border-[#EAE3D2] pb-1">
                      <span className="text-[9.5px] font-bold text-[#A67C1E]">Follow-up Note</span>
                      <span className="text-[9px] text-slate-400 font-mono">Just now</span>
                    </div>
                    <p className="text-xs text-slate-800 mt-1 leading-relaxed">
                      {msg}
                    </p>
                  </div>
                  <span className="text-[9px] text-emerald-400 mr-1">✓ Logged to concierge</span>
                </div>
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-[#E4C980] border border-[#D4AF37]/30 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                  <User className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>

          {/* ── 4. QUICK FOLLOW-UP CHAT INPUT & CHIPS ── */}
          <div className="p-3.5 bg-[#070D18] border-t border-[#D4AF37]/25 space-y-2.5">
            {followUpSuccess && (
              <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Note noted! Our concierge desk has logged your instruction.</span>
              </div>
            )}

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                "Please ring bell before entering 🔔",
                "Leave outside suite door 🚪",
                "Thank you so much! 🙏",
                "Call phone upon arrival 📱",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendFollowUp(chip)}
                  className="text-[10.5px] font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 px-2.5 py-1 rounded-full border border-white/10 whitespace-nowrap transition-transform active:scale-95 select-none"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type additional note for concierge..."
                value={guestFollowUpNote}
                onChange={(e) => setGuestFollowUpNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendFollowUp();
                  }
                }}
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"
              />
              <button
                type="button"
                onClick={() => handleSendFollowUp()}
                disabled={!guestFollowUpNote.trim()}
                className="p-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-[#0B1526] font-bold disabled:opacity-40 transition-transform active:scale-95 shadow-md shadow-[#D4AF37]/20 shrink-0"
                aria-label="Send Note"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* ── 5. ROOM & BILLING FOLIO DETAILS ── */}
        <div className="p-4 rounded-3xl bg-white border border-[#EAE3D2] space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Service Destination:</span>
            <span className="font-bold text-slate-900 font-serif">Suite {request.room_number}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-[#EAE3D2]">
            <span className="text-slate-500 font-medium">Payment Billing:</span>
            <span className="font-bold text-emerald-700">Room Folio / Direct In-Suite</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-[#EAE3D2]">
            <span className="text-slate-500 font-medium">Reference ID:</span>
            <span className="font-mono text-[11px] text-slate-600">{request.id.slice(0, 12)}...</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── 6. CANCELLATION ACTION ── */}
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
