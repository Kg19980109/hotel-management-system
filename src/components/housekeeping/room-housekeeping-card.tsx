"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  TaskStatusBadge,
  PriorityBadge,
} from "./task-status-badge";
import { AssignTaskModal } from "./assign-task-modal";
import { InspectionModal } from "./inspection-modal";
import {
  HousekeepingTask,
  HousekeepingInspection,
  StaffOption,
} from "@/lib/housekeeping/types";
import {
  startHousekeepingTaskAction,
  completeHousekeepingTaskAction,
  createHousekeepingTaskAction,
} from "@/lib/housekeeping/actions";
import {
  Sparkles,
  Play,
  CheckCheck,
  ClipboardCheck,
  PlusCircle,
  History,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface RoomHousekeepingCardProps {
  roomId: string;
  propertyId: string;
  roomStatus: string;
  housekeepingStatus: string;
  activeTask: HousekeepingTask | null;
  history: HousekeepingTask[];
  inspections: HousekeepingInspection[];
  staffList: StaffOption[];
}

export function RoomHousekeepingCard({
  roomId,
  propertyId,
  roomStatus,
  housekeepingStatus,
  activeTask,
  history,
  inspections,
  staffList,
}: RoomHousekeepingCardProps) {
  const router = useRouter();
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [inspectModalOpen, setInspectModalOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleStartTask = async () => {
    if (!activeTask) return;
    setActionLoading(true);
    await startHousekeepingTaskAction({ propertyId, taskId: activeTask.id });
    setActionLoading(false);
    router.refresh();
  };

  const handleCompleteTask = async () => {
    if (!activeTask) return;
    setActionLoading(true);
    await completeHousekeepingTaskAction({ propertyId, taskId: activeTask.id });
    setActionLoading(false);
    router.refresh();
  };

  const handleCreateQuickTask = async () => {
    setActionLoading(true);
    await createHousekeepingTaskAction({
      propertyId,
      roomId,
      taskType: "CLEANING",
      priority: "NORMAL",
    });
    setActionLoading(false);
    router.refresh();
  };

  return (
    <Card className="p-6 bg-white border border-[var(--border)] shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Housekeeping & Cleaning Operations
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Real-time room cleanliness and task lifecycle
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--foreground-muted)]">Room:</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {roomStatus} / {housekeepingStatus}
          </span>
        </div>
      </div>

      {/* Active Cleaning Task Section */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-3">
          Active Cleaning Task
        </h4>

        {activeTask ? (
          <div className="bg-slate-50 p-4 rounded-xl border border-[var(--border)] space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--foreground)]">
                    {activeTask.task_type.replace(/_/g, " ")}
                  </span>
                  <PriorityBadge priority={activeTask.priority} />
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Scheduled for {activeTask.scheduled_for}
                </p>
              </div>

              <TaskStatusBadge status={activeTask.status} />
            </div>

            {/* Assigned Staff */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Avatar
                  src={activeTask.assigned_profile?.avatar_url || undefined}
                  name={activeTask.assigned_profile?.full_name || "Unassigned"}
                  size="sm"
                />
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)]">
                    {activeTask.assigned_profile?.full_name || "Unassigned"}
                  </p>
                  <p className="text-[10px] text-[var(--foreground-subtle)]">
                    {activeTask.assigned_profile ? "Assigned Staff" : "Not yet assigned"}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAssignModalOpen(true)}
                className="text-xs h-7 text-indigo-600"
              >
                {activeTask.assigned_to ? "Reassign" : "Assign Staff"}
              </Button>
            </div>

            {activeTask.notes && (
              <p className="text-xs italic text-[var(--foreground-muted)] bg-white p-2.5 rounded border border-slate-200">
                &quot;{activeTask.notes}&quot;
              </p>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex gap-2">
              {activeTask.status === "PENDING" || activeTask.status === "ASSIGNED" ? (
                <Button
                  variant="primary"
                  className="w-full text-xs font-semibold"
                  disabled={actionLoading}
                  onClick={handleStartTask}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                  Start Cleaning
                </Button>
              ) : activeTask.status === "IN_PROGRESS" ? (
                <Button
                  variant="primary"
                  className="w-full text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={actionLoading}
                  onClick={handleCompleteTask}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1.5" />}
                  Complete Cleaning & Send to Inspection
                </Button>
              ) : activeTask.status === "INSPECTION_PENDING" ? (
                <Button
                  variant="primary"
                  className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setInspectModalOpen(true)}
                >
                  <ClipboardCheck className="h-4 w-4 mr-1.5" />
                  Perform Room Inspection
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-[var(--border)] text-center">
            <p className="text-xs text-[var(--foreground-muted)] mb-3">
              No active cleaning task for this room.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={handleCreateQuickTask}
              className="text-xs"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
              Create Cleaning Task
            </Button>
          </div>
        )}
      </div>

      {/* History & Inspection Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
        {/* Cleaning History */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5 mb-2">
            <History className="h-3.5 w-3.5 text-indigo-500" />
            Recent Cleaning Tasks
          </h4>
          {history.length === 0 ? (
            <p className="text-xs text-[var(--foreground-subtle)] italic py-2">
              No past cleaning history.
            </p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg border border-[var(--border)] bg-slate-50/50 text-xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-semibold text-[var(--foreground)]">
                      {item.task_type}
                    </span>
                    <p className="text-[10px] text-[var(--foreground-subtle)]">
                      {new Date(item.created_at).toLocaleDateString()} by {item.assigned_profile?.full_name || "Staff"}
                    </p>
                  </div>
                  <TaskStatusBadge status={item.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inspection History */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5 mb-2">
            <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" />
            Inspection Records
          </h4>
          {inspections.length === 0 ? (
            <p className="text-xs text-[var(--foreground-subtle)] italic py-2">
              No inspection records yet.
            </p>
          ) : (
            <div className="space-y-2">
              {inspections.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg border border-[var(--border)] bg-slate-50/50 text-xs flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-1">
                      {item.result === "PASSED" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      )}
                      <span className="font-semibold text-[var(--foreground)]">
                        {item.result}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--foreground-subtle)]">
                      {new Date(item.inspected_at).toLocaleDateString()} by {item.inspector_profile?.full_name || "Inspector"}
                    </p>
                  </div>
                  {item.notes && (
                    <span className="text-[10px] text-[var(--foreground-muted)] truncate max-w-[120px]" title={item.notes}>
                      {item.notes}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeTask && (
        <>
          <AssignTaskModal
            task={activeTask}
            isOpen={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            staffList={staffList}
            propertyId={propertyId}
            onSuccess={() => router.refresh()}
          />

          <InspectionModal
            task={activeTask}
            isOpen={inspectModalOpen}
            onClose={() => setInspectModalOpen(false)}
            propertyId={propertyId}
            onSuccess={() => router.refresh()}
          />
        </>
      )}
    </Card>
  );
}
