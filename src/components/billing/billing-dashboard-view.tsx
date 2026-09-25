"use client";

import * as React from "react";
import Link from "next/link";
import {
  BillingKPIs,
  GuestFolio,
  Invoice,
  FolioPayment,
} from "@/lib/billing/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Receipt,
  FileText,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface BillingDashboardViewProps {
  propertyId?: string;
  kpis: BillingKPIs;
  recentFolios: GuestFolio[];
  recentInvoices: Invoice[];
  recentPayments?: FolioPayment[];
  onRefresh: () => void;
}

export function BillingDashboardView({
  kpis,
  recentFolios,
  recentInvoices,
  onRefresh,
}: BillingDashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Quick Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card border rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/billing/folios">
            <Button size="sm" variant="outline">
              <Receipt className="w-4 h-4 mr-1.5 text-amber-500" />
              All Guest Folios
            </Button>
          </Link>
          <Link href="/billing/invoices">
            <Button size="sm" variant="outline">
              <FileText className="w-4 h-4 mr-1.5 text-indigo-500" />
              Tax Invoices
            </Button>
          </Link>
          <Link href="/billing/payments">
            <Button size="sm" variant="outline">
              <CreditCard className="w-4 h-4 mr-1.5 text-emerald-500" />
              Payments Register
            </Button>
          </Link>
        </div>

        <Button size="sm" variant="ghost" onClick={onRefresh}>
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Refresh Data
        </Button>
      </div>

      {/* 2. Master Financial KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Today's Revenue */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Today&apos;s Revenue
          </p>
          <p className="text-xl font-black text-emerald-600">
            INR {kpis.todayRevenue.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {kpis.todayPaymentsCount} payment{kpis.todayPaymentsCount === 1 ? "" : "s"}
          </p>
        </div>

        {/* Outstanding Balance */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
            Outstanding Due
          </p>
          <p className="text-xl font-black text-amber-600">
            INR {kpis.outstandingBalance.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Unsettled stay balance</p>
        </div>

        {/* Open Folios */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Open Folios
          </p>
          <p className="text-xl font-black text-foreground">{kpis.openFoliosCount}</p>
          <p className="text-[10px] text-muted-foreground">Active in-house stays</p>
        </div>

        {/* Settled Folios */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Settled Folios
          </p>
          <p className="text-xl font-black text-foreground">{kpis.settledFoliosCount}</p>
          <p className="text-[10px] text-muted-foreground">Zero balance pending checkout</p>
        </div>

        {/* Today's Payments */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Transactions
          </p>
          <p className="text-xl font-black text-foreground">{kpis.todayPaymentsCount}</p>
          <p className="text-[10px] text-muted-foreground">Payments collected today</p>
        </div>

        {/* Today's Refunds */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Refunds Today
          </p>
          <p className="text-xl font-black text-rose-600">
            INR {kpis.todayRefundsTotal.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Processed refunds</p>
        </div>
      </div>

      {/* 3. Folios & Invoices Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Guest Folios */}
        <div className="p-5 rounded-xl bg-card border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-foreground">Recent Guest Folios</h3>
            </div>
            <Link
              href="/billing/folios"
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentFolios.length === 0 ? (
            <div className="p-8 text-center rounded-lg bg-muted/20 border border-dashed text-xs text-muted-foreground">
              No folios found for this property.
            </div>
          ) : (
            <div className="divide-y text-xs">
              {recentFolios.slice(0, 5).map((f) => (
                <div key={f.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Link
                      href={`/billing/folios/${f.id}`}
                      className="font-mono font-bold text-foreground hover:text-amber-600 transition"
                    >
                      {f.folio_number}
                    </Link>
                    <p className="text-muted-foreground text-[11px]">
                      {f.guest?.first_name} {f.guest?.last_name} • Room {f.stay?.room?.room_number || "N/A"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.status === "SETTLED" ? "success" : f.status === "CLOSED" ? "default" : "warning"} size="sm">
                      {f.status}
                    </Badge>
                    <Link href={`/billing/folios/${f.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        Open
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="p-5 rounded-xl bg-card border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-foreground">Recent Invoices</h3>
            </div>
            <Link
              href="/billing/invoices"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="p-8 text-center rounded-lg bg-muted/20 border border-dashed text-xs text-muted-foreground">
              No invoices generated yet.
            </div>
          ) : (
            <div className="divide-y text-xs">
              {recentInvoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Link
                      href={`/billing/invoices/${inv.id}`}
                      className="font-mono font-bold text-foreground hover:text-indigo-600 transition"
                    >
                      {inv.invoice_number}
                    </Link>
                    <p className="text-muted-foreground text-[11px]">
                      {inv.billing_name} • {inv.invoice_date}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="font-bold text-foreground">
                      {inv.currency} {Number(inv.total_amount).toFixed(2)}
                    </p>
                    <Badge variant={inv.invoice_status === "PAID" ? "success" : inv.invoice_status === "VOID" ? "danger" : "warning"} size="sm">
                      {inv.invoice_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
