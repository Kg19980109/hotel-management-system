"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/reports/formatters";
import type { FinancialPerformanceSummary, RevenueCategoryBreakdown } from "@/lib/reports/business-types";
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Wallet,
  Building2,
  PieChart,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface FinancialOperatingSectionProps {
  financials: FinancialPerformanceSummary;
  revenueBreakdown: RevenueCategoryBreakdown[];
  currency?: string;
}

export function FinancialOperatingSection({
  financials,
  revenueBreakdown,
  currency = "INR",
}: FinancialOperatingSectionProps) {
  const isPositiveResult = financials.operatingResult >= 0;
  const expenseRatio =
    financials.grossRevenue > 0
      ? Math.round((financials.totalExpenses / financials.grossRevenue) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Operating Result & Profitability Equation */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Operating Performance Equation
            </div>
            <span className="text-[10px] text-muted-foreground font-mono font-normal">
              Accrual Basis
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Revenue */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Operating Revenue</span>
            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(financials.grossRevenue, currency)}
            </span>
          </div>

          {/* Operating Expenses */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Operating Expenses</span>
            <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
              -{formatCurrency(financials.totalExpenses, currency)}
            </span>
          </div>

          <div className="border-t border-border pt-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-foreground block">OPERATING RESULT</span>
              <span className="text-[10px] text-muted-foreground">Operating margin: {100 - expenseRatio}%</span>
            </div>
            <span
              className={`text-base font-bold font-mono ${
                isPositiveResult ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isPositiveResult ? "+" : ""}
              {formatCurrency(financials.operatingResult, currency)}
            </span>
          </div>

          {/* Progress Bar Expense Ratio */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Expense Burn Ratio</span>
              <span className="font-semibold text-foreground">{expenseRatio}% of revenue</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  expenseRatio > 90
                    ? "bg-rose-500"
                    : expenseRatio > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(3, expenseRatio))}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Revenue Streams Breakdown */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            Revenue Breakdown by Department
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {revenueBreakdown.map((rev) => (
            <div key={rev.category} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground truncate">{rev.category}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold">{formatCurrency(rev.amount, currency)}</span>
                  <span className="text-[11px] text-muted-foreground">({rev.percentage}%)</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(3, rev.percentage))}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Cash Movement & Outstanding Balances */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Cash Collections & Receivables
            </div>
            <Link href="/billing">
              <Button variant="ghost" size="sm" className="h-6 text-[11px] px-1.5 gap-1">
                Billing Hub <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div>
              <span className="text-xs font-semibold text-foreground block">
                Cash & Card Captured
              </span>
              <span className="text-[10px] text-muted-foreground">Settled payments in period</span>
            </div>
            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(financials.paymentsCollected, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
            <div>
              <span className="text-xs font-semibold text-foreground block">
                Outstanding Receivables
              </span>
              <span className="text-[10px] text-muted-foreground">Unsettled folios & unpaid invoices</span>
            </div>
            <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatCurrency(financials.outstandingReceivables, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <span className="text-muted-foreground">Taxes Incurred (GST/VAT)</span>
            <span className="font-mono font-medium text-foreground">
              {formatCurrency(financials.taxAmount, currency)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
