"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchExpenseReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatCurrency } from "@/lib/reports/formatters";
import type {
  ExpenseReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { CreditCard, DollarSign, Clock, CheckCircle2 } from "lucide-react";

export default function ExpenseReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<ExpenseReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchExpenseReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load expense report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchExpenseReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load expense report:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [propertyId, preset, comparison, startDate, endDate]);

  const handleExportCsv = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      const headers = ["Expense Category", "Claims Count", "Total Amount", "Share %"];
      const rows = report.byCategory.map((c) => [
        c.category,
        c.count,
        c.amount,
        `${c.percentage}%`,
      ]);
      const res = await exportReportCsvAction(propertyId, "expenses", headers, rows, "Staff Operational Expenses Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_expenses_report_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to export CSV:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const currency = "INR";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <ReportHeader
        title="Staff & Operational Expenses"
        description="Employee expense claims, category distributions, approval statuses, and reimbursement spend."
        activePreset={preset}
        onPresetChange={setPreset}
        startDate={startDate}
        endDate={endDate}
        onCustomDateChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
          setPreset("CUSTOM");
        }}
        comparison={comparison}
        onComparisonChange={setComparison}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        onRefresh={loadData}
        isLoading={isLoading}
        propertyName={propertyName}
      />

      <ReportNav />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Expense Spend"
          value={formatCurrency(report?.summary.totalSpend.current, currency)}
          metric={report?.summary.totalSpend}
          subtitle="All filed staff expenses"
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Pending Approval"
          value={formatCurrency(report?.summary.pendingApprovalAmount, currency)}
          subtitle="Awaiting GM review"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />

        <KpiCard
          title="Approved & Reimbursed"
          value={formatCurrency(report?.summary.paidAmount, currency)}
          subtitle="Disbursed payments"
          icon={<CheckCircle2 className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Total Claims Filed"
          value={report?.summary.totalExpensesCount.current || 0}
          metric={report?.summary.totalExpensesCount}
          subtitle="Submitted claims"
          icon={<CreditCard className="w-4 h-4 text-blue-500" />}
        />
      </div>

      {/* Category Breakdown */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Spend by Expense Category</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Expense Category</th>
                <th className="py-2.5 px-3">Claims Count</th>
                <th className="py-2.5 px-3">Total Spend</th>
                <th className="py-2.5 px-4 text-right">Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.byCategory && report.byCategory.length > 0 ? (
                report.byCategory.map((c, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-2 px-4 font-semibold text-foreground">{c.category}</td>
                    <td className="py-2 px-3 font-mono">{c.count}</td>
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{formatCurrency(c.amount, currency)}</td>
                    <td className="py-2 px-4 text-right font-medium text-indigo-600">{c.percentage}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No expense claims recorded in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
