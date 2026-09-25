"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GuestFolio,
  FolioCharge,
  FolioPayment,
  FolioRefund,
  FolioEvent,
  FolioBalance,
} from "@/lib/billing/types";
import {
  postRoomChargesAction,
  voidFolioChargeAction,
} from "@/lib/billing/actions";
import { PostChargeModal } from "./post-charge-modal";
import { RecordPaymentModal } from "./record-payment-modal";
import { RefundModal } from "./refund-modal";
import { GenerateInvoiceModal } from "./generate-invoice-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  PlusCircle,
  FileText,
  Clock,
  Ban,
  BedDouble,
  User,
  RotateCcw,
} from "lucide-react";

interface FolioDetailViewProps {
  propertyId?: string;
  folio: GuestFolio;
  charges: FolioCharge[];
  payments: FolioPayment[];
  refunds: FolioRefund[];
  events: FolioEvent[];
  balance?: FolioBalance | null;
  onRefresh?: () => void;
}

export function FolioDetailView({
  propertyId: propIdProp,
  folio,
  charges,
  payments,
  refunds,
  events,
  balance,
  onRefresh,
}: FolioDetailViewProps) {
  const router = useRouter();
  const propertyId = propIdProp || folio.property_id;
  const handleRefresh = onRefresh || (() => router.refresh());

  const [isPostChargeOpen, setIsPostChargeOpen] = React.useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = React.useState(false);
  const [isGenerateInvoiceOpen, setIsGenerateInvoiceOpen] = React.useState(false);
  const [refundTarget, setRefundTarget] = React.useState<FolioPayment | null>(null);
  const [isPostingRoom, setIsPostingRoom] = React.useState(false);
  const [actionMsg, setActionMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeCharges = charges.filter((c) => !c.voided_at);
  const grossCharges = balance
    ? balance.gross_charges
    : activeCharges.reduce((acc, c) => acc + Number(c.total_amount), 0);
  const paymentsTotal = balance
    ? balance.payments_total
    : payments
        .filter((p) => p.status !== "VOIDED")
        .reduce((acc, p) => acc + Number(p.amount), 0);
  const refundsTotal = balance
    ? balance.refunds_total
    : refunds
        .filter((r) => r.status === "COMPLETED")
        .reduce((acc, r) => acc + Number(r.amount), 0);
  const netPayments = paymentsTotal - refundsTotal;
  const balanceDue = balance ? balance.balance_due : grossCharges - netPayments;
  const currency = folio.currency || "INR";

  const handlePostRoomCharges = async () => {
    setIsPostingRoom(true);
    setActionMsg(null);

    const res = await postRoomChargesAction(propertyId, folio.stay_id);
    setIsPostingRoom(false);

    if (!res.success) {
      setActionMsg({ type: "error", text: res.error || "Failed to post room charges." });
      return;
    }

    if (res.alreadyPosted) {
      setActionMsg({ type: "success", text: "Room charges have already been posted for this stay." });
    } else {
      setActionMsg({ type: "success", text: "Room charges successfully posted to folio." });
    }
    handleRefresh();
  };

  const handleVoidCharge = async (chargeId: string) => {
    const reason = window.prompt("Please enter the reason for voiding this charge:");
    if (!reason || !reason.trim()) return;

    const res = await voidFolioChargeAction(propertyId, chargeId, folio.id, reason.trim());
    if (!res.success) {
      alert(res.error || "Failed to void charge.");
      return;
    }
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/billing/folios"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Folios</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-foreground">{folio.folio_number}</h1>
            <Badge variant={folio.status === "SETTLED" || folio.status === "CLOSED" ? "success" : folio.status === "VOID" ? "danger" : "warning"}>
              {folio.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Opened on {new Date(folio.opened_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePostRoomCharges}
            disabled={isPostingRoom || folio.status === "CLOSED" || folio.status === "VOID"}
          >
            <BedDouble className="w-4 h-4 mr-1.5" />
            Post Room Charges
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPostChargeOpen(true)}
            disabled={folio.status === "CLOSED" || folio.status === "VOID"}
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Post Charge
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsRecordPaymentOpen(true)}
            disabled={folio.status === "CLOSED" || folio.status === "VOID"}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <CreditCard className="w-4 h-4 mr-1.5" />
            Record Payment
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsGenerateInvoiceOpen(true)}
            disabled={folio.status === "VOID"}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Generate Invoice
          </Button>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
            actionMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="opacity-70 hover:opacity-100">
            &times;
          </button>
        </div>
      )}

      {/* 2. Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Guest & Room Context */}
        <div className="p-4 rounded-xl bg-card border shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Guest & Room
          </span>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-500" />
              {folio.guest?.first_name} {folio.guest?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">
              Room {folio.stay?.room?.room_number || "N/A"} ({folio.stay?.room?.room_type?.name || "Standard"})
            </p>
          </div>
        </div>

        {/* Gross Charges */}
        <div className="p-4 rounded-xl bg-card border shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Charges
          </span>
          <p className="text-xl font-black text-foreground">
            {currency} {balance ? balance.gross_charges.toFixed(2) : "0.00"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Subtotal: {currency} {balance ? balance.charges_subtotal.toFixed(2) : "0.00"} • Tax: {currency} {balance ? balance.taxes_total.toFixed(2) : "0.00"}
          </p>
        </div>

        {/* Net Payments */}
        <div className="p-4 rounded-xl bg-card border shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Paid
          </span>
          <p className="text-xl font-black text-emerald-600">
            {currency} {balance ? balance.net_payments.toFixed(2) : "0.00"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Payments: {payments.length} • Refunds: {refunds.length}
          </p>
        </div>

        {/* Outstanding Balance Due */}
        <div className="p-4 rounded-xl bg-card border shadow-sm space-y-1 border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
            Balance Due
          </span>
          <p className={`text-2xl font-black ${balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {currency} {balanceDue.toFixed(2)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {balanceDue <= 0 ? "Folio is fully settled." : "Settlement required prior to checkout."}
          </p>
        </div>
      </div>

      {/* 3. Financial Transaction Ledger */}
      <div className="space-y-6">
        {/* Charges Table */}
        <div className="p-5 rounded-xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-foreground">Folio Charges & Adjustments</h3>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">
              {charges.filter((c) => !c.voided_at).length} Active Charges
            </span>
          </div>

          {charges.length === 0 ? (
            <div className="p-8 text-center rounded-lg bg-muted/20 border border-dashed text-xs text-muted-foreground">
              No charges have been posted to this folio yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Description</th>
                    <th className="pb-2 font-semibold text-right">Qty</th>
                    <th className="pb-2 font-semibold text-right">Unit Price</th>
                    <th className="pb-2 font-semibold text-right">Tax</th>
                    <th className="pb-2 font-semibold text-right">Total Amount</th>
                    <th className="pb-2 font-semibold text-center">Status</th>
                    <th className="pb-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {charges.map((c) => {
                    const isVoided = !!c.voided_at;
                    return (
                      <tr key={c.id} className={isVoided ? "opacity-50 line-through bg-muted/30" : "hover:bg-muted/10"}>
                        <td className="py-3 text-muted-foreground">{c.charge_date}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {c.charge_type}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-foreground">
                          {c.description}
                          {isVoided && c.void_reason && (
                            <span className="block text-[10px] text-rose-500 font-normal no-underline">
                              Void reason: {c.void_reason}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right text-muted-foreground">{c.quantity}</td>
                        <td className="py-3 text-right text-muted-foreground">{currency} {Number(c.unit_price).toFixed(2)}</td>
                        <td className="py-3 text-right text-muted-foreground">{currency} {Number(c.tax_amount).toFixed(2)}</td>
                        <td className="py-3 text-right font-bold text-foreground">
                          {currency} {Number(c.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3 text-center">
                          {isVoided ? (
                            <Badge variant="danger" size="sm">VOIDED</Badge>
                          ) : (
                            <Badge variant="success" size="sm">POSTED</Badge>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {!isVoided && folio.status !== "CLOSED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              onClick={() => handleVoidCharge(c.id)}
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Void
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payments Table */}
        <div className="p-5 rounded-xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">Payments & Settlements</h3>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">
              {payments.length} Payments Recorded
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center rounded-lg bg-muted/20 border border-dashed text-xs text-muted-foreground">
              No payments have been recorded for this folio yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-semibold">Payment Ref</th>
                    <th className="pb-2 font-semibold">Date & Time</th>
                    <th className="pb-2 font-semibold">Method</th>
                    <th className="pb-2 font-semibold">Notes</th>
                    <th className="pb-2 font-semibold text-right">Amount</th>
                    <th className="pb-2 font-semibold text-center">Status</th>
                    <th className="pb-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/10">
                      <td className="py-3 font-mono font-bold text-foreground">{p.payment_reference}</td>
                      <td className="py-3 text-muted-foreground">{new Date(p.paid_at).toLocaleString()}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{p.notes || "-"}</td>
                      <td className="py-3 text-right font-black text-emerald-600 text-sm">
                        {currency} {Number(p.amount).toFixed(2)}
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant={p.status === "COMPLETED" ? "success" : p.status === "REFUNDED" ? "danger" : "warning"} size="sm">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {p.status === "COMPLETED" && folio.status !== "CLOSED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] text-amber-600 hover:text-amber-700"
                            onClick={() => setRefundTarget(p)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Refund
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Timeline Events Audit Log */}
        <div className="p-5 rounded-xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Clock className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-foreground">Financial Audit Timeline</h3>
          </div>

          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{ev.event_type.replace(/_/g, " ")}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    By {ev.actor?.full_name || ev.actor_type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <PostChargeModal
        isOpen={isPostChargeOpen}
        onClose={() => setIsPostChargeOpen(false)}
        propertyId={propertyId}
        folioId={folio.id}
        currency={currency}
        onSuccess={handleRefresh}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        propertyId={propertyId}
        folioId={folio.id}
        currency={currency}
        balanceDue={balanceDue}
        onSuccess={handleRefresh}
      />

      {refundTarget && (
        <RefundModal
          isOpen={!!refundTarget}
          onClose={() => setRefundTarget(null)}
          propertyId={propertyId}
          folioId={folio.id}
          payment={refundTarget}
          onSuccess={handleRefresh}
        />
      )}

      <GenerateInvoiceModal
        isOpen={isGenerateInvoiceOpen}
        onClose={() => setIsGenerateInvoiceOpen(false)}
        propertyId={propertyId}
        folioId={folio.id}
        defaultGuestName={`${folio.guest?.first_name || ""} ${folio.guest?.last_name || ""}`.trim()}
        defaultEmail={folio.guest?.email || ""}
        onSuccess={(invoiceId) => {
          router.push(`/billing/invoices/${invoiceId}`);
        }}
      />
    </div>
  );
}
