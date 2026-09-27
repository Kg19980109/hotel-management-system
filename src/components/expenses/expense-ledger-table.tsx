"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/reports/formatters";
import type {
  HotelExpense,
  ExpenseFilterParams,
  ExpensePaginationResult,
} from "@/lib/expenses/types";
import {
  Eye,
  Edit2,
  Ban,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface ExpenseLedgerTableProps {
  data: ExpensePaginationResult;
  filters: ExpenseFilterParams;
  currency?: string;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: ExpenseFilterParams["sortBy"]) => void;
  onViewExpense: (expense: HotelExpense) => void;
  onEditExpense: (expense: HotelExpense) => void;
  onVoidExpense: (expense: HotelExpense) => void;
}

export function ExpenseLedgerTable({
  data,
  filters,
  currency = "INR",
  isLoading = false,
  onPageChange,
  onSortChange,
  onViewExpense,
  onEditExpense,
  onVoidExpense,
}: ExpenseLedgerTableProps) {
  const { items, totalCount, page, totalPages, pageSize } = data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case "RECORDED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Recorded
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
            Draft
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Voided
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const formatted = method.replace(/_/g, " ");
    return (
      <span className="text-[11px] font-medium text-muted-foreground uppercase">
        {formatted}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* ============================================================ */}
      {/* DESKTOP FINANCIAL LEDGER TABLE                                */}
      {/* ============================================================ */}
      <div className="hidden md:block bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th
                  onClick={() => onSortChange("expense_date")}
                  className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold">Voucher & Expense</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Vendor / Supplier</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Payment Method</th>
                <th
                  onClick={() => onSortChange("amount")}
                  className="px-4 py-3 font-semibold text-right cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span>Loading financial ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileText className="w-8 h-8 text-muted-foreground/40" />
                      <span className="font-medium text-foreground">No expenses found</span>
                      <span className="text-xs text-muted-foreground">
                        Try adjusting your filters or record a new expense voucher.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((exp) => {
                  const isVoided = exp.status === "CANCELLED";
                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-muted/40 transition-colors ${
                        isVoided ? "opacity-60 bg-muted/20" : ""
                      }`}
                    >
                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-muted-foreground">
                        {exp.expense_date}
                      </td>

                      {/* Voucher & Title */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground truncate max-w-[220px]">
                          {exp.title}
                        </div>
                        <div className="text-[11px] font-mono text-primary flex items-center gap-1.5 mt-0.5">
                          <span>{exp.expense_number}</span>
                          {exp.invoice_number && (
                            <span className="text-muted-foreground">• Inv #{exp.invoice_number}</span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-foreground">
                          {exp.category?.name || "General"}
                        </span>
                        {exp.subcategory && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">
                            {exp.subcategory}
                          </div>
                        )}
                      </td>

                      {/* Vendor */}
                      <td className="px-4 py-3.5 text-muted-foreground truncate max-w-[160px]">
                        {exp.vendor_name || exp.vendor?.name || "—"}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 text-muted-foreground truncate max-w-[140px]">
                        {exp.department?.name || "—"}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3.5">
                        {getPaymentMethodBadge(exp.payment_method)}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">
                        <span className={isVoided ? "line-through text-muted-foreground" : ""}>
                          {formatCurrency(exp.amount, currency)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {getStatusBadge(exp.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewExpense(exp)}
                            title="View Details & Audit Log"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {!isVoided && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditExpense(exp)}
                                title="Edit Expense"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onVoidExpense(exp)}
                                title="Void / Cancel Expense"
                                className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE EXPENSE CARDS (< 768px)                                */}
      {/* ============================================================ */}
      <div className="md:hidden space-y-2.5">
        {isLoading ? (
          <Card className="p-8 text-center text-muted-foreground text-xs">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span>Loading ledger...</span>
            </div>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-xs">
            No expenses recorded.
          </Card>
        ) : (
          items.map((exp) => {
            const isVoided = exp.status === "CANCELLED";
            return (
              <Card
                key={exp.id}
                className={`p-3.5 border-border/80 space-y-2.5 ${
                  isVoided ? "opacity-60 bg-muted/20" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">
                      {exp.title}
                    </div>
                    <div className="text-[11px] font-mono text-primary">
                      {exp.expense_number} • {exp.expense_date}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold font-mono text-foreground ${
                        isVoided ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {formatCurrency(exp.amount, currency)}
                    </div>
                    <div className="mt-0.5">{getStatusBadge(exp.status)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span className="bg-muted px-2 py-0.5 rounded text-foreground font-medium">
                    {exp.category?.name || "General"}
                  </span>
                  {exp.vendor_name && <span>Vendor: {exp.vendor_name}</span>}
                  <span>• {exp.payment_method}</span>
                </div>

                <div className="flex items-center justify-end gap-1 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewExpense(exp)}
                    className="h-7 text-xs px-2.5"
                  >
                    View
                  </Button>
                  {!isVoided && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditExpense(exp)}
                        className="h-7 text-xs px-2.5"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onVoidExpense(exp)}
                        className="h-7 text-xs px-2.5 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                      >
                        Void
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* PAGINATION BAR                                               */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between px-2 py-2 text-xs text-muted-foreground">
        <div>
          Showing {items.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
          {Math.min(page * pageSize, totalCount)} of {totalCount} vouchers
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
            className="h-8 text-xs gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </Button>
          <span className="text-xs font-medium text-foreground px-1">
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
            className="h-8 text-xs gap-1"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
