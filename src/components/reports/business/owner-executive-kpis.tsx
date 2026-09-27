"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/reports/formatters";
import type { OwnerExecutiveKpis } from "@/lib/reports/business-types";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  BedDouble,
  DoorOpen,
  CalendarCheck,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface OwnerExecutiveKpisProps {
  kpis: OwnerExecutiveKpis;
  currency?: string;
  isLoading?: boolean;
}

export function OwnerExecutiveKpisView({
  kpis,
  currency = "INR",
  isLoading = false,
}: OwnerExecutiveKpisProps) {
  const isRevPos = (kpis.totalRevenue.pctDiff ?? 0) >= 0;
  const isExpPos = (kpis.totalExpenses.pctDiff ?? 0) > 0;
  const isResultPos = kpis.operatingResult.current >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-3">
      {/* 1. Gross Revenue */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Gross Revenue
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatCurrency(kpis.totalRevenue.current, currency)}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[11px]">
            <span
              className={`inline-flex items-center font-medium ${
                isRevPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isRevPos ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
              {Math.abs(kpis.totalRevenue.pctDiff ?? 0)}%
            </span>
            <span className="text-muted-foreground">vs prev</span>
          </div>
        </div>
      </Card>

      {/* 2. Total Expenses */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Expenses
          </span>
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Receipt className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatCurrency(kpis.totalExpenses.current, currency)}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[11px]">
            <span
              className={`inline-flex items-center font-medium ${
                isExpPos ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isExpPos ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
              {Math.abs(kpis.totalExpenses.pctDiff ?? 0)}%
            </span>
            <span className="text-muted-foreground">vs prev</span>
          </div>
        </div>
      </Card>

      {/* 3. Operating Result */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Operating Result
          </span>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isResultPos
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                : "bg-amber-500/10 text-amber-600"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div
            className={`text-xl font-bold tracking-tight ${
              isResultPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {isLoading ? "..." : formatCurrency(kpis.operatingResult.current, currency)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Rev - Op Expenses</div>
        </div>
      </Card>

      {/* 4. Occupancy Rate */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Occupancy Rate
          </span>
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <BedDouble className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : `${kpis.occupancyRate.current}%`}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Prev: {kpis.occupancyRate.previous}%
          </div>
        </div>
      </Card>

      {/* 5. ADR */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            ADR
          </span>
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <DoorOpen className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatCurrency(kpis.adr.current, currency)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Avg Daily Rate</div>
        </div>
      </Card>

      {/* 6. RevPAR */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            RevPAR
          </span>
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatCurrency(kpis.revpar.current, currency)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Rev / Avail Room</div>
        </div>
      </Card>

      {/* 7. Total Bookings */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Bookings
          </span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <CalendarCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : kpis.totalBookings.current}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Total reservations</div>
        </div>
      </Card>

      {/* 8. Avg Booking Value */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Avg Booking
          </span>
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-foreground">
            {isLoading ? "..." : formatCurrency(kpis.avgBookingValue.current, currency)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Revenue / Booking</div>
        </div>
      </Card>

      {/* 9. Outstanding Receivables */}
      <Card className="bg-gradient-to-br from-card to-card/60 border-border/80 shadow-xs p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Outstanding
          </span>
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {isLoading ? "..." : formatCurrency(kpis.outstandingReceivables, currency)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Unsettled balance</div>
        </div>
      </Card>
    </div>
  );
}
