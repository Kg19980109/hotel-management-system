"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { resolveWorkOrderAction } from "@/lib/maintenance/actions";
import { MaintenanceWorkOrder } from "@/lib/maintenance/types";
import { CheckCircle2 } from "lucide-react";

interface ResolveWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: MaintenanceWorkOrder | null;
  onSuccess?: () => void;
}

export function ResolveWorkOrderModal({
  isOpen,
  onClose,
  workOrder,
  onSuccess,
}: ResolveWorkOrderModalProps) {
  if (!workOrder || !isOpen) return null;

  return (
    <ResolveWorkOrderModalInner
      key={workOrder.id}
      isOpen={isOpen}
      onClose={onClose}
      workOrder={workOrder}
      onSuccess={onSuccess}
    />
  );
}

function ResolveWorkOrderModalInner({
  isOpen,
  onClose,
  workOrder,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workOrder: MaintenanceWorkOrder;
  onSuccess?: () => void;
}) {
  const { success, error } = useToast();
  const [resolutionNotes, setResolutionNotes] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      error("Resolution Notes Required", "Please specify what actions or repairs were performed to resolve the issue.");
      return;
    }

    setLoading(true);
    try {
      const result = await resolveWorkOrderAction({
        workOrderId: workOrder.id,
        resolutionNotes: resolutionNotes.trim(),
      });

      if (!result.success) {
        error("Resolution Failed", result.error || "Failed to resolve work order.");
        return;
      }

      success("Work Order Resolved", `Work order "${workOrder.title}" marked as resolved.`);

      onClose();
      if (onSuccess) onSuccess();
    } catch {
      error("Error", "An unexpected error occurred while resolving work order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Resolve Work Order"
      description={`Record the repair steps taken for "${workOrder.title}".`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Resolution Summary & Actions Taken <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows={4}
            placeholder="e.g. Replaced leaking drain pipe gasket, tested water flow with zero leaks, verified thermostat function..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            required
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <p className="font-medium">Operational Notice:</p>
          <p className="mt-0.5">
            Resolving this work order records the completion of physical repair. If the room is currently Out of Order or Out of Service, an authorized manager must explicitly review and release the room back to inventory.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Mark Resolved
          </Button>
        </div>
      </form>
    </Modal>
  );
}
