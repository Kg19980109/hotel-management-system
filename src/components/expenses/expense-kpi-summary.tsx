"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/reports/formatters";
import type { ExpenseKpiSummary } from "@/lib/expenses/types";
import {
  Receipt,
  Calendar,
  Clock,
  TrendingDown,
  TrendingUp,
  Tag,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface ExpenseKpiSummaryProps {
  summary: ExpenseKpiSummary;
  currency?: string;
  isLoading?: boolean;
}

export function ExpenseKpiSummaryView({
  summary,
  currency = "INR",
  isLoading = false,
}: ExpenseKpiSummaryProps) {
  const isPositiveChange = summary.changePercentage > 0;
  const isZeroChange = summary.changePercentage === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
      {/* 1. Total Expenses */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Expenses
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatCurrency(summary.totalExpenses, currency)}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            {!isZeroChange && (
              <span
                className={`inline-flex items-center font-medium ${
                  isPositiveChange
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {isPositiveChange ? (
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                )}
                {Math.abs(summary.changePercentage)}%
              </span>
            )}
            <span className="text-muted-foreground">vs prev period</span>
          </div>
        </div>
      </Card>

      {/* 2. This Month */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            This Month
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatCurrency(summary.thisMonthExpenses, currency)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Month-to-date total</div>
        </div>
      </Card>

      {/* 3. Today */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Today
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatCurrency(summary.todayExpenses, currency)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Recorded today</div>
        </div>
      </Card>

      {/* 4. Expense Count */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Expense Count
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : summary.expenseCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Total vouchers</div>
        </div>
      </Card>

      {/* 5. Average Daily Expense */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Avg Daily Spend
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatCurrency(summary.averageDailyExpense, currency)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Burn rate / day</div>
        </div>
      </Card>

      {/* 6. Top Expense Category */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Top Category
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Tag className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-base font-bold tracking-tight text-foreground truncate">
            {isLoading ? "..." : summary.topCategory?.name || "None"}
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {summary.topCategory
              ? `${formatCurrency(summary.topCategory.amount, currency)} (${summary.topCategory.percentage}%)`
              : "No expenses recorded"}
          </div>
        </div>
      </Card>

      {/* 7. Largest Expense */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Largest Expense
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-base font-bold tracking-tight text-foreground truncate">
            {isLoading ? "..." : summary.largestExpense ? formatCurrency(summary.largestExpense.amount, currency) : "₹0"}
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {summary.largestExpense ? `${summary.largestExpense.title}` : "None"}
          </div>
        </div>
      </Card>
    </div>
  );
}
