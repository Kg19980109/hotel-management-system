"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/reports/formatters";
import type { BusinessDailyTrend } from "@/lib/reports/business-types";
import { TrendingUp, Calendar, ArrowUpDown } from "lucide-react";

interface BusinessTrendsSectionProps {
  trends: BusinessDailyTrend[];
  currency?: string;
}

export function BusinessTrendsSection({
  trends,
  currency = "INR",
}: BusinessTrendsSectionProps) {
  if (trends.length === 0) {
    return (
      <Card className="border-border/80 shadow-xs p-8 text-center text-xs text-muted-foreground">
        No sufficient historical data for this period.
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            Daily Financial & Operational Trend Timeline
          </CardTitle>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          {trends.length} {trends.length === 1 ? "day" : "days"} in period
        </span>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Date</th>
              <th className="px-4 py-2.5 font-semibold text-right">Gross Revenue</th>
              <th className="px-4 py-2.5 font-semibold text-right">Operating Expenses</th>
              <th className="px-4 py-2.5 font-semibold text-right">Operating Result</th>
              <th className="px-4 py-2.5 font-semibold text-center">Occupancy Rate</th>
              <th className="px-4 py-2.5 font-semibold text-right">Daily ADR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 font-mono">
            {trends.map((t) => {
              const isPos = t.operatingResult >= 0;
              return (
                <tr key={t.date} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                    {t.date}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(t.revenue, currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(t.expenses, currency)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-bold ${
                      isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isPos ? "+" : ""}
                    {formatCurrency(t.operatingResult, currency)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {t.occupancyRate}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {formatCurrency(t.adr, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
