"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/reports/formatters";
import type { ExpenseAnalyticsData, HotelExpense } from "@/lib/expenses/types";
import {
  PieChart,
  Building2,
  Truck,
  TrendingUp,
  Receipt,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";

interface ExpenseAnalyticsChartsProps {
  analytics: ExpenseAnalyticsData;
  currency?: string;
  onSelectCategory?: (categoryId: string) => void;
  onSelectVendor?: (vendorId: string) => void;
  onSelectExpense?: (expense: HotelExpense) => void;
}

export function ExpenseAnalyticsCharts({
  analytics,
  currency = "INR",
  onSelectCategory,
  onSelectVendor,
  onSelectExpense,
}: ExpenseAnalyticsChartsProps) {
  const { byCategory, byDepartment, topVendors, dailyTrends, largestExpenses, summary } = analytics;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Category Breakdown */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            Spending by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3 max-h-[320px] overflow-y-auto">
          {byCategory.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No category expense data recorded for this period.
            </div>
          ) : (
            byCategory.map((cat) => (
              <div
                key={cat.categoryId}
                onClick={() => onSelectCategory?.(cat.categoryId)}
                className="group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {cat.categoryName}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-semibold">{formatCurrency(cat.amount, currency)}</span>
                    <span className="text-muted-foreground text-[11px]">({cat.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 2. Department & Top Vendors */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Top Vendors & Suppliers
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3 max-h-[320px] overflow-y-auto">
          {topVendors.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No vendor-specific payments recorded.
            </div>
          ) : (
            topVendors.slice(0, 6).map((v, idx) => (
              <div
                key={v.vendorId || v.vendorName || idx}
                onClick={() => v.vendorId && onSelectVendor?.(v.vendorId)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-muted text-[11px] font-bold flex items-center justify-center text-muted-foreground shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {idx + 1}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {v.vendorName}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {v.count} {v.count === 1 ? "voucher" : "vouchers"}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold font-mono text-foreground">
                    {formatCurrency(v.amount, currency)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{v.percentage}%</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 3. Daily Trend & Largest Expenses */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Largest Operational Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2.5 max-h-[320px] overflow-y-auto">
          {largestExpenses.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No operational expenses recorded.
            </div>
          ) : (
            largestExpenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => onSelectExpense?.(exp)}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer group"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {exp.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{exp.category?.name || "General"}</span>
                    <span>•</span>
                    <span>{exp.expense_date}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold font-mono text-foreground">
                    {formatCurrency(exp.amount, currency)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">{exp.payment_method}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
