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
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("CASH");
  const [amount, setAmount] = React.useState(balanceDue > 0 ? balanceDue.toFixed(2) : "");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const projectedRemaining = Math.max(0, balanceDue - parsedAmount);
  const isPartial = parsedAmount > 0 && parsedAmount < balanceDue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      notes: notes.trim() ? notes.trim() : isPartial ? `Partial payment of ${currency} ${parsedAmount.toFixed(2)} recorded` : undefined,
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
        <div className="p-3 bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-slate-900 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between text-xs shadow-xs">
          <div>
            <span className="text-amber-800 dark:text-amber-300 font-bold block">Current Running Bill Balance:</span>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-400">
              {isPartial ? "Partial payment will reduce the balance due." : "Collect partial or full bill payment."}
            </span>
          </div>
          <span className="font-mono font-black text-sm text-amber-950 dark:text-amber-200 bg-white/80 dark:bg-black/40 px-2.5 py-1 rounded-lg border border-amber-300/40">
            {currency} {balanceDue.toFixed(2)}
          </span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
          Payment Method
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          className="stayhub-input-base h-10 text-sm"
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
            Amount ({currency}) <span className="text-rose-500">*</span>
          </label>
          {balanceDue > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAmount((balanceDue * 0.5).toFixed(2))}
                className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition"
              >
                50% ({(balanceDue * 0.5).toFixed(0)})
              </button>
              {balanceDue >= 1000 && (
                <button
                  type="button"
                  onClick={() => setAmount("500.00")}
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 transition"
                >
                  ₹500 Part
                </button>
              )}
              <button
                type="button"
                onClick={() => setAmount(balanceDue.toFixed(2))}
                className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800 transition"
              >
                Full ({balanceDue.toFixed(0)})
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="stayhub-input-base h-10 font-mono text-sm"
            required
          />
        </div>

        {/* Projected Remaining Balance Indicator */}
        {balanceDue > 0 && parsedAmount > 0 && (
          <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              {isPartial ? "Remaining Balance to Collect Later:" : "Balance After This Payment:"}
            </span>
            <span className={`font-mono font-bold ${projectedRemaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {currency} {projectedRemaining.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
          Transaction Reference / Notes (Optional)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Receipt #, UPI UTR #, partial payment note..."
          className="stayhub-input-base resize-none text-sm"
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
          disabled={loading || parsedAmount <= 0}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
          {isPartial ? `Record Partial Payment (${currency} ${parsedAmount.toFixed(2)})` : `Record Payment (${currency} ${parsedAmount.toFixed(2)})`}
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
