"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2, 
  UserCheck, 
  BedDouble, 
  User, 
  Tag,
  Clock,
  Sparkles,
  Wrench,
  Utensils,
  Car,
  Shirt,
  Flower2,
  Compass,
  BellRing,
  AlertCircle,
  FileText,
  Play,
  Inbox,
  MessageSquare
} from "lucide-react";
import { 
  StaffGuestServiceRequest, 
  StaffGuestServiceRequestEvent 
} from "@/lib/guest-services/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssignRequestModal } from "./assign-request-modal";
import { StatusActionModal, StatusActionType } from "./status-action-modal";

interface GuestRequestDetailViewProps {
  propertyId: string;
  request: StaffGuestServiceRequest;
  events: StaffGuestServiceRequestEvent[];
  staffMembers: {
    id: string;
    full_name: string;
    email: string;
    department_code?: string;
    department_name?: string;
    designation?: string;
  }[];
}

export function StaffGuestRequestDetailView({
  propertyId,
  request,
  events,
  staffMembers,
}: GuestRequestDetailViewProps) {
  const router = useRouter();

  const [isAssignOpen, setIsAssignOpen] = React.useState(false);
  const [actionType, setActionType] = React.useState<StatusActionType | null>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  const isClosed =
    request.status === "COMPLETED" ||
    request.status === "CANCELLED" ||
    request.status === "REJECTED";

  const getCategoryIcon = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case "HOUSEKEEPING":
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case "MAINTENANCE":
        return <Wrench className="w-4 h-4 text-blue-400" />;
      case "ROOM_SERVICE":
      case "FOOD":
      case "DINING":
        return <Utensils className="w-4 h-4 text-amber-400" />;
      case "LAUNDRY":
        return <Shirt className="w-4 h-4 text-indigo-400" />;
      case "SPA":
        return <Flower2 className="w-4 h-4 text-pink-400" />;
      case "TRANSPORT":
        return <Car className="w-4 h-4 text-teal-400" />;
      case "FRONT_DESK":
        return <BedDouble className="w-4 h-4 text-amber-400" />;
      case "CONCIERGE":
        return <Compass className="w-4 h-4 text-purple-400" />;
      default:
        return <BellRing className="w-4 h-4 text-violet-400" />;
    }
  };

  // Stepper logic
  const steps = [
    { key: "SUBMITTED", label: "Submitted", icon: Inbox },
    { key: "ACKNOWLEDGED", label: "Acknowledged", icon: CheckCircle2 },
    { key: "ASSIGNED", label: "Assigned", icon: UserCheck },
    { key: "IN_PROGRESS", label: "In Progress", icon: Play },
    { key: "COMPLETED", label: "Completed", icon: CheckCircle2 },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return 0;
      case "ACKNOWLEDGED":
        return 1;
      case "ASSIGNED":
        return 2;
      case "IN_PROGRESS":
        return 3;
      case "COMPLETED":
        return 4;
      default:
        return -1;
    }
  };

  const currentStepIdx = getStepIndex(request.status);
  const isTerminalCancelled = request.status === "CANCELLED" || request.status === "REJECTED";

  return (
    <div className="space-y-6">
      {/* 1. Luxury Dossier Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#08111F] via-[#0D172E] to-[#111A3C] p-6 lg:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_50%)]" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/guest-requests">
                <Button variant="ghost" size="sm" className="h-8 px-2.5 gap-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-xs">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All Requests</span>
                </Button>
              </Link>
              {request.category === "HOUSEKEEPING" || request.category === "LAUNDRY" ? (
                <Link href="/housekeeping?tab=guest_requests">
                  <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5 text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl text-xs">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Housekeeping Queue</span>
                  </Button>
                </Link>
              ) : request.category === "MAINTENANCE" ? (
                <Link href="/maintenance?tab=guest_requests">
                  <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5 text-blue-300 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl text-xs">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Maintenance Queue</span>
                  </Button>
                </Link>
              ) : null}

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#E5C158] text-xs font-bold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                Request #{request.id.slice(-6).toUpperCase()}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">
                Created: {new Date(request.requested_at).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-white/10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/10">
                  {getCategoryIcon(request.category)}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {request.category} • {request.request_type}
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                {request.title}
              </h1>
            </div>

            {/* Action Buttons Bar */}
            {!isClosed && (
              <div className="flex flex-wrap items-center gap-2">
                {request.status === "SUBMITTED" && (
                  <Button
                    variant="outline"
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 font-bold text-xs h-9 px-4 rounded-xl"
                    onClick={() => setActionType("ACKNOWLEDGE")}
                  >
                    Accept
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className="bg-white/10 hover:bg-white/15 text-white border-white/20 font-semibold text-xs h-9 px-3.5 rounded-xl"
                  onClick={() => setIsAssignOpen(true)}
                >
                  <UserCheck className="w-4 h-4 mr-1.5" />
                  Assign Staff
                </Button>

                {request.status !== "IN_PROGRESS" && (
                  <Button
                    variant="outline"
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/40 font-semibold text-xs h-9 px-3.5 rounded-xl"
                    onClick={() => setActionType("START")}
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Start Work
                  </Button>
                )}

                <Button
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-9 px-4 rounded-xl shadow-lg shadow-emerald-900/30"
                  onClick={() => setActionType("COMPLETE")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Complete Request
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="h-9 px-3 text-xs rounded-xl font-semibold opacity-90 hover:opacity-100"
                  onClick={() => setActionType("CANCEL")}
                >
                  Cancel
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs rounded-xl text-rose-300 border-rose-500/30 hover:bg-rose-500/10 font-semibold"
                  onClick={() => setActionType("REJECT")}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Visual Operational Lifecycle Stepper */}
      <div className="stayhub-card p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Request Lifecycle Progress
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base font-black text-foreground">Current State:</span>
              <Badge variant={request.status === "COMPLETED" ? "success" : isTerminalCancelled ? "danger" : "warning"} className="font-bold text-xs uppercase">
                {request.status}
              </Badge>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority Rating</span>
            <div className="mt-0.5">
              <Badge variant={request.priority === "URGENT" ? "danger" : request.priority === "HIGH" ? "warning" : "info"} className="font-bold">
                {request.priority}
              </Badge>
            </div>
          </div>
        </div>

        {isTerminalCancelled ? (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-xs font-bold text-destructive uppercase tracking-wider">Request Closed as {request.status}</p>
              <p className="text-xs text-muted-foreground">This guest request was concluded before standard operational completion.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {steps.map((st, idx) => {
              const isPassed = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              const Icon = st.icon;

              return (
                <div
                  key={st.key}
                  className={`p-3.5 rounded-xl border transition-all text-center space-y-1.5 ${
                    isCurrent
                      ? "bg-primary/10 border-primary text-primary font-bold shadow-sm ring-2 ring-primary/20"
                      : isPassed
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "bg-muted/30 border-border/60 text-muted-foreground/60"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : isPassed
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-[11px] uppercase tracking-wider font-bold">{st.label}</p>
                  <span className="text-[10px] block opacity-80 font-mono">
                    {isCurrent ? "Active Step" : isPassed ? "Completed" : `Step ${idx + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Main Grid: Details & Audit Trail vs Context Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Request Details & Event Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Request Dossier Card */}
          <div className="stayhub-card p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  Request Classification
                </span>
                <p className="text-sm font-bold text-foreground">
                  {request.category} • {request.request_type}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  Service Window
                </span>
                <p className="text-xs font-mono text-foreground font-semibold">
                  Received {new Date(request.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            {/* Live Guest In-Suite Messages / Follow-ups */}
            {(() => {
              const guestNotesList = events.filter(
                (e) => (e.actor_type === "GUEST" || e.event_type === "NOTE_ADDED") && !!e.event_note
              );
              if (guestNotesList.length === 0) return null;

              return (
                <div className="space-y-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-500 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5 font-serif">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Live Guest In-Suite Messages ({guestNotesList.length})
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                      Real-time Direct Chat
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {guestNotesList.map((e, idx) => (
                      <div key={e.id || idx} className="p-3 rounded-lg bg-background/90 border border-amber-500/20 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-[10.5px] text-muted-foreground border-b border-border/40 pb-1">
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {e.actor_name || "Guest (Suite " + (request.room?.room_number || "") + ")"}
                          </span>
                          <span className="font-mono text-[10px]">
                            {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-xs text-foreground font-semibold leading-relaxed pt-0.5 whitespace-pre-line">
                          &ldquo;{e.event_note}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {request.description && (
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Guest Instructions & Details
                </span>
                <p className="text-sm text-foreground bg-muted/40 p-4 rounded-xl border border-border/60 leading-relaxed font-medium whitespace-pre-line">
                  {request.description}
                </p>
              </div>
            )}

            {request.guest_visible_notes && (
              <div className="space-y-1.5">
                <span className="text-xs text-amber-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5" />
                  Guest Portal Notice (Visible on Guest Mobile Device)
                </span>
                <p className="text-sm text-foreground bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl leading-relaxed">
                  {request.guest_visible_notes}
                </p>
              </div>
            )}

            {request.staff_notes && (
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  Internal Staff Notes
                </span>
                <p className="text-sm text-foreground bg-muted/60 p-4 rounded-xl italic border border-border/60">
                  {request.staff_notes}
                </p>
              </div>
            )}
          </div>

          {/* Audit Event Timeline */}
          <div className="stayhub-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Operational Timeline & Audit Log ({events.length})
              </h3>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">Immutable Log</span>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">
                No lifecycle events recorded yet.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {events.map((evt, idx) => (
                  <div key={evt.id || idx} className="flex items-start gap-3.5 text-xs">
                    <div className="w-3 h-3 rounded-full bg-[#D4AF37] mt-1 shrink-0 ring-4 ring-[#D4AF37]/20" />
                    <div className="space-y-1.5 flex-1 bg-muted/30 p-3.5 rounded-xl border border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs">
                          {evt.event_type} → <span className="text-primary font-bold">{evt.to_status}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Actor: <span className="font-semibold text-foreground">{evt.actor_name || evt.actor_type}</span> ({evt.actor_type})
                      </p>
                      {evt.event_note && (
                        <p className="text-xs text-foreground/90 italic pt-1 bg-background/50 p-2 rounded-lg border border-border/40">
                          &quot;{evt.event_note}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Context Cards */}
        <div className="space-y-6">
          {/* Room & Stay Context */}
          <div className="stayhub-card p-5 space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-2 border-b border-border">
              Guest & Stay Details
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <BedDouble className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Room Destination</span>
                  <span className="font-black text-foreground text-base">Room {request.room?.room_number || "—"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Registered Guest</span>
                  <span className="font-bold text-foreground text-sm">
                    {request.guest?.first_name} {request.guest?.last_name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Stay ID</span>
                  <span className="font-mono text-muted-foreground text-[10px]">{request.stay_id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Assignment Card */}
          <div className="stayhub-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Operational Assignment
              </h3>
              {!isClosed && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 text-[11px] text-primary hover:text-primary font-bold px-1.5"
                  onClick={() => setIsAssignOpen(true)}
                >
                  Change
                </Button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Assigned Department</span>
                <span className="font-bold text-foreground text-sm">
                  {request.assigned_department || "Unassigned"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Assigned Staff</span>
                <span className="font-bold text-foreground text-sm">
                  {request.assigned_staff?.full_name || "Unassigned"}
                </span>
                {request.assigned_staff?.email && (
                  <span className="text-muted-foreground block text-[11px]">{request.assigned_staff.email}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {isAssignOpen && (
        <AssignRequestModal
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          request={request}
          propertyId={propertyId}
          staffMembers={staffMembers}
          onAssigned={handleRefresh}
        />
      )}

      {/* Status Action Modal */}
      {actionType && (
        <StatusActionModal
          isOpen={!!actionType}
          onClose={() => setActionType(null)}
          request={request}
          propertyId={propertyId}
          actionType={actionType}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
