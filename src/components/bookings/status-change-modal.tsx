"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { changeBookingStatusAction } from "@/lib/bookings/actions";
import { Reservation, ReservationStatus } from "@/lib/bookings/types";

interface StatusChangeModalProps {
  open: boolean;
  reservation: Reservation | null;
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function StatusChangeModal({
  open,
  reservation,
  propertyId,
  onClose,
  onSuccess,
}: StatusChangeModalProps) {
  const [newStatus, setNewStatus] = React.useState<ReservationStatus>("CONFIRMED");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    if (reservation) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        setNewStatus(reservation.status);
        setError(null);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [reservation, open]);

  if (!reservation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await changeBookingStatusAction(reservation.id, propertyId, newStatus);
    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to update reservation status.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Update Status: ${reservation.confirmation_number}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--radius-md)] text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
            Select New Status
          </label>
          <Select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ReservationStatus)}
          >
            <option value="CONFIRMED">Confirmed — Active reservation commitment</option>
            <option value="PENDING">Pending — In review or payment pending</option>
            <option value="CANCELLED">Cancelled — Release rooms back to inventory</option>
            <option value="NO_SHOW">No Show — Guest failed to arrive</option>
            <option value="COMPLETED">Completed — Historical stay finished</option>
          </Select>
        </div>

        <div className="text-xs text-[var(--foreground-muted)] p-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)]">
          <p className="font-semibold text-slate-800 mb-0.5">Note on Lifecycle:</p>
          Operational check-in and check-out workflows will be introduced in Phase 8 (Front Desk). Setting status here updates the reservation ledger record.
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? "Updating..." : "Save Status"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
