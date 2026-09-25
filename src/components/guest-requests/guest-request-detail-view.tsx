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
  Tag
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
  staffMembers: { id: string; full_name: string; email: string }[];
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/guest-requests">
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Requests</span>
              </Button>
            </Link>
            <span className="text-xs font-mono text-muted-foreground">
              ID: {request.id}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{request.title}</h1>
        </div>

        {/* Action Buttons Bar */}
        {!isClosed && (
          <div className="flex flex-wrap items-center gap-2">
            {request.status === "SUBMITTED" && (
              <Button
                variant="outline"
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/30 font-semibold"
                onClick={() => setActionType("ACKNOWLEDGE")}
              >
                Acknowledge
              </Button>
            )}

            <Button variant="outline" onClick={() => setIsAssignOpen(true)}>
              <UserCheck className="w-4 h-4 mr-1" />
              Assign Staff
            </Button>

            {request.status !== "IN_PROGRESS" && (
              <Button
                variant="outline"
                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border-blue-500/30"
                onClick={() => setActionType("START")}
              >
                Start Work
              </Button>
            )}

            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              onClick={() => setActionType("COMPLETE")}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Complete
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setActionType("CANCEL")}
            >
              Cancel
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30"
              onClick={() => setActionType("REJECT")}
            >
              Reject
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Request Details & Event Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Card */}
          <div className="p-6 rounded-xl bg-card border shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  Category & Type
                </span>
                <p className="text-sm font-bold text-foreground">
                  {request.category} • {request.request_type}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={request.priority === "URGENT" ? "danger" : request.priority === "HIGH" ? "warning" : "info"}>
                  {request.priority}
                </Badge>
                <Badge variant={request.status === "COMPLETED" ? "success" : request.status === "CANCELLED" || request.status === "REJECTED" ? "danger" : "warning"}>
                  {request.status}
                </Badge>
              </div>
            </div>

            {request.description && (
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  Guest Description / Instructions
                </span>
                <p className="text-sm text-foreground bg-muted/40 p-3 rounded-lg">
                  {request.description}
                </p>
              </div>
            )}

            {request.guest_visible_notes && (
              <div className="space-y-1.5">
                <span className="text-xs text-amber-500 uppercase font-bold tracking-wider">
                  Guest Portal Notice (Sent to Guest)
                </span>
                <p className="text-sm text-foreground bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                  {request.guest_visible_notes}
                </p>
              </div>
            )}

            {request.staff_notes && (
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  Internal Staff Notes
                </span>
                <p className="text-sm text-foreground bg-muted/60 p-3 rounded-lg italic">
                  {request.staff_notes}
                </p>
              </div>
            )}
          </div>

          {/* Audit Event Timeline */}
          <div className="p-6 rounded-xl bg-card border shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Operational Timeline & Audit Log
            </h3>

            <div className="space-y-4 pt-2">
              {events.map((evt, idx) => (
                <div key={evt.id || idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0 ring-4 ring-amber-500/20" />
                  <div className="space-y-1 flex-1 bg-muted/30 p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{evt.event_type} → {evt.to_status}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(evt.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Actor: <span className="font-semibold text-foreground">{evt.actor_name || evt.actor_type}</span> ({evt.actor_type})
                    </p>
                    {evt.event_note && (
                      <p className="text-xs text-foreground/90 italic pt-0.5">&quot;{evt.event_note}&quot;</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Context Cards */}
        <div className="space-y-4">
          {/* Room & Stay Context */}
          <div className="p-5 rounded-xl bg-card border shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Guest & Stay Details
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <BedDouble className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Room</span>
                  <span className="font-bold text-foreground text-sm">Room {request.room?.room_number || "—"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Guest</span>
                  <span className="font-bold text-foreground">
                    {request.guest?.first_name} {request.guest?.last_name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Stay ID</span>
                  <span className="font-mono text-muted-foreground text-[10px]">{request.stay_id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Card */}
          <div className="p-5 rounded-xl bg-card border shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Operational Assignment
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Department</span>
                <span className="font-semibold text-foreground">
                  {request.assigned_department || "Unassigned"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Assigned Staff</span>
                <span className="font-semibold text-foreground">
                  {request.assigned_staff?.full_name || "Unassigned"}
                </span>
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
