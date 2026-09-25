"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { HousekeepingTask } from "@/lib/housekeeping/types";
import {
  passInspectionAction,
  failInspectionAction,
} from "@/lib/housekeeping/actions";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface InspectionModalProps {
  task: HousekeepingTask | null;
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  onSuccess?: () => void;
}

export function InspectionModal({
  task,
  isOpen,
  onClose,
  propertyId,
  onSuccess,
}: InspectionModalProps) {
  const [notes, setNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionType, setActionType] = React.useState<"PASS" | "FAIL" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (!task) return null;

  const handlePass = async () => {
    setIsSubmitting(true);
    setActionType("PASS");
    setError(null);

    const res = await passInspectionAction({
      propertyId,
      taskId: task.id,
      notes: notes || undefined,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Failed to pass inspection");
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  const handleFail = async () => {
    if (!notes.trim()) {
      setError("Please specify a reason or issues found for the failed inspection.");
      return;
    }

    setIsSubmitting(true);
    setActionType("FAIL");
    setError(null);

    const res = await failInspectionAction({
      propertyId,
      taskId: task.id,
      notes: notes.trim(),
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Failed to submit inspection failure");
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Inspect Room ${task.room?.room_number || ""}`}
      description="Review room cleanliness, amenities, and linen before releasing room to available inventory."
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-lg border border-[var(--border)] text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-[var(--foreground-muted)]">Room / Type:</span>
            <span className="font-bold text-[var(--foreground)]">
              Room {task.room?.room_number} ({task.room?.room_type?.name || "Room"})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--foreground-muted)]">Floor:</span>
            <span className="text-[var(--foreground)]">
              Floor {task.room?.floor?.floor_number || 1}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--foreground-muted)]">Cleaned By:</span>
            <span className="text-[var(--foreground)] font-medium">
              {task.assigned_profile?.full_name || "Assigned Housekeeper"}
            </span>
          </div>
          {task.notes && (
            <div className="pt-1 border-t border-slate-200 text-[var(--foreground-muted)]">
              <span className="font-semibold text-[var(--foreground)]">Cleaning Notes:</span>{" "}
              {task.notes}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Inspection Notes / Feedback
          </label>
          <Textarea
            rows={3}
            placeholder="Add quality feedback or specify issues if failing inspection..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-[10px] text-[var(--foreground-subtle)] mt-1">
            * Note: If marked as Fail / Re-clean, the room will remain DIRTY with high priority for the housekeeper.
          </p>
        </div>

        <div className="flex justify-between gap-2 pt-2 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleFail}
              disabled={isSubmitting}
            >
              {isSubmitting && actionType === "FAIL" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-1.5" />
              )}
              Fail & Re-Clean
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handlePass}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting && actionType === "PASS" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
              )}
              Pass & Release Clean
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
