"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import {
  HousekeepingTaskType,
  HousekeepingPriority,
  StaffOption,
} from "@/lib/housekeeping/types";
import { createHousekeepingTaskAction } from "@/lib/housekeeping/actions";
import { PlusCircle, Loader2 } from "lucide-react";

interface RoomOption {
  id: string;
  roomNumber: string;
  roomTypeName: string;
  status: string;
  housekeepingStatus: string;
}

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  rooms: RoomOption[];
  staffList: StaffOption[];
  onSuccess?: () => void;
}

export function NewTaskModal({
  isOpen,
  onClose,
  propertyId,
  rooms,
  staffList,
  onSuccess,
}: NewTaskModalProps) {
  const [roomId, setRoomId] = React.useState<string>("");
  const [taskType, setTaskType] = React.useState<HousekeepingTaskType>("CLEANING");
  const [priority, setPriority] = React.useState<HousekeepingPriority>("NORMAL");
  const [assignedTo, setAssignedTo] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) {
      setError("Please select a room for this housekeeping task.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await createHousekeepingTaskAction({
      propertyId,
      roomId,
      taskType,
      priority,
      assignedTo: assignedTo || null,
      notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Failed to create housekeeping task");
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Create Housekeeping Task"
      description="Schedule a room cleaning, deep clean, or turndown service."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Target Room <span className="text-rose-500">*</span>
          </label>
          <Select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">-- Select Room --</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.roomNumber} ({r.roomTypeName}) — {r.status} / {r.housekeepingStatus}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Task Type
            </label>
            <Select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as HousekeepingTaskType)}
              disabled={isSubmitting}
            >
              <option value="CLEANING">Standard Cleaning</option>
              <option value="DEEP_CLEAN">Deep Clean</option>
              <option value="TURNDOWN">Evening Turndown</option>
              <option value="INSPECTION">Inspection Only</option>
              <option value="LINEN_CHANGE">Linen Change</option>
              <option value="TOUCHUP">Touchup / Quick Clean</option>
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
              <option value="HIGH">High (Imminent Arrival)</option>
              <option value="URGENT">Urgent (VIP / Early Arrival)</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Assign To Staff Member (Optional)
          </label>
          <Select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">-- Unassigned (Available in Pool) --</option>
            {staffList.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.fullName} ({s.roleCode})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Special Instructions / Notes
          </label>
          <Textarea
            rows={2}
            placeholder="e.g. Extra pillows requested, replace bathrobes, VIP arrival..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
          />
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
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Create Task
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
