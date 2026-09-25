"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import {
  HousekeepingTask,
  StaffOption,
  HousekeepingPriority,
} from "@/lib/housekeeping/types";
import { assignHousekeepingTaskAction } from "@/lib/housekeeping/actions";
import { UserCheck, Loader2 } from "lucide-react";

interface AssignTaskModalProps {
  task: HousekeepingTask | null;
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffOption[];
  propertyId: string;
  onSuccess?: () => void;
}

export function AssignTaskModal({
  task,
  isOpen,
  onClose,
  staffList,
  propertyId,
  onSuccess,
}: AssignTaskModalProps) {
  const [assignedTo, setAssignedTo] = React.useState<string>(task?.assigned_to || "");
  const [priority, setPriority] = React.useState<HousekeepingPriority>(task?.priority || "NORMAL");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo) {
      setError("Please select a housekeeper to assign.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await assignHousekeepingTaskAction({
      propertyId,
      taskId: task.id,
      assignedTo,
      priority,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Failed to assign task");
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Assign Room ${task.room?.room_number || ""}`}
      description="Select a staff member to handle this cleaning task."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-lg border border-[var(--border)] text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[var(--foreground-muted)]">Room:</span>
            <span className="font-bold text-[var(--foreground)]">
              {task.room?.room_number} ({task.room?.room_type?.name || "Room"})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--foreground-muted)]">Floor:</span>
            <span className="text-[var(--foreground)]">
              Floor {task.room?.floor?.floor_number || 1}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--foreground-muted)]">Task Type:</span>
            <span className="font-medium text-indigo-600">{task.task_type}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Assign To Staff Member <span className="text-rose-500">*</span>
          </label>
          <Select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">-- Select Staff Member --</option>
            {staffList.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.fullName} ({s.roleCode})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Priority
          </label>
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value as HousekeepingPriority)}
            disabled={isSubmitting}
          >
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent (Early Arrival / VIP)</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Save Assignment
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
