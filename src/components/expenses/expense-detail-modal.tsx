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
import type { HotelExpense, ExpenseAuditLog } from "@/lib/expenses/types";
import { fetchExpenseDetailAction } from "@/lib/expenses/actions";
import {
  Receipt,
  Building2,
  Calendar,
  CreditCard,
  Tag,
  FileText,
  User,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface ExpenseDetailModalProps {
  propertyId: string;
  expense: HotelExpense | null;
  isOpen: boolean;
  currency?: string;
  onClose: () => void;
  onEdit?: (expense: HotelExpense) => void;
  onVoid?: (expense: HotelExpense) => void;
}

export function ExpenseDetailModal({
  propertyId,
  expense,
  isOpen,
  currency = "INR",
  onClose,
  onEdit,
  onVoid,
}: ExpenseDetailModalProps) {
  const [fullExpense, setFullExpense] = React.useState<HotelExpense | null>(expense);
  const [auditLogs, setAuditLogs] = React.useState<ExpenseAuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && expense?.id) {
      setFullExpense(expense);
      setIsLoading(true);
      void fetchExpenseDetailAction(propertyId, expense.id)
        .then((res) => {
          if (res.data) {
            if (res.data.expense) setFullExpense(res.data.expense);
            setAuditLogs(res.data.auditLogs);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, expense, propertyId]);

  if (!expense) return null;
  const current = fullExpense || expense;
  const isVoided = current.status === "CANCELLED";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {current.title}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-muted-foreground">
                  Voucher #{current.expense_number} • Date: {current.expense_date}
                </DialogDescription>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`text-lg font-bold font-mono ${
                  isVoided ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {formatCurrency(current.amount, currency)}
              </div>
              <span
                className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  isVoided
                    ? "bg-rose-500/10 text-rose-600"
                    : current.status === "PAID"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-blue-500/10 text-blue-600"
                }`}
              >
                {current.status}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/30 p-3.5 rounded-xl border border-border/60">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Category
              </span>
              <span className="font-semibold text-foreground">
                {current.category?.name || "General"}
              </span>
              {current.subcategory && (
                <span className="text-muted-foreground block text-[11px]">
                  {current.subcategory}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Vendor / Supplier
              </span>
              <span className="font-semibold text-foreground">
                {current.vendor_name || current.vendor?.name || "Direct / Internal"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Department
              </span>
              <span className="font-semibold text-foreground">
                {current.department?.name || "Hotel General"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Payment Method
              </span>
              <span className="font-medium text-foreground uppercase">
                {current.payment_method.replace(/_/g, " ")}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Invoice Number
              </span>
              <span className="font-mono text-foreground">
                {current.invoice_number || "—"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                Reference Number
              </span>
              <span className="font-mono text-foreground">
                {current.reference_number || "—"}
              </span>
            </div>
          </div>

          {/* Description & Notes */}
          {(current.description || current.notes) && (
            <div className="space-y-2 bg-muted/20 p-3.5 rounded-xl border border-border/50">
              {current.description && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Description
                  </span>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {current.description}
                  </p>
                </div>
              )}
              {current.notes && (
                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Internal Notes / Audit Notes
                  </span>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {current.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Attachment / Receipt */}
          {current.receipt_url && (
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/60">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <div>
                  <span className="font-medium text-foreground block">
                    {current.receipt_file_name || "Expense Receipt"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Attached document</span>
                </div>
              </div>
              <a
                href={current.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Receipt
              </a>
            </div>
          )}

          {/* Audit Trail Timeline */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Financial Audit History
            </div>

            {isLoading ? (
              <div className="text-muted-foreground text-center py-4">Loading audit trail...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-muted-foreground text-[11px] py-2">
                Created at {new Date(current.created_at).toLocaleString()}
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2.5 p-2.5 bg-muted/30 rounded-lg text-[11px] border border-border/40"
                  >
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {log.action} by {log.performed_by_name || "Staff"}
                        </span>
                        <span className="text-muted-foreground font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-muted-foreground mt-0.5">{log.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-3 flex items-center justify-between">
          <div>
            {!isVoided && onVoid && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onVoid(current)}
                className="h-8 text-xs"
              >
                Void Expense
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isVoided && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(current)}
                className="h-8 text-xs"
              >
                Edit Expense
              </Button>
            )}
            <Button size="sm" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
