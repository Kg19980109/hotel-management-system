"use client";

import * as React from "react";
import Link from "next/link";
import { Invoice } from "@/lib/billing/types";
import { voidInvoiceAction } from "@/lib/billing/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Printer,
  Ban,
  Building2,
} from "lucide-react";

interface InvoiceDetailViewProps {
  propertyId?: string;
  invoice: Invoice;
  onRefresh?: () => void;
}

export function InvoiceDetailView({
  propertyId: propIdProp,
  invoice,
  onRefresh,
}: InvoiceDetailViewProps) {
  const [isVoiding, setIsVoiding] = React.useState(false);
  const propertyId = propIdProp || invoice.property_id;
  const handleRefresh = onRefresh || (() => window.location.reload());

  const handlePrint = () => {
    window.print();
  };

  const handleVoidInvoice = async () => {
    const reason = window.prompt("Please enter the reason for voiding this invoice:");
    if (!reason || !reason.trim()) return;

    setIsVoiding(true);
    const res = await voidInvoiceAction(propertyId, invoice.id, reason.trim());
    setIsVoiding(false);

    if (!res.success) {
      alert(res.error || "Failed to void invoice.");
      return;
    }

    handleRefresh();
  };

  const currency = invoice.currency || "INR";
  const items = invoice.items || [];
  const isVoid = invoice.invoice_status === "VOID";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Action Bar (Hidden on print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/billing/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Invoices</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print Invoice
          </Button>

          {!isVoid && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleVoidInvoice}
              disabled={isVoiding}
            >
              <Ban className="w-4 h-4 mr-1.5" />
              Void Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Printable Invoice Paper Sheet */}
      <div className="p-8 sm:p-12 rounded-2xl bg-white text-slate-900 border shadow-lg print:border-none print:shadow-none print:p-0 space-y-8">
        {/* Invoice Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-amber-600" />
              <h2 className="text-xl font-black text-slate-900 tracking-tight">StayHub Hotel</h2>
            </div>
            <p className="text-xs text-slate-500">Official Guest Tax Invoice</p>
          </div>

          <div className="sm:text-right space-y-1">
            <div className="flex sm:justify-end items-center gap-2">
              <h1 className="text-xl font-mono font-black text-slate-900">{invoice.invoice_number}</h1>
              <Badge variant={invoice.invoice_status === "PAID" ? "success" : isVoid ? "danger" : "warning"} size="sm">
                {invoice.invoice_status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Date: <span className="font-semibold text-slate-700">{invoice.invoice_date}</span>
            </p>
            <p className="text-xs text-slate-500">
              Due Date: <span className="font-semibold text-slate-700">{invoice.due_date}</span>
            </p>
          </div>
        </div>

        {isVoid && invoice.void_reason && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            <span className="font-bold">VOID NOTICE:</span> This invoice was voided. Reason: {invoice.void_reason}
          </div>
        )}

        {/* Billed To & Stay Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1 bg-slate-50 p-4 rounded-xl border">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
              Billed To
            </span>
            <p className="font-bold text-slate-900 text-sm">{invoice.billing_name}</p>
            {invoice.billing_email && <p className="text-slate-600">{invoice.billing_email}</p>}
            {invoice.billing_address && (
              <p className="text-slate-600 whitespace-pre-line pt-1">{invoice.billing_address}</p>
            )}
          </div>

          <div className="space-y-1 bg-slate-50 p-4 rounded-xl border">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
              Stay Information
            </span>
            <p className="font-semibold text-slate-800">
              Room: <span className="font-bold text-slate-900">{invoice.stay?.room?.room_number || "N/A"}</span>
            </p>
            <p className="text-slate-600">
              Primary Guest: {invoice.guest?.first_name} {invoice.guest?.last_name}
            </p>
            <p className="text-slate-500 text-[11px] pt-1">
              Issued at: {new Date(invoice.issued_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-900 text-left font-bold">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Rate ({currency})</th>
                <th className="pb-2 text-right">Tax ({currency})</th>
                <th className="pb-2 text-right">Amount ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-medium text-slate-900">{item.description}</td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right">{Number(item.unit_price).toFixed(2)}</td>
                  <td className="py-3 text-right">{Number(item.tax_amount).toFixed(2)}</td>
                  <td className="py-3 text-right font-bold text-slate-900">
                    {Number(item.total_amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end pt-4 border-t">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium">{currency} {Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span className="font-medium">- {currency} {Number(invoice.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Tax (GST)</span>
              <span className="font-medium">{currency} {Number(invoice.tax_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t">
              <span>Total Amount</span>
              <span>{currency} {Number(invoice.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Paid Amount</span>
              <span>{currency} {Number(invoice.paid_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t">
              <span>Balance Due</span>
              <span className={Number(invoice.balance_due) > 0 ? "text-amber-600" : "text-emerald-600"}>
                {currency} {Number(invoice.balance_due).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="border-t pt-6 text-center text-slate-400 text-[11px] space-y-1">
          <p>Thank you for staying with us. We look forward to welcoming you again.</p>
          <p>This is a computer-generated tax invoice issued by StayHub PMS.</p>
        </div>
      </div>
    </div>
  );
}
