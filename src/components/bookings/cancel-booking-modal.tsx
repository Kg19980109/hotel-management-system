"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cancelBookingAction } from "@/lib/bookings/actions";
import { Reservation } from "@/lib/bookings/types";
import { AlertTriangle } from "lucide-react";

interface CancelBookingModalProps {
  open: boolean;
  reservation: Reservation | null;
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelBookingModal({
  open,
  reservation,
  propertyId,
  onClose,
  onSuccess,
}: CancelBookingModalProps) {
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    if (open) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        setReason("");
        setError(null);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [open]);

  if (!reservation) return null;

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await cancelBookingAction(reservation.id, propertyId, reason);
    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to cancel reservation.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cancel Reservation ${reservation.confirmation_number}`}
      size="sm"
    >
      <form onSubmit={handleCancel} className="space-y-4 pt-2">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] text-amber-800 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            Cancelling will immediately release assigned rooms back into available inventory for these dates. This record will remain in historical reporting.
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--radius-md)] text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
            Cancellation Reason (Optional)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Guest travel plans changed, requested by guest via phone..."
            rows={3}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Keep Reservation
          </Button>
          <Button type="submit" variant="destructive" size="sm" disabled={loading}>
            {loading ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
