"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { markNoShowAction } from "@/lib/front-desk/actions";
import type { ArrivalRecord } from "@/lib/front-desk/types";
import { AlertCircle, AlertTriangle, UserX } from "lucide-react";

interface NoShowModalProps {
  open: boolean;
  arrival: ArrivalRecord | null;
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function NoShowModal({
  open,
  arrival,
  propertyId,
  onClose,
  onSuccess,
}: NoShowModalProps) {
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
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

  if (!arrival) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await markNoShowAction({
      reservationId: arrival.reservationId,
      propertyId,
      reason: reason.trim() || undefined,
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to mark reservation as no-show.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Mark as No-Show: ${arrival.confirmationNumber}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-[var(--radius-md)] text-purple-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-purple-950">Release Inventory</div>
            <p className="text-[11px] text-purple-800">
              Guest <strong>{arrival.guestName}</strong> did not arrive for scheduled check-in on {arrival.checkInDate}. This will mark the booking as <strong>NO_SHOW</strong> and release any allocated room inventory.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--radius-md)] text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <div>{error}</div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Operational Note / Reason (Optional)
          </label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Guest did not answer phone, flight cancelled..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={submitting}
            className="gap-1.5 bg-purple-700 hover:bg-purple-800 text-white"
          >
            <UserX className="h-4 w-4" />
            {submitting ? "Processing..." : "Confirm No-Show"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
