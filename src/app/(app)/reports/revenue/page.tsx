"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchRevenueReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatCurrency } from "@/lib/reports/formatters";
import type {
  RevenueReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { DollarSign, Percent, Receipt, CreditCard } from "lucide-react";

export default function RevenueReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<RevenueReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchRevenueReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load revenue report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchRevenueReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load revenue report:", err);
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
      const headers = ["Charge Type", "Gross Charges", "Discounts", "Taxes", "Net Revenue", "Share %"];
      const rows = report.byChargeType.map((c) => [
        c.chargeType,
        c.grossAmount,
        c.discountAmount,
        c.taxAmount,
        c.netAmount,
        `${c.percentage}%`,
      ]);
      const res = await exportReportCsvAction(propertyId, "revenue", headers, rows, "Revenue & Ledger Charges Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_revenue_report_${startDate}_${endDate}.csv`);
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
        title="Revenue & Charge Analytics"
        description="Gross charges, discounts, net revenue, taxes collected, and settlement payment streams."
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
          title="Net Revenue"
          value={formatCurrency(report?.summary.netRevenue.current, currency)}
          metric={report?.summary.netRevenue}
          subtitle="Gross charges minus discounts"
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Gross Charges"
          value={formatCurrency(report?.summary.grossCharges.current, currency)}
          metric={report?.summary.grossCharges}
          subtitle="Total ledger items posted"
          icon={<Receipt className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Taxes Collected"
          value={formatCurrency(report?.summary.taxes, currency)}
          subtitle="Pass-through tax liabilities"
          icon={<Percent className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />

        <KpiCard
          title="Payments Collected"
          value={formatCurrency(report?.summary.totalPayments.current, currency)}
          metric={report?.summary.totalPayments}
          subtitle="Completed settlements"
          icon={<CreditCard className="w-4 h-4 text-blue-500" />}
        />
      </div>

      {/* Charge Types Breakdown */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Charges by Revenue Center</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Charge Type</th>
                <th className="py-2.5 px-3">Gross Charges</th>
                <th className="py-2.5 px-3">Discounts</th>
                <th className="py-2.5 px-3">Taxes</th>
                <th className="py-2.5 px-3">Net Revenue</th>
                <th className="py-2.5 px-4 text-right">Revenue Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.byChargeType && report.byChargeType.length > 0 ? (
                report.byChargeType.map((c, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-2 px-4 font-semibold text-foreground">{c.chargeType}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{formatCurrency(c.grossAmount, currency)}</td>
                    <td className="py-2 px-3 font-mono text-rose-600">-{formatCurrency(c.discountAmount, currency)}</td>
                    <td className="py-2 px-3 font-mono text-amber-600">{formatCurrency(c.taxAmount, currency)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-foreground">{formatCurrency(c.netAmount, currency)}</td>
                    <td className="py-2 px-4 text-right font-medium text-indigo-600">{c.percentage}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    No charge records found in this date window.
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
