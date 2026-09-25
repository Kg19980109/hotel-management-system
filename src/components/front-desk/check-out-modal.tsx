"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { checkOutStayAction } from "@/lib/front-desk/actions";
import type { DepartureRecord, InHouseRecord } from "@/lib/front-desk/types";
import { LogOut, AlertCircle, Sparkles } from "lucide-react";

interface CheckOutModalProps {
  open: boolean;
  stay: DepartureRecord | InHouseRecord | null;
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CheckOutModal({
  open,
  stay,
  propertyId,
  onClose,
  onSuccess,
}: CheckOutModalProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [allowOverride, setAllowOverride] = React.useState(false);
  const [balanceDue, setBalanceDue] = React.useState<number | null>(null);
  const [folioId, setFolioId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    if (open && stay) {
      void Promise.resolve().then(async () => {
        if (!isMounted) return;
        setError(null);
        setAllowOverride(false);
        try {
          // Check if there's an active folio for this stay
          const { getStayFolioAction } = await import("@/lib/billing/actions");
          const res = await getStayFolioAction(stay.stayId, propertyId);
          if (isMounted && res.success && res.data) {
            setBalanceDue(res.data.balance_due);
            setFolioId(res.data.id);
          }
        } catch {
          // Ignore if billing not loaded yet
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [open, stay, propertyId]);

  if (!stay) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await checkOutStayAction({
      stayId: stay.stayId,
      propertyId,
      allowUnpaidOverride: allowOverride,
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to complete check-out.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Check Out: Room ${stay.roomNumber}`}
      size="sm"
    >
      <form onSubmit={handleCheckout} className="space-y-4 pt-1">
        {/* Stay Summary */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Guest:</span>
            <span className="font-bold text-slate-800">{stay.guestName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Confirmation:</span>
            <span className="font-mono text-slate-800">{stay.confirmationNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Room:</span>
            <span className="font-medium text-slate-800">Room {stay.roomNumber} ({stay.roomTypeName})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Expected Departure:</span>
            <span className="text-slate-800">{stay.expectedCheckOutDate}</span>
          </div>
        </div>

        {/* Financial Settlement Check */}
        {balanceDue !== null && balanceDue > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] text-amber-900 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1 text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Outstanding Folio Balance:
              </span>
              <span className="font-mono text-sm text-amber-900">₹{balanceDue.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-amber-700">
              Hotel policy requires full settlement prior to check-out. You can settle the bill or record a payment in the Guest Folio.
            </p>
            {folioId && (
              <div className="pt-1">
                <a
                  href={`/billing/folios/${folioId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline"
                >
                  Open Guest Folio to Record Payment &rarr;
                </a>
              </div>
            )}
            <div className="pt-2 border-t border-amber-200/80 flex items-center gap-2">
              <input
                type="checkbox"
                id="allow-override"
                checked={allowOverride}
                onChange={(e) => setAllowOverride(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="allow-override" className="text-[11px] font-semibold text-amber-950 cursor-pointer">
                Authorized Override (Charge to Account / Settle Later)
              </label>
            </div>
          </div>
        )}

        {balanceDue !== null && balanceDue <= 0 && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-[var(--radius-md)] text-emerald-800 text-xs flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Folio Settled (Zero Balance)
            </span>
            <span className="font-mono font-bold text-emerald-900">₹0.00</span>
          </div>
        )}

        {/* Operational Invariant Notice */}
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-[var(--radius-md)] text-indigo-900 text-xs flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-indigo-950">Room Transitions to DIRTY</div>
            <p className="text-[11px] text-indigo-800">
              Upon checkout, Room <strong>{stay.roomNumber}</strong> is marked as <strong>DIRTY</strong> for Housekeeping cleaning and inspection before becoming available.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--radius-md)] text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <div>{error}</div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting}
            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <LogOut className="h-4 w-4" />
            {submitting ? "Processing..." : "Confirm Check-Out"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
