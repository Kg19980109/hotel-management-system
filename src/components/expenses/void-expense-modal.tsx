"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/reports/formatters";
import type { HotelExpense } from "@/lib/expenses/types";
import { voidExpenseAction } from "@/lib/expenses/actions";
import { Ban, AlertTriangle } from "lucide-react";

interface VoidExpenseModalProps {
  propertyId: string;
  expense: HotelExpense | null;
  isOpen: boolean;
  currency?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoidExpenseModal({
  propertyId,
  expense,
  isOpen,
  currency = "INR",
  onClose,
  onSuccess,
}: VoidExpenseModalProps) {
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!expense) return null;

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg("Please provide a reason for cancelling / voiding this expense.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await voidExpenseAction(propertyId, expense.id, reason.trim());
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to void expense.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-rose-600">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Void Expense Voucher
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Voucher #{expense.expense_number} • Amount: {formatCurrency(expense.amount, currency)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleVoid} className="space-y-3.5 py-2 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Financial records are auditable and cannot be permanently deleted. Voiding will update the status to <strong>CANCELLED</strong> and exclude it from operating expense totals while preserving the audit history.
            </span>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="font-semibold text-foreground block mb-1">
              Cancellation / Void Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g., Duplicate entry, incorrect vendor billed, invoice cancelled by supplier..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full p-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={isSubmitting || !reason.trim()}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              {isSubmitting ? "Voiding..." : "Confirm Void Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
