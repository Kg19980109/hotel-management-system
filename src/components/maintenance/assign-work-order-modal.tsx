"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { assignWorkOrderAction } from "@/lib/maintenance/actions";
import { MaintenanceWorkOrder } from "@/lib/maintenance/types";
import { StaffOption } from "@/lib/maintenance/queries";
import { UserCheck } from "lucide-react";

interface AssignWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: MaintenanceWorkOrder | null;
  staff: StaffOption[];
  onSuccess?: () => void;
}

export function AssignWorkOrderModal({
  isOpen,
  onClose,
  workOrder,
  staff,
  onSuccess,
}: AssignWorkOrderModalProps) {
  if (!workOrder || !isOpen) return null;

  return (
    <AssignWorkOrderModalInner
      key={workOrder.id}
      isOpen={isOpen}
      onClose={onClose}
      workOrder={workOrder}
      staff={staff}
      onSuccess={onSuccess}
    />
  );
}

function AssignWorkOrderModalInner({
  isOpen,
  onClose,
  workOrder,
  staff,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workOrder: MaintenanceWorkOrder;
  staff: StaffOption[];
  onSuccess?: () => void;
}) {
  const { success, error } = useToast();
  const [assignedTo, setAssignedTo] = React.useState<string>(workOrder.assigned_to || "");
  const [scheduledFor, setScheduledFor] = React.useState<string>(
    workOrder.scheduled_for ? new Date(workOrder.scheduled_for).toISOString().slice(0, 16) : ""
  );
  const [notes, setNotes] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo) {
      error("Validation Error", "Please select a staff member to assign.");
      return;
    }

    setLoading(true);
    try {
      const result = await assignWorkOrderAction({
        workOrderId: workOrder.id,
        assignedTo,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        error("Assignment Failed", result.error || "Failed to assign work order.");
        return;
      }

      success("Technician Assigned", "Work order assigned successfully.");

      onClose();
      if (onSuccess) onSuccess();
    } catch {
      error("Error", "An unexpected error occurred during assignment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Assign Work Order"
      description={`Assign technician for "${workOrder.title}" ${
        workOrder.room ? `in Room ${workOrder.room.room_number}` : "(Property Area)"
      }.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Staff Selection */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Technician / Staff Member <span className="text-rose-500">*</span>
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            required
          >
            <option value="">Select Technician...</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.role.replace("_", " ")})
              </option>
            ))}
          </select>
        </div>

        {/* Scheduled Due Date */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Scheduled Due Date / Time
          </label>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
          />
        </div>

        {/* Handover / Assignment Notes */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Handover / Priority Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Special instructions or access codes for the technician..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <UserCheck className="h-4 w-4 mr-1.5" />
            Assign Technician
          </Button>
        </div>
      </form>
    </Modal>
  );
}
