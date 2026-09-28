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
  UtensilsCrossed,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  FileText,
  DollarSign,
  Shirt,
  Flower2,
  Car,
  Tag,
} from "lucide-react";

interface GuestFolioViewProps {
  folioContext: GuestPortalFolioContext | null;
  session?: GuestVerifiedSessionContext | null;
}

export function GuestFolioView({ folioContext, session }: GuestFolioViewProps) {
  if (!folioContext || !folioContext.has_folio) {
    return (
      <div className="space-y-6 pb-28 max-w-lg mx-auto">
        <Link
          href="/guest/home"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="p-10 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 text-center space-y-4 shadow-lg shadow-violet-950/20 backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-violet-950/60 border border-violet-500/30 text-violet-300 mx-auto flex items-center justify-center">
            <Receipt className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-serif font-bold text-white">No Active Folio Charges</h1>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed font-sans">
              No charges or incidentals have been posted to your stay yet. All dining and service requests will appear here in real time.
            </p>
          </div>
          <Link
            href="/guest/home"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-violet-950/30 transition"
          >
            Return to Guest Home
          </Link>
        </div>
      </div>
    );
  }

  const currency = folioContext.currency || "INR";
  const currSym = currency === "INR" ? "₹" : `${currency} `;
  const balanceDue = folioContext.balance_due;
  const isSettled = balanceDue <= 0;

  const getChargeIcon = (type: string) => {
    switch (type) {
      case "ROOM":
        return <BedDouble className="w-4 h-4 text-indigo-400" />;
      case "ROOM_SERVICE":
      case "RESTAURANT":
        return <UtensilsCrossed className="w-4 h-4 text-violet-400" />;
      case "LAUNDRY":
        return <Shirt className="w-4 h-4 text-indigo-400" />;
      case "SPA":
        return <Flower2 className="w-4 h-4 text-pink-400" />;
      case "TRANSPORT":
        return <Car className="w-4 h-4 text-teal-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-violet-400" />;
    }
  };

  // Group charges visually
  const roomCharges = folioContext.charges.filter((c) => c.charge_type === "ROOM");
  const diningCharges = folioContext.charges.filter((c) => ["ROOM_SERVICE", "RESTAURANT"].includes(c.charge_type));
  const serviceCharges = folioContext.charges.filter((c) => !["ROOM", "ROOM_SERVICE", "RESTAURANT"].includes(c.charge_type));

  return (
    <div className="space-y-5 pb-28">
      {/* ── 1. LUXURY VIOLET HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B132B] border border-violet-500/30 text-white shadow-xl shadow-violet-950/40">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-violet-900/30 via-[#0B132B] to-indigo-950/40 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-600/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-6 space-y-3.5">
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/stay"
              className="inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-white transition font-medium"
              aria-label="Back to Stay"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>My Stay</span>
            </Link>

            <span className="font-mono text-xs text-violet-200 font-bold bg-violet-950/70 px-3 py-1 rounded-full border border-violet-400/30 shadow-xs">
              Folio #{folioContext.folio_number}
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-200 text-[10px] font-semibold tracking-wide backdrop-blur-xs">
              <Receipt className="w-3.5 h-3.5 text-violet-400" />
              <span>Statement of Account</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
              Guest Folio
            </h1>
            <p className="text-xs text-slate-300/85 leading-relaxed max-w-sm font-sans">
              Live room billing and incidental charges for <span className="text-violet-300 font-bold">Room {session?.room_number || "Stay"}</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 max-w-lg mx-auto">
        {/* ── 2. AUTHORITATIVE BALANCE DUE HERO CARD ── */}
        <div className={`p-6 rounded-3xl border text-center space-y-3 shadow-lg backdrop-blur-md ${
          isSettled
            ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300 shadow-emerald-950/30"
            : "bg-gradient-to-br from-violet-950/80 via-[#111C38] to-[#0B132B] border-violet-500/35 shadow-violet-950/40"
        }`}>
          <span className="text-[10.5px] font-bold text-violet-300 uppercase tracking-widest font-sans block">
            {isSettled ? "Settlement Status" : "Current Outstanding Balance"}
          </span>

          <p className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight ${
            isSettled ? "text-emerald-300" : "text-white"
          }`}>
            {currSym}{balanceDue.toFixed(2)}
          </p>

          <div className="flex items-center justify-center gap-1.5 text-xs">
            {isSettled ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>All charges settled in full</span>
              </span>
            ) : (
              <span className="text-violet-200 font-semibold flex items-center gap-1.5 bg-violet-950/70 px-3 py-1 rounded-full border border-violet-400/40 shadow-xs">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span>Settlement due upon check-out</span>
              </span>
            )}
          </div>
        </div>

        {/* ── 3. FINANCIAL SUMMARY STATEMENT ── */}
        <div className="p-5 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 space-y-3 shadow-lg shadow-violet-950/20 backdrop-blur-md">
          <div className="flex items-center gap-2 pb-2 border-b border-violet-500/20">
            <FileText className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans">
              Statement Summary
            </h2>
          </div>

          <div className="space-y-2.5 text-xs font-sans">
            <div className="flex items-center justify-between text-slate-300">
              <span>Charges Subtotal</span>
              <span className="font-mono font-bold text-white">
                {currSym}{folioContext.charges_subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span>Applicable Taxes (GST / VAT)</span>
              <span className="font-mono font-bold text-white">
                {currSym}{folioContext.taxes_total.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span>Total Payments Recorded</span>
              <span className="font-mono font-bold text-emerald-400">
                − {currSym}{folioContext.net_payments.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm font-bold text-white pt-3 border-t border-violet-500/20">
              <span className="font-sans">Outstanding Balance</span>
              <span className="font-mono text-violet-300 text-base">
                {currSym}{balanceDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── 4. POSTED CHARGES BREAKDOWN ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans">
              Posted Charges ({folioContext.charges.length})
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">Billed to Room</span>
          </div>

          {folioContext.charges.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-[#111C38]/80 border border-violet-500/20 text-xs text-slate-400 shadow-md shadow-violet-950/15">
              No incidentals or room charges posted yet.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Room Charges Group */}
              {roomCharges.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider px-1 font-sans">
                    Accommodation ({roomCharges.length})
                  </span>
                  <div className="space-y-2">
                    {roomCharges.map((charge) => (
                      <div
                        key={charge.id}
                        className="p-3.5 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 flex items-center justify-between gap-3 shadow-md shadow-violet-950/15 backdrop-blur-md"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                            {getChargeIcon(charge.charge_type)}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="text-xs font-semibold text-white truncate">{charge.description}</h3>
                            <p className="text-[10px] text-slate-400 font-sans">
                              {charge.charge_date} • Qty: {charge.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-white">
                            {currSym}{Number(charge.total_amount).toFixed(2)}
                          </p>
                          {Number(charge.tax_amount) > 0 && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Incl. {currSym}{Number(charge.tax_amount).toFixed(2)} Tax
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dining & Room Service Group */}
              {diningCharges.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider px-1 font-sans">
                    Dining &amp; Room Service ({diningCharges.length})
                  </span>
                  <div className="space-y-2">
                    {diningCharges.map((charge) => (
                      <div
                        key={charge.id}
                        className="p-3.5 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 flex items-center justify-between gap-3 shadow-md shadow-violet-950/15 backdrop-blur-md"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-violet-950/60 text-violet-300 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
                            {getChargeIcon(charge.charge_type)}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="text-xs font-semibold text-white truncate">{charge.description}</h3>
                            <p className="text-[10px] text-slate-400 font-sans">
                              {charge.charge_date} • Qty: {charge.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-white">
                            {currSym}{Number(charge.total_amount).toFixed(2)}
                          </p>
                          {Number(charge.tax_amount) > 0 && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Incl. {currSym}{Number(charge.tax_amount).toFixed(2)} Tax
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service & Ancillary Group */}
              {serviceCharges.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider px-1 font-sans">
                    Guest Services &amp; Ancillaries ({serviceCharges.length})
                  </span>
                  <div className="space-y-2">
                    {serviceCharges.map((charge) => (
                      <div
                        key={charge.id}
                        className="p-3.5 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 flex items-center justify-between gap-3 shadow-md shadow-violet-950/15 backdrop-blur-md"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-slate-300 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            {getChargeIcon(charge.charge_type)}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="text-xs font-semibold text-white truncate">{charge.description}</h3>
                            <p className="text-[10px] text-slate-400 font-sans">
                              {charge.charge_date} • Qty: {charge.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-white">
                            {currSym}{Number(charge.total_amount).toFixed(2)}
                          </p>
                          {Number(charge.tax_amount) > 0 && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Incl. {currSym}{Number(charge.tax_amount).toFixed(2)} Tax
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 5. RECORDED PAYMENTS ── */}
        {folioContext.payments.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider px-0.5 font-sans">
              Payment Receipts ({folioContext.payments.length})
            </h2>

            <div className="space-y-2">
              {folioContext.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-3.5 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 flex items-center justify-between gap-3 shadow-md shadow-violet-950/15 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-semibold text-white">{payment.payment_method} Payment</h3>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Ref: {payment.payment_reference || "Direct"} • {new Date(payment.paid_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-mono font-bold text-emerald-400">
                    − {currSym}{Number(payment.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
