"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setRoomMaintenanceStatusAction } from "@/lib/maintenance/actions";
import { ShieldAlert } from "lucide-react";

interface RoomStatusOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  roomId: string;
  roomNumber: string;
  currentStatus: string;
  onSuccess?: () => void;
}

export function RoomStatusOverrideModal({
  isOpen,
  onClose,
  propertyId,
  roomId,
  roomNumber,
  currentStatus,
  onSuccess,
}: RoomStatusOverrideModalProps) {
  const { success, error } = useToast();
  const [operationalStatus, setOperationalStatus] = React.useState<"OUT_OF_ORDER" | "OUT_OF_SERVICE" | "DIRTY" | "AVAILABLE">(
    currentStatus === "OUT_OF_ORDER" || currentStatus === "OUT_OF_SERVICE" ? "DIRTY" : "OUT_OF_ORDER"
  );
  const [reason, setReason] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await setRoomMaintenanceStatusAction({
        propertyId,
        roomId,
        operationalStatus,
        reason: reason.trim() || undefined,
      });

      if (!result.success) {
        error("Override Failed", result.error || "Failed to update room operational status.");
        return;
      }

      success(
        "Room Operational Status Updated",
        `Room ${roomNumber} is now ${operationalStatus.replace(/_/g, " ")}.`
      );

      handleClose();
      if (onSuccess) onSuccess();
    } catch {
      error("Error", "An unexpected error occurred while updating room status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={`Management Room Status Override — Room ${roomNumber}`}
      description={`Current Room Operational Status: ${currentStatus}. Authorized managers can take this room out of order/service or return it to service.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            New Operational Status <span className="text-rose-500">*</span>
          </label>
          <select
            value={operationalStatus}
            onChange={(e) => setOperationalStatus(e.target.value as "OUT_OF_ORDER" | "OUT_OF_SERVICE" | "DIRTY" | "AVAILABLE")}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
          >
            <option value="OUT_OF_ORDER">OUT OF ORDER (Temporary physical repair)</option>
            <option value="OUT_OF_SERVICE">OUT OF SERVICE (Long term structural / renovation)</option>
            <option value="DIRTY">RETURN TO SERVICE (DIRTY - Requires housekeeping clean)</option>
            <option value="AVAILABLE">RETURN TO SERVICE (AVAILABLE - Clean &amp; Vacant)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Reason / Justification
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Major water pipe repair in bathroom, room taken out of inventory for 48 hours..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <ShieldAlert className="h-4 w-4 mr-1.5" />
            Apply Status Override
          </Button>
        </div>
      </form>
    </Modal>
  );
}
