"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/reports/formatters";
import type {
  RevenueCategoryBreakdown,
  OwnerBusinessReportData,
} from "@/lib/reports/business-types";
import { PieChart, DollarSign, Receipt, ArrowRight, Layers, Tag } from "lucide-react";

interface RevenueExpenseFlowProps {
  revenueBreakdown: RevenueCategoryBreakdown[];
  expenseIntelligence: OwnerBusinessReportData["expenseIntelligence"];
  grossRevenue: number;
  totalExpenses: number;
  currency?: string;
}

export function RevenueExpenseFlow({
  revenueBreakdown,
  expenseIntelligence,
  grossRevenue,
  totalExpenses,
  currency = "INR",
}: RevenueExpenseFlowProps) {
  const [activeTab, setActiveTab] = React.useState<"CATEGORY" | "DEPARTMENT">("CATEGORY");

  const expenseItems =
    activeTab === "CATEGORY"
      ? expenseIntelligence.byCategory
      : expenseIntelligence.byDepartment;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Revenue Streams Breakdown */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Revenue Stream Composition
            </CardTitle>
          </div>
          <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(grossRevenue, currency)}
          </span>
        </CardHeader>

        <CardContent className="p-4 space-y-3.5">
          {revenueBreakdown.map((rev, idx) => {
            const colors = [
              "from-emerald-500 to-teal-400",
              "from-amber-500 to-orange-400",
              "from-indigo-500 to-purple-400",
              "from-cyan-500 to-blue-400",
            ];
            const barColor = colors[idx % colors.length];

            return (
              <div key={rev.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium text-foreground">{rev.category}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-foreground">
                      {formatCurrency(rev.amount, currency)}
                    </span>
                    <span className="text-[11px] text-muted-foreground w-12 text-right">
                      {rev.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(2, rev.percentage))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 2. Expense Allocation Matrix */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Expense Allocation Distribution
            </CardTitle>
          </div>

          {/* Toggle Category vs Department */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("CATEGORY")}
              className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                activeTab === "CATEGORY"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DEPARTMENT")}
              className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                activeTab === "DEPARTMENT"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Departments
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {expenseItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No expenses recorded for this period.
            </div>
          ) : (
            expenseItems.slice(0, 5).map((exp, idx) => (
              <div key={exp.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-medium text-foreground truncate">{exp.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-foreground">
                      {formatCurrency(exp.amount, currency)}
                    </span>
                    <span className="text-[11px] text-muted-foreground w-12 text-right">
                      {exp.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(2, exp.percentage))}%` }}
                  />
                </div>
              </div>
            ))
          )}

          {expenseIntelligence.topVendorName && (
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>Top Supplier / Payee:</span>
              <span className="font-medium text-foreground">
                {expenseIntelligence.topVendorName} ({formatCurrency(expenseIntelligence.topVendorAmount, currency)})
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
