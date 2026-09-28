"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/reports/formatters";
import type { BusinessDailyTrend } from "@/lib/reports/business-types";
import { TrendingUp, BarChart3, LineChart, Sparkles } from "lucide-react";

interface InteractiveTrendsChartProps {
  trends: BusinessDailyTrend[];
  currency?: string;
}

type ChartViewMode = "PL_OVERLAY" | "OCCUPANCY_ADR" | "REVENUE_EXPENSES";

export function InteractiveTrendsChart({
  trends,
  currency = "INR",
}: InteractiveTrendsChartProps) {
  const [viewMode, setViewMode] = React.useState<ChartViewMode>("PL_OVERLAY");
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  if (trends.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
        No daily trend data points found for this time range.
      </div>
    );
  }

  // Find maximum values for relative scaling
  const maxRevenue = Math.max(...trends.map((t) => t.revenue), 1);
  const maxExpense = Math.max(...trends.map((t) => t.expenses), 1);
  const maxFinance = Math.max(maxRevenue, maxExpense, 1);
  const maxAdr = Math.max(...trends.map((t) => t.adr), 1);

  // Peak Revenue Day
  const peakDay = [...trends].sort((a, b) => b.revenue - a.revenue)[0];
  const activeTrend = hoveredIndex !== null ? trends[hoveredIndex] : trends[trends.length - 1];

  return (
    <div className="space-y-4">
      {/* Chart Control Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Interactive Financial & Yield Trajectory
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Hover over bars to inspect daily net profit, cash inflow, and occupancy
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => setViewMode("PL_OVERLAY")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
              viewMode === "PL_OVERLAY"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            P&L Equation
          </button>
          <button
            type="button"
            onClick={() => setViewMode("REVENUE_EXPENSES")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
              viewMode === "REVENUE_EXPENSES"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Revenue vs Expenses
          </button>
          <button
            type="button"
            onClick={() => setViewMode("OCCUPANCY_ADR")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
              viewMode === "OCCUPANCY_ADR"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Occupancy & ADR
          </button>
        </div>
      </div>

      {/* Active Day Highlight Strip */}
      {activeTrend && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 bg-muted/30 rounded-xl border border-border/60 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Selected Date</span>
            <span className="font-bold text-foreground font-mono">{activeTrend.date}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Daily Revenue</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(activeTrend.revenue, currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Daily Expenses</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
              {formatCurrency(activeTrend.expenses, currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Net Profit / Loss</span>
            <span
              className={`font-bold font-mono ${
                activeTrend.operatingResult >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {activeTrend.operatingResult >= 0 ? "+" : ""}
              {formatCurrency(activeTrend.operatingResult, currency)}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Occupancy (ADR)</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
              {activeTrend.occupancyRate}% ({formatCurrency(activeTrend.adr, currency)})
            </span>
          </div>
        </div>
      )}

      {/* Visual Chart Canvas / SVG Container */}
      <div className="relative h-64 w-full pt-6 pb-6 px-2 bg-gradient-to-b from-card/40 to-muted/20 rounded-xl border border-border/60 flex items-end gap-1.5 sm:gap-2">
        {/* Y-Axis Reference Guides */}
        <div className="absolute inset-x-2 top-3 bottom-8 pointer-events-none flex flex-col justify-between text-[9px] text-muted-foreground/60 font-mono">
          <div className="border-b border-border/40 w-full flex justify-between">
            <span>{viewMode === "OCCUPANCY_ADR" ? "100% Occ" : formatCurrency(maxFinance, currency)}</span>
            <span>Peak Range</span>
          </div>
          <div className="border-b border-border/20 w-full flex justify-between">
            <span>{viewMode === "OCCUPANCY_ADR" ? "50% Occ" : formatCurrency(maxFinance / 2, currency)}</span>
            <span>Midpoint</span>
          </div>
          <div className="border-b border-border/40 w-full flex justify-between">
            <span>{viewMode === "OCCUPANCY_ADR" ? "0% Occ" : formatCurrency(0, currency)}</span>
            <span>Baseline</span>
          </div>
        </div>

        {/* Dynamic Bars for each date */}
        {trends.map((t, idx) => {
          const revHeightPct = Math.min(100, Math.max(4, (t.revenue / maxFinance) * 100));
          const expHeightPct = Math.min(100, Math.max(4, (t.expenses / maxFinance) * 100));
          const occHeightPct = Math.min(100, Math.max(4, t.occupancyRate));
          const isHovered = hoveredIndex === idx;
          const isPos = t.operatingResult >= 0;

          return (
            <div
              key={t.date}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer z-10"
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-12 z-30 bg-popover text-popover-foreground border border-border shadow-lg rounded-md px-2 py-1 text-[10px] font-mono whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95">
                  <div className="font-bold">{t.date}</div>
                  <div className="text-emerald-500">Rev: {formatCurrency(t.revenue, currency)}</div>
                  <div className="text-rose-500">Exp: {formatCurrency(t.expenses, currency)}</div>
                </div>
              )}

              {/* Bar Elements Based on View Mode */}
              {viewMode === "PL_OVERLAY" && (
                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  {/* Revenue Bar */}
                  <div
                    style={{ height: `${revHeightPct}%` }}
                    className={`w-full max-w-[14px] rounded-t-sm transition-all ${
                      isHovered
                        ? "bg-emerald-500 shadow-sm"
                        : "bg-emerald-500/80 group-hover:bg-emerald-500"
                    }`}
                  />
                  {/* Net Margin indicator dot */}
                  <div
                    style={{ bottom: `${Math.min(95, Math.max(5, (Math.abs(t.operatingResult) / maxFinance) * 100))}%` }}
                    className={`absolute w-1.5 h-1.5 rounded-full ${
                      isPos ? "bg-emerald-400 ring-2 ring-emerald-900/50" : "bg-rose-400 ring-2 ring-rose-900/50"
                    }`}
                  />
                </div>
              )}

              {viewMode === "REVENUE_EXPENSES" && (
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  {/* Revenue Bar */}
                  <div
                    style={{ height: `${revHeightPct}%` }}
                    className={`w-1/2 max-w-[10px] rounded-t-sm transition-all ${
                      isHovered ? "bg-emerald-500" : "bg-emerald-500/70"
                    }`}
                  />
                  {/* Expense Bar */}
                  <div
                    style={{ height: `${expHeightPct}%` }}
                    className={`w-1/2 max-w-[10px] rounded-t-sm transition-all ${
                      isHovered ? "bg-rose-500" : "bg-rose-500/70"
                    }`}
                  />
                </div>
              )}

              {viewMode === "OCCUPANCY_ADR" && (
                <div className="w-full flex items-end justify-center h-full">
                  <div
                    style={{ height: `${occHeightPct}%` }}
                    className={`w-full max-w-[14px] rounded-t-sm transition-all ${
                      isHovered ? "bg-blue-500 shadow-sm" : "bg-blue-500/70 group-hover:bg-blue-500"
                    }`}
                  />
                </div>
              )}

              {/* Date Label at bottom */}
              <span
                className={`text-[9px] font-mono mt-2 truncate w-full text-center ${
                  isHovered ? "text-foreground font-bold" : "text-muted-foreground"
                }`}
              >
                {t.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend & Peak Callout */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
            <span>Gross Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
            <span>Operating Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
            <span>Occupancy Rate</span>
          </div>
        </div>

        {peakDay && peakDay.revenue > 0 && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <Sparkles className="w-3 h-3" />
            <span>
              Peak Day: {peakDay.date} ({formatCurrency(peakDay.revenue, currency)})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
