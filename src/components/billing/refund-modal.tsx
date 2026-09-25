"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FolioPayment } from "@/lib/billing/types";
import { refundFolioPaymentAction } from "@/lib/billing/actions";
import { RotateCcw, Loader2 } from "lucide-react";

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  folioId: string;
  payment: FolioPayment;
  onSuccess: () => void;
}

export function RefundModal({
  isOpen,
  onClose,
  propertyId,
  folioId,
  payment,
  onSuccess,
}: RefundModalProps) {
  const [amount, setAmount] = React.useState(payment.amount.toFixed(2));
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      setError("Refund amount must be greater than zero.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required to process a refund.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await refundFolioPaymentAction({
      propertyId,
      folioId,
      paymentId: payment.id,
      amount: parsedAmount,
      reason: reason.trim(),
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to process refund.");
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Process Payment Refund"
      description={`Refund transaction ${payment.payment_reference} (${payment.payment_method}).`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-lg text-xs space-y-1">
          <div className="flex justify-between text-[var(--foreground-muted)]">
            <span>Payment Reference</span>
            <span className="font-semibold text-[var(--foreground)]">{payment.payment_reference}</span>
          </div>
          <div className="flex justify-between text-[var(--foreground-muted)]">
            <span>Original Amount</span>
            <span className="font-semibold text-[var(--foreground)]">{payment.currency} {payment.amount.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Refund Amount ({payment.currency})
          </label>
          <input
            type="number"
            min="0.01"
            max={payment.amount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Refund Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for refund (e.g. guest overpayment, early checkout, service compensation)..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)] resize-none"
            required
          />
        </div>

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            type="submit"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RotateCcw className="w-4 h-4 mr-1.5" />}
            Confirm Refund
          </Button>
        </div>
      </form>
    </Modal>
  );
}
