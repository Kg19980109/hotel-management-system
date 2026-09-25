"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PaymentMethod } from "@/lib/billing/types";
import { recordFolioPaymentAction } from "@/lib/billing/actions";
import { CreditCard, Loader2 } from "lucide-react";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  folioId: string;
  currency: string;
  balanceDue: number;
  onSuccess: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CARD", label: "Credit / Debit Card" },
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI (GooglePay / PhonePe / Paytm)" },
  { value: "BANK_TRANSFER", label: "Direct Bank Transfer (NEFT/RTGS)" },
  { value: "ONLINE", label: "Online Payment Gateway" },
  { value: "WALLET", label: "Digital Wallet" },
  { value: "OTHER", label: "Other Method" },
];

function RecordPaymentForm({
  onClose,
  propertyId,
  folioId,
  currency,
  balanceDue,
  onSuccess,
}: Omit<RecordPaymentModalProps, "isOpen">) {
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("CARD");
  const [amount, setAmount] = React.useState(balanceDue > 0 ? balanceDue.toFixed(2) : "");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await recordFolioPaymentAction({
      propertyId,
      folioId,
      paymentMethod,
      amount: parsedAmount,
      notes: notes.trim() || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to record payment.");
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {balanceDue > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between text-xs">
          <span className="text-amber-800 dark:text-amber-300 font-medium">Outstanding Balance:</span>
          <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
            {currency} {balanceDue.toFixed(2)}
          </span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
          Payment Method
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-[var(--foreground)]"
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
          Amount ({currency}) <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[var(--foreground)]"
            required
          />
          {balanceDue > 0 && (
            <button
              type="button"
              onClick={() => setAmount(balanceDue.toFixed(2))}
              className="absolute right-2 top-2 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded hover:bg-emerald-200"
            >
              Pay Full
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
          Transaction Reference / Notes (Optional)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Receipt #, UPI UTR #, last 4 digits of card..."
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-[var(--foreground)] resize-none"
        />
      </div>

      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
          Record Payment
        </Button>
      </div>
    </form>
  );
}

export function RecordPaymentModal(props: RecordPaymentModalProps) {
  return (
    <Modal
      open={props.isOpen}
      onClose={props.onClose}
      title="Record Payment"
      description="Record a guest payment received via cash, card, UPI, bank transfer, or online gateway."
      size="md"
    >
      {props.isOpen && (
        <RecordPaymentForm
          onClose={props.onClose}
          propertyId={props.propertyId}
          folioId={props.folioId}
          currency={props.currency}
          balanceDue={props.balanceDue}
          onSuccess={props.onSuccess}
        />
      )}
    </Modal>
  );
}
