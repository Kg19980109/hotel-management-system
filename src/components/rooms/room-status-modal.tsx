"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import type { Room, RoomOperationalStatus, RoomHousekeepingStatus } from "@/lib/rooms/types";
import { updateRoomStatusAction } from "@/lib/rooms/actions";

interface RoomStatusModalProps {
  room: Room | null;
  propertyId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoomStatusModal({
  room,
  propertyId,
  open,
  onClose,
  onSuccess,
}: RoomStatusModalProps) {
  const [operationalStatus, setOperationalStatus] = React.useState<RoomOperationalStatus>("AVAILABLE");
  const [housekeepingStatus, setHousekeepingStatus] = React.useState<RoomHousekeepingStatus>("CLEAN");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    if (room) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        setOperationalStatus(room.status);
        setHousekeepingStatus(room.housekeeping_status);
        setError(null);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [room]);

  if (!room) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await updateRoomStatusAction(
        propertyId,
        room.id,
        operationalStatus,
        housekeepingStatus
      );

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to update room status.");
      }
    } catch (err) {
      console.error("Status update error:", err);
      setError("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Update Status — Room ${room.room_number}`}
      description="Quickly adjust the operational and housekeeping state of this physical room."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-[var(--radius-md)] bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Operational Status */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
            Operational Status
          </label>
          <Select
            value={operationalStatus}
            onChange={(e) => setOperationalStatus(e.target.value as RoomOperationalStatus)}
          >
            <option value="AVAILABLE">Available — Ready for Guest Check-in</option>
            <option value="OCCUPIED">Occupied — Active Guest In-House</option>
            <option value="DIRTY">Dirty — Requires Turnover Cleaning</option>
            <option value="CLEANING">Cleaning — Attendant Currently Inside</option>
            <option value="INSPECTED">Inspected — Verified by Supervisor</option>
            <option value="OUT_OF_ORDER">Out of Order — Maintenance Issue</option>
            <option value="OUT_OF_SERVICE">Out of Service — Offline</option>
          </Select>
        </div>

        {/* Housekeeping Status */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
            Housekeeping Status
          </label>
          <Select
            value={housekeepingStatus}
            onChange={(e) => setHousekeepingStatus(e.target.value as RoomHousekeepingStatus)}
          >
            <option value="CLEAN">Clean — Sanitized & Prepared</option>
            <option value="DIRTY">Dirty — Linen Change & Cleaning Needed</option>
            <option value="CLEANING">In Progress — Attendant Cleaning</option>
            <option value="INSPECTION_PENDING">Inspection Pending — Needs Supervisor Check</option>
          </Select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Update Status"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
