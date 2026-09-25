"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  holdWorkOrderAction,
  resumeWorkOrderAction,
  closeWorkOrderAction,
  cancelWorkOrderAction,
  reopenWorkOrderAction,
  updatePriorityAction,
  addNoteAction,
} from "@/lib/maintenance/actions";
import {
  MaintenanceWorkOrder,
  MaintenancePriority,
} from "@/lib/maintenance/types";

export type TransitionAction =
  | "HOLD"
  | "RESUME"
  | "CLOSE"
  | "CANCEL"
  | "REOPEN"
  | "PRIORITY"
  | "NOTE";

interface StatusTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: MaintenanceWorkOrder | null;
  actionType: TransitionAction;
  onSuccess?: () => void;
}

export function StatusTransitionModal({
  isOpen,
  onClose,
  workOrder,
  actionType,
  onSuccess,
}: StatusTransitionModalProps) {
  if (!workOrder || !isOpen) return null;

  return (
    <StatusTransitionModalInner
      key={`${workOrder.id}-${actionType}`}
      isOpen={isOpen}
      onClose={onClose}
      workOrder={workOrder}
      actionType={actionType}
      onSuccess={onSuccess}
    />
  );
}

function StatusTransitionModalInner({
  isOpen,
  onClose,
  workOrder,
  actionType,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workOrder: MaintenanceWorkOrder;
  actionType: TransitionAction;
  onSuccess?: () => void;
}) {
  const { success, error } = useToast();
  const [text, setText] = React.useState<string>("");
  const [priority, setPriority] = React.useState<MaintenancePriority>(workOrder.priority || "NORMAL");
  const [loading, setLoading] = React.useState<boolean>(false);

  const getModalConfig = () => {
    switch (actionType) {
      case "HOLD":
        return {
          title: "Put Work Order On Hold",
          description: "Specify why work is paused (e.g. waiting for spare parts or guest vacancy).",
          buttonLabel: "Put On Hold",
          buttonVariant: "secondary" as const,
          requiresText: true,
          placeholder: "Reason for hold (e.g. Waiting for replacement compressor part)...",
        };
      case "RESUME":
        return {
          title: "Resume Work Order",
          description: "Resume maintenance operations for this work order.",
          buttonLabel: "Resume Work",
          buttonVariant: "primary" as const,
          requiresText: false,
          placeholder: "Optional notes on resumption...",
        };
      case "CLOSE":
        return {
          title: "Close Work Order",
          description: "Administratively close this maintenance work order.",
          buttonLabel: "Close Work Order",
          buttonVariant: "primary" as const,
          requiresText: false,
          placeholder: "Optional closing remarks / audit remarks...",
        };
      case "CANCEL":
        return {
          title: "Cancel Work Order",
          description: "Cancel this work order if reported by mistake or no longer needed.",
          buttonLabel: "Cancel Work Order",
          buttonVariant: "destructive" as const,
          requiresText: false,
          placeholder: "Optional cancellation reason...",
        };
      case "REOPEN":
        return {
          title: "Reopen Work Order",
          description: "Reopen this work order back to OPEN status.",
          buttonLabel: "Reopen Work Order",
          buttonVariant: "primary" as const,
          requiresText: true,
          placeholder: "Reason for reopening (e.g. Issue re-occurred after 24 hours)...",
        };
      case "PRIORITY":
        return {
          title: "Change Work Order Priority",
          description: "Update the operational urgency of this work order.",
          buttonLabel: "Update Priority",
          buttonVariant: "primary" as const,
          requiresText: false,
          placeholder: "Optional reason for priority change...",
        };
      case "NOTE":
        return {
          title: "Add Internal Note",
          description: "Log an internal operational comment into the work order timeline.",
          buttonLabel: "Add Note",
          buttonVariant: "primary" as const,
          requiresText: true,
          placeholder: "Enter internal note / update...",
        };
    }
  };

  const config = getModalConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.requiresText && !text.trim()) {
      error("Validation Error", "Please provide a reason or notes for this action.");
      return;
    }

    setLoading(true);
    try {
      let result;
      switch (actionType) {
        case "HOLD":
          result = await holdWorkOrderAction(workOrder.id, text.trim());
          break;
        case "RESUME":
          result = await resumeWorkOrderAction(workOrder.id, text.trim() || undefined);
          break;
        case "CLOSE":
          result = await closeWorkOrderAction(workOrder.id, text.trim() || undefined);
          break;
        case "CANCEL":
          result = await cancelWorkOrderAction(workOrder.id, text.trim() || undefined);
          break;
        case "REOPEN":
          result = await reopenWorkOrderAction(workOrder.id, text.trim());
          break;
        case "PRIORITY":
          result = await updatePriorityAction(workOrder.id, priority, text.trim() || undefined);
          break;
        case "NOTE":
          result = await addNoteAction(workOrder.id, text.trim());
          break;
      }

      if (!result.success) {
        error("Action Failed", result.error || "Failed to perform maintenance action.");
        return;
      }

      success("Success", "Work order updated successfully.");

      onClose();
      if (onSuccess) onSuccess();
    } catch {
      error("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={config.title}
      description={config.description}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {actionType === "PRIORITY" && (
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
              New Priority <span className="text-rose-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            {config.requiresText ? "Reason / Notes *" : "Notes / Remarks (Optional)"}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={config.placeholder}
            required={config.requiresText}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant={config.buttonVariant} loading={loading}>
            {config.buttonLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
