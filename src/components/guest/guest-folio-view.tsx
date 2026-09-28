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
      <div className="p-4 space-y-6 pb-28 max-w-lg mx-auto">
        <Link
          href="/guest/home"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="p-10 rounded-3xl bg-white border border-[#EAE3D2] text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF4E6] border border-[#D4AF37]/30 text-[#A67C1E] mx-auto flex items-center justify-center">
            <Receipt className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-serif font-semibold text-slate-900">No Active Folio Charges</h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              No charges or incidentals have been posted to your stay yet. All dining and service requests will appear here in real time.
            </p>
          </div>
          <Link
            href="/guest/home"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 text-xs font-semibold transition"
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
        return <BedDouble className="w-4 h-4 text-indigo-600" />;
      case "ROOM_SERVICE":
      case "RESTAURANT":
        return <UtensilsCrossed className="w-4 h-4 text-[#D4AF37]" />;
      case "LAUNDRY":
        return <Shirt className="w-4 h-4 text-indigo-600" />;
      case "SPA":
        return <Flower2 className="w-4 h-4 text-pink-600" />;
      case "TRANSPORT":
        return <Car className="w-4 h-4 text-teal-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#A67C1E]" />;
    }
  };

  // Group charges visually
  const roomCharges = folioContext.charges.filter((c) => c.charge_type === "ROOM");
  const diningCharges = folioContext.charges.filter((c) => ["ROOM_SERVICE", "RESTAURANT"].includes(c.charge_type));
  const serviceCharges = folioContext.charges.filter((c) => !["ROOM", "ROOM_SERVICE", "RESTAURANT"].includes(c.charge_type));

  return (
    <div className="space-y-5 pb-28">
      {/* ── 1. EDITORIAL HEADER BANNER ── */}
      <div className="relative overflow-hidden bg-[#0B1526] text-white">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0B1526] via-[#111D31] to-[#0B1526]">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6 space-y-3.5">
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/stay"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
              aria-label="Back to Stay"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>My Stay</span>
            </Link>

            <span className="font-mono text-xs text-[#E4C980] font-semibold bg-white/10 px-3 py-1 rounded-full border border-[#D4AF37]/35 shadow-2xs">
              Folio #{folioContext.folio_number}
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-[#D4AF37]/35 text-[#E4C980] text-[10px] font-medium tracking-wide">
              <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Statement of Account</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-white tracking-tight leading-tight">
              Guest Folio
            </h1>
            <p className="text-xs text-slate-300/80 leading-relaxed max-w-sm">
              Live room billing and incidental charges for <span className="text-[#E4C980] font-semibold">Room {session?.room_number || "Stay"}</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5 max-w-lg mx-auto">
        {/* ── 2. AUTHORITATIVE BALANCE DUE HERO CARD ── */}
        <div className={`p-6 rounded-3xl border text-center space-y-3 shadow-md relative overflow-hidden ${
          isSettled
            ? "bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-200"
            : "bg-gradient-to-br from-amber-50 via-white to-amber-100/50 border-amber-300"
        }`}>
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${
            isSettled
              ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600"
              : "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600"
          }`} />

          <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-widest font-serif block pt-1">
            {isSettled ? "Settlement Status" : "Current Outstanding Balance"}
          </span>

          <p className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight ${
            isSettled ? "text-emerald-700" : "text-slate-900"
          }`}>
            {currSym}{balanceDue.toFixed(2)}
          </p>

          <div className="flex items-center justify-center gap-1.5 text-xs">
            {isSettled ? (
              <span className="text-emerald-800 font-bold flex items-center gap-1.5 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>All charges settled in full</span>
              </span>
            ) : (
              <span className="text-amber-800 font-bold flex items-center gap-1.5 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Settlement due upon check-out</span>
              </span>
            )}
          </div>
        </div>

        {/* ── 3. FINANCIAL SUMMARY STATEMENT ── */}
        <div className="p-5 rounded-3xl bg-white border border-[#EAE3D2] space-y-3 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 pb-2 border-b border-[#EAE3D2]">
            <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
              Statement Summary
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Charges Subtotal</span>
              <span className="font-mono font-bold text-slate-900">
                {currSym}{folioContext.charges_subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Applicable Taxes (GST / VAT)</span>
              <span className="font-mono font-bold text-slate-900">
                {currSym}{folioContext.taxes_total.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Total Payments Recorded</span>
              <span className="font-mono font-bold text-emerald-700">
                − {currSym}{folioContext.net_payments.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-3 border-t border-[#EAE3D2]">
              <span className="font-serif">Outstanding Balance</span>
              <span className="font-mono text-amber-700 text-base font-bold">
                {currSym}{balanceDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── 4. POSTED CHARGES BREAKDOWN ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
              Posted Charges ({folioContext.charges.length})
            </h2>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">Billed to Room</span>
          </div>

          {folioContext.charges.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-white border border-[#EAE3D2] text-xs text-slate-500 shadow-2xs">
              No incidentals or room charges posted yet.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Room Charges Group */}
              {roomCharges.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider px-1 font-serif">
                    Accommodation ({roomCharges.length})
                  </span>
                  <div className="space-y-2">
                    {roomCharges.map((charge) => (
                      <div
                        key={charge.id}
                        className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 border border-indigo-200/90 flex items-center justify-between gap-3 shadow-2xs relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-violet-600" />
                        <div className="flex items-start gap-3 min-w-0 pt-0.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                            <BedDouble className="w-4 h-4 text-white" />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 truncate">{charge.description}</h3>
                            <p className="text-[10px] text-slate-500">
                              {charge.charge_date} • Qty: {charge.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-slate-900">
                            {currSym}{Number(charge.total_amount).toFixed(2)}
                          </p>
                          {Number(charge.tax_amount) > 0 && (
                            <p className="text-[10px] text-slate-500 font-mono">
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
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider px-1 font-serif">
                    Dining &amp; Room Service ({diningCharges.length})
                  </span>
                  <div className="space-y-2">
                    {diningCharges.map((charge) => (
                      <div
                        key={charge.id}
                        className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border border-amber-200/90 flex items-center justify-between gap-3 shadow-2xs relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600" />
                        <div className="flex items-start gap-3 min-w-0 pt-0.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                            <UtensilsCrossed className="w-4 h-4 text-white" />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 truncate">{charge.description}</h3>
                            <p className="text-[10px] text-slate-500">
                              {charge.charge_date} • Qty: {charge.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-slate-900">
                            {currSym}{Number(charge.total_amount).toFixed(2)}
                          </p>
                          {Number(charge.tax_amount) > 0 && (
                            <p className="text-[10px] text-slate-500 font-mono">
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
                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider px-1 font-serif">
                    Guest Services &amp; Ancillaries ({serviceCharges.length})
                  </span>
                  <div className="space-y-2">
                    {serviceCharges.map((charge) => (
                      <div
                        key={charge.id}
                        className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 border border-purple-200/90 flex items-center justify-between gap-3 shadow-2xs relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-600" />
                        <div className="flex items-start gap-3 min-w-0 pt-0.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                            {getChargeIcon(charge.charge_type)}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 truncate">{charge.description}</h3>
                            <p className="text-[10px] text-slate-500">
                              {charge.charge_date} • Qty: {charge.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-slate-900">
                            {currSym}{Number(charge.total_amount).toFixed(2)}
                          </p>
                          {Number(charge.tax_amount) > 0 && (
                            <p className="text-[10px] text-slate-500 font-mono">
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
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider px-0.5 font-serif">
              Payment Receipts ({folioContext.payments.length})
            </h2>

            <div className="space-y-2">
              {folioContext.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border border-emerald-200/90 flex items-center justify-between gap-3 shadow-2xs relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-600" />
                  <div className="flex items-center gap-3 pt-0.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-xs flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-bold text-slate-900">{payment.payment_method} Payment</h3>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Ref: {payment.payment_reference || "Direct"} • {new Date(payment.paid_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-mono font-bold text-emerald-700">
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
