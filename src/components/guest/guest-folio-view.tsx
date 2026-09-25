"use client";

import * as React from "react";
import Link from "next/link";
import {
  GuestPortalFolioContext,
} from "@/lib/billing/types";
import { GuestVerifiedSessionContext } from "@/lib/guest-portal/types";
import {
  Receipt,
  ArrowLeft,
  CreditCard,
  BedDouble,
  Utensils,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface GuestFolioViewProps {
  folioContext: GuestPortalFolioContext | null;
  session?: GuestVerifiedSessionContext | null;
}

export function GuestFolioView({ folioContext, session }: GuestFolioViewProps) {
  if (!folioContext || !folioContext.has_folio) {
    return (
      <div className="p-4 space-y-6">
        <Link
          href="/guest/home"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
            <Receipt className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Active Folio Charges</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              You do not have any room charges or incidentals posted to your room folio yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currency = folioContext.currency || "INR";
  const balanceDue = folioContext.balance_due;
  const isSettled = balanceDue <= 0;

  const getChargeIcon = (type: string) => {
    switch (type) {
      case "ROOM":
        return <BedDouble className="w-4 h-4 text-indigo-400" />;
      case "ROOM_SERVICE":
      case "RESTAURANT":
        return <Utensils className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/home"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <span className="font-mono text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          {folioContext.folio_number}
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-black text-white">Your Room Folio & Charges</h2>
        <p className="text-xs text-slate-400">
          Review your in-room dining, accommodations, and payments recorded for Room{" "}
          <span className="text-amber-400 font-semibold">{session?.room_number || "Stay"}</span>.
        </p>
      </div>

      {/* Balance Due Card */}
      <div className={`p-5 rounded-2xl border text-center space-y-2 ${
        isSettled
          ? "bg-gradient-to-br from-slate-900 to-emerald-950/30 border-emerald-500/30"
          : "bg-gradient-to-br from-slate-900 to-amber-950/30 border-amber-500/30"
      }`}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Current Balance Due
        </span>
        <p className={`text-3xl font-black ${isSettled ? "text-emerald-400" : "text-amber-400"}`}>
          {currency} {balanceDue.toFixed(2)}
        </p>
        <div className="flex items-center justify-center gap-1.5 text-xs">
          {isSettled ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All charges settled
            </span>
          ) : (
            <span className="text-amber-400 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Settlement due upon check-out
            </span>
          )}
        </div>
      </div>

      {/* Charges Breakdown */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Posted Charges ({folioContext.charges.length})
        </h3>

        {folioContext.charges.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            No incidentals posted.
          </div>
        ) : (
          <div className="space-y-2">
            {folioContext.charges.map((charge) => (
              <div
                key={charge.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getChargeIcon(charge.charge_type)}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">{charge.description}</h4>
                    <p className="text-[10px] text-slate-400">
                      {charge.charge_date} • Qty: {charge.quantity}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-extrabold text-white">
                    {currency} {Number(charge.total_amount).toFixed(2)}
                  </p>
                  {Number(charge.tax_amount) > 0 && (
                    <p className="text-[10px] text-slate-500">
                      Incl. {currency} {Number(charge.tax_amount).toFixed(2)} Tax
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payments Recorded */}
      {folioContext.payments.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Recorded Payments ({folioContext.payments.length})
          </h3>

          <div className="space-y-2">
            {folioContext.payments.map((payment) => (
              <div
                key={payment.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">{payment.payment_method} Settlement</h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {payment.payment_reference} • {new Date(payment.paid_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <p className="text-xs font-black text-emerald-400">
                  - {currency} {Number(payment.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Totals */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>Charges Subtotal</span>
          <span>{currency} {folioContext.charges_subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Applicable Taxes (GST)</span>
          <span>{currency} {folioContext.taxes_total.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Total Payments</span>
          <span className="text-emerald-400">- {currency} {folioContext.net_payments.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm font-black text-white pt-2 border-t border-slate-800">
          <span>Total Balance</span>
          <span className="text-amber-400">{currency} {balanceDue.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
