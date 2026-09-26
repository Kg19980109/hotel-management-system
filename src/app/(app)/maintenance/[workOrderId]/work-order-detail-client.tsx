"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaintenanceWorkOrder } from "@/lib/maintenance/types";
import { StaffOption } from "@/lib/maintenance/queries";
import {
  WorkOrderStatusBadge,
  MaintenancePriorityBadge,
  MaintenanceCategoryBadge,
} from "@/components/maintenance/work-order-badge";
import { AssignWorkOrderModal } from "@/components/maintenance/assign-work-order-modal";
import { ResolveWorkOrderModal } from "@/components/maintenance/resolve-work-order-modal";
import { StatusTransitionModal, TransitionAction } from "@/components/maintenance/status-transition-modal";
import {
  CheckCircle2,
  History,
  FileText,
  UserCheck,
  PlayCircle,
  PauseCircle,
  XCircle,
  RotateCcw,
  MessageSquarePlus,
} from "lucide-react";

interface WorkOrderDetailClientProps {
  propertyId: string;
  workOrder: MaintenanceWorkOrder;
  staff: StaffOption[];
  isOverdue: boolean;
}

export function WorkOrderDetailClient({
  workOrder,
  staff,
  isOverdue,
}: WorkOrderDetailClientProps) {
  const router = useRouter();

  const [isAssignOpen, setIsAssignOpen] = React.useState(false);
  const [isResolveOpen, setIsResolveOpen] = React.useState(false);
  const [transitionAction, setTransitionAction] = React.useState<TransitionAction | null>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Status Banner & Action Buttons */}
      <div className="stayhub-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <WorkOrderStatusBadge status={workOrder.status} size="md" />
            <MaintenancePriorityBadge priority={workOrder.priority} size="md" />
            <MaintenanceCategoryBadge category={workOrder.category} size="md" />
            {isOverdue && (
              <Badge variant="danger" size="md" showDot>
                Overdue Schedule
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {workOrder.status === "OPEN" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignOpen(true)}
                className="h-9 text-xs"
              >
                <UserCheck className="h-4 w-4 mr-1.5" />
                Assign Technician
              </Button>
            )}

            {(workOrder.status === "OPEN" || workOrder.status === "ASSIGNED") && (
              <Button
                variant="primary"
                size="sm"
                className="h-9 text-xs font-bold"
                onClick={() => {
                  setTransitionAction("RESUME");
                }}
              >
                <PlayCircle className="h-4 w-4 mr-1.5" />
                Start Repair
              </Button>
            )}

            {workOrder.status === "IN_PROGRESS" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => setTransitionAction("HOLD")}
                >
                  <PauseCircle className="h-4 w-4 mr-1.5" />
                  Put On Hold
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setIsResolveOpen(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Resolve Work Order
                </Button>
              </>
            )}

            {workOrder.status === "ON_HOLD" && (
              <Button
                variant="primary"
                size="sm"
                className="h-9 text-xs font-bold"
                onClick={() => setTransitionAction("RESUME")}
              >
                <PlayCircle className="h-4 w-4 mr-1.5" />
                Resume Work
              </Button>
            )}

            {workOrder.status === "RESOLVED" && (
              <Button
                variant="primary"
                size="sm"
                className="h-9 text-xs font-bold"
                onClick={() => setTransitionAction("CLOSE")}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Close Work Order
              </Button>
            )}

            {["RESOLVED", "CLOSED", "CANCELLED"].includes(workOrder.status) && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => setTransitionAction("REOPEN")}
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Reopen
              </Button>
            )}

            {!["CLOSED", "CANCELLED"].includes(workOrder.status) && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                onClick={() => setTransitionAction("CANCEL")}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setTransitionAction("NOTE")}
            >
              <MessageSquarePlus className="h-4 w-4 mr-1.5" />
              Add Note
            </Button>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Resolution (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Description */}
          <div className="stayhub-card p-6 space-y-3">
            <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2 font-heading">
              <FileText className="h-4 w-4 text-[var(--primary)]" />
              <span>Issue Description & Symptoms</span>
            </h3>
            <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
              {workOrder.description || "No additional description provided upon creation."}
            </p>
          </div>

          {/* Resolution Notes Card (if resolved/closed) */}
          {workOrder.resolution_notes && (
            <div className="stayhub-card p-6 bg-emerald-500/10 border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2 font-heading">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Resolution Summary</span>
                </h3>
                {workOrder.resolved_at && (
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                    Resolved {new Date(workOrder.resolved_at).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-sm text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed">
                {workOrder.resolution_notes}
              </p>
            </div>
          )}

          {/* Event Timeline / Audit History */}
          <div className="stayhub-card p-6 space-y-4">
            <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2 font-heading">
              <History className="h-4 w-4 text-[var(--primary)]" />
              <span>Work Order Audit Timeline</span>
            </h3>

            {(!workOrder.events || workOrder.events.length === 0) ? (
              <p className="text-xs text-[var(--foreground-muted)]">No audit events recorded yet.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {workOrder.events.map((event) => (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-white dark:bg-slate-900 border-2 border-[var(--primary)]" />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs">
                      <span className="font-bold text-[var(--foreground)]">
                        {event.event_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[var(--foreground-muted)] font-mono text-[11px]">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    {event.notes && (
                      <p className="text-xs text-[var(--foreground-muted)] mt-1 bg-[var(--background-subtle)] p-2.5 rounded-xl border border-[var(--border)]">
                        {event.notes}
                      </p>
                    )}
                    <div className="text-[10px] text-[var(--foreground-subtle)] mt-0.5">
                      By: {event.performer?.full_name || "System"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Context & Metadata (1 col) */}
        <div className="space-y-6">
          {/* Location & Room */}
          <div className="stayhub-card p-5 space-y-3">
            <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider font-heading">
              Location & Facility
            </h3>
            {workOrder.room ? (
              <div className="p-3.5 bg-[var(--background-subtle)] rounded-xl border border-[var(--border)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold font-mono text-[var(--foreground)]">
                    Room {workOrder.room.room_number}
                  </span>
                  <Link
                    href={`/rooms/${workOrder.room.id}`}
                    className="text-xs text-[var(--primary)] hover:underline font-semibold"
                  >
                    View Room
                  </Link>
                </div>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {workOrder.room.room_type?.name || "Standard Room"} • Floor {workOrder.room.floor?.floor_number ?? 1}
                </p>
                <div className="pt-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Operational Status: </span>
                  <span className="font-semibold text-[var(--foreground)]">{workOrder.room.status}</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block">Property-Wide Area</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400">Lobby, elevator, generator, or central facility</span>
              </div>
            )}
          </div>

          {/* Assignment & Personnel */}
          <div className="stayhub-card p-5 space-y-3">
            <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider font-heading">
              Personnel
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <span className="text-[var(--foreground-muted)]">Reported By</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {workOrder.reporter?.full_name || "Staff Member"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--foreground-muted)]">Assigned Technician</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {workOrder.technician?.full_name || (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Timestamps & Scheduling */}
          <div className="stayhub-card p-5 space-y-3">
            <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider font-heading">
              Schedule & Timestamps
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--foreground-muted)]">Reported At</span>
                <span className="font-mono text-[var(--foreground)]">
                  {new Date(workOrder.reported_at).toLocaleString()}
                </span>
              </div>
              {workOrder.scheduled_for && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--foreground-muted)]">Scheduled Due</span>
                  <span className={`font-mono ${isOverdue ? "text-rose-600 font-bold" : "text-[var(--foreground)]"}`}>
                    {new Date(workOrder.scheduled_for).toLocaleString()}
                  </span>
                </div>
              )}
              {workOrder.started_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--foreground-muted)]">Started At</span>
                  <span className="font-mono text-[var(--foreground)]">
                    {new Date(workOrder.started_at).toLocaleString()}
                  </span>
                </div>
              )}
              {workOrder.resolved_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--foreground-muted)]">Resolved At</span>
                  <span className="font-mono text-emerald-600 font-semibold">
                    {new Date(workOrder.resolved_at).toLocaleString()}
                  </span>
                </div>
              )}
              {workOrder.closed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--foreground-muted)]">Closed At</span>
                  <span className="font-mono text-slate-500">
                    {new Date(workOrder.closed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AssignWorkOrderModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        workOrder={workOrder}
        staff={staff}
        onSuccess={handleRefresh}
      />

      <ResolveWorkOrderModal
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        workOrder={workOrder}
        onSuccess={handleRefresh}
      />

      <StatusTransitionModal
        isOpen={transitionAction !== null}
        onClose={() => setTransitionAction(null)}
        workOrder={workOrder}
        actionType={transitionAction || "HOLD"}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
