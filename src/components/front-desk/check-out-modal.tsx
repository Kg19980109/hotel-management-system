"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { checkOutStayAction } from "@/lib/front-desk/actions";
import type { DepartureRecord, InHouseRecord } from "@/lib/front-desk/types";
import { LogOut, AlertCircle, Sparkles, BedDouble, Calendar, ArrowRight } from "lucide-react";

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
      title={`Front Desk Departure: Room ${stay.roomNumber}`}
      size="md"
    >
      <form onSubmit={handleCheckout} className="space-y-4 pt-1">
        {/* Stay Summary Card */}
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider block">
                Departing Guest
              </span>
              <span className="font-bold text-sm text-[var(--foreground)]">{stay.guestName}</span>
            </div>
            <span className="font-mono text-xs font-bold text-[var(--primary)] bg-[var(--primary-subtle)] px-2 py-0.5 rounded border border-[var(--primary)]/20">
              {stay.confirmationNumber}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10.5px] text-[var(--foreground-muted)] font-medium block">Room Assignment</span>
              <span className="font-semibold text-[var(--foreground)] flex items-center gap-1 mt-0.5">
                <BedDouble className="h-3.5 w-3.5 text-[var(--primary)]" />
                Room {stay.roomNumber} ({stay.roomTypeName})
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-[var(--foreground-muted)] font-medium block">Scheduled Departure</span>
              <span className="font-semibold text-[var(--foreground)] flex items-center gap-1 mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-[var(--foreground-subtle)]" />
                {stay.expectedCheckOutDate}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Settlement Check */}
        {balanceDue !== null && balanceDue > 0 && (
          <div className="p-3.5 bg-[var(--warning-light)] border border-[var(--warning)]/30 rounded-[var(--radius-lg)] text-[var(--warning-foreground)] text-xs space-y-2.5">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[var(--warning)] shrink-0" />
                Outstanding Folio Balance:
              </span>
              <span className="font-mono text-base font-black">₹{balanceDue.toFixed(2)}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Hotel policy requires full folio settlement prior to check-out. You can settle the folio or authorize an account override.
            </p>
            {folioId && (
              <div className="pt-1">
                <a
                  href={`/billing/folios/${folioId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  Open Guest Folio to Record Payment
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            )}
            <div className="pt-2 border-t border-[var(--warning)]/30 flex items-center gap-2">
              <input
                type="checkbox"
                id="allow-override"
                checked={allowOverride}
                onChange={(e) => setAllowOverride(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
              />
              <label htmlFor="allow-override" className="text-[11px] font-bold cursor-pointer">
                Authorized Override (Charge to Account / Settle Later)
              </label>
            </div>
          </div>
        )}

        {balanceDue !== null && balanceDue <= 0 && (
          <div className="p-3 bg-[var(--success-light)] border border-[var(--success)]/30 rounded-[var(--radius-lg)] text-[var(--success-foreground)] text-xs flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--success)]" />
              Folio Settled (Zero Balance Due)
            </span>
            <span className="font-mono font-bold text-sm">₹0.00</span>
          </div>
        )}

        {/* Operational Invariant Notice */}
        <div className="p-3 bg-[var(--primary-subtle)] border border-[var(--primary)]/20 rounded-[var(--radius-lg)] text-[var(--foreground)] text-xs flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-[var(--primary)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-[var(--foreground)]">Room Status Progression</div>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Completing departure automatically sets Room <strong>{stay.roomNumber}</strong> to <strong>DIRTY</strong> for Housekeeping turnaround inspection before being released to available inventory.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger)]/30 rounded-[var(--radius-md)] text-[var(--danger-foreground)] text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-[var(--danger)]" />
            <div>{error}</div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting}
            className="gap-1.5 shadow-md bg-[var(--warning)] hover:opacity-95 text-white"
          >
            <LogOut className="h-4 w-4" />
            {submitting ? "Processing Departure..." : "Confirm Check-Out"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
