"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/reports/formatters";
import type { OutstandingReceivablesSummary } from "@/lib/reports/business-types";
import {
  Wallet,
  Receipt,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface OutstandingMoneySectionProps {
  outstanding: OutstandingReceivablesSummary;
  currency?: string;
}

export function OutstandingMoneySection({
  outstanding,
  currency = "INR",
}: OutstandingMoneySectionProps) {
  const totalReceivables = outstanding.unpaidFoliosTotal + outstanding.unpaidInvoicesTotal;

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            Outstanding Receivables & Unsettled Accounts
          </CardTitle>
        </div>
        <Link href="/billing">
          <span className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
            Open Billing Hub <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Unpaid Folios */}
          <div className="p-3 bg-muted/30 rounded-xl border border-border/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Active Guest Folios
              </span>
              <span className="text-lg font-bold font-mono text-foreground mt-1 block">
                {formatCurrency(outstanding.unpaidFoliosTotal, currency)}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 flex items-center justify-between">
              <span>{outstanding.unpaidFoliosCount} open folios</span>
              <Link href="/billing/folios" className="text-primary hover:underline">
                View Folios
              </Link>
            </div>
          </div>

          {/* Unpaid Invoices */}
          <div className="p-3 bg-muted/30 rounded-xl border border-border/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Unpaid Invoices
              </span>
              <span className="text-lg font-bold font-mono text-foreground mt-1 block">
                {formatCurrency(outstanding.unpaidInvoicesTotal, currency)}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 flex items-center justify-between">
              <span>{outstanding.unpaidInvoicesCount} invoices pending</span>
              <Link href="/billing/invoices" className="text-primary hover:underline">
                View Invoices
              </Link>
            </div>
          </div>

          {/* Total Outstanding */}
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase block">
                Total Outstanding Money
              </span>
              <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">
                {formatCurrency(totalReceivables, currency)}
              </span>
            </div>
            <div className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-2">
              Requires cashier or front desk reconciliation
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
