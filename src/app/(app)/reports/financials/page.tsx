"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchFinancialReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatCurrency } from "@/lib/reports/formatters";
import type {
  FinancialReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { Receipt, CreditCard, RotateCcw, AlertCircle } from "lucide-react";

export default function FinancialReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("NONE");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<FinancialReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchFinancialReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load financial report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchFinancialReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load financial report:", err);
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
      const headers = ["Metric", "Value"];
      const rows = [
        ["Total Folios", report.summary.totalFolios],
        ["Open Folios", report.summary.openFoliosCount],
        ["Settled Folios", report.summary.settledFoliosCount],
        ["Total Charges Posted", report.summary.totalCharges],
        ["Total Payments Collected", report.summary.totalPayments],
        ["Total Refunds", report.summary.totalRefunds],
        ["Outstanding Balance", report.summary.outstandingFoliosBalance],
        ["Invoices Count", report.summary.invoicesCount],
        ["Paid Invoices", report.summary.paidInvoicesCount],
        ["Unpaid Invoices", report.summary.unpaidInvoicesCount],
      ];
      const res = await exportReportCsvAction(propertyId, "financials", headers, rows, "Financial & Invoices Ledger Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_financial_report_${startDate}_${endDate}.csv`);
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
        title="Financial & Ledger Statement"
        description="Immutable guest folios, settlement payments, refunds, and invoice statuses."
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
          title="Total Ledger Charges"
          value={formatCurrency(report?.summary.totalCharges, currency)}
          subtitle="All folios posted"
          icon={<Receipt className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Settlement Payments"
          value={formatCurrency(report?.summary.totalPayments, currency)}
          subtitle="Collected payments"
          icon={<CreditCard className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Total Refunds"
          value={formatCurrency(report?.summary.totalRefunds, currency)}
          subtitle="Reversals & refunds"
          icon={<RotateCcw className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />

        <KpiCard
          title="Outstanding Folio Balance"
          value={formatCurrency(report?.summary.outstandingFoliosBalance, currency)}
          subtitle="Unpaid active balances"
          icon={<AlertCircle className="w-4 h-4 text-rose-500" />}
          variant="rose"
        />
      </div>

      {/* Summary Table */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Invoice & Folio Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border border-border/60 text-xs">
            <span className="font-semibold text-foreground">Folio Status Counts</span>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Total Folios</span>
              <span className="font-mono font-medium">{report?.summary.totalFolios || 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Open Folios</span>
              <span className="font-mono font-medium text-amber-600">{report?.summary.openFoliosCount || 0}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Settled / Closed Folios</span>
              <span className="font-mono font-medium text-emerald-600">{report?.summary.settledFoliosCount || 0}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border border-border/60 text-xs">
            <span className="font-semibold text-foreground">Tax Invoices</span>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Total Invoices Issued</span>
              <span className="font-mono font-medium">{report?.summary.invoicesCount || 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Paid Invoices</span>
              <span className="font-mono font-medium text-emerald-600">{report?.summary.paidInvoicesCount || 0}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Unpaid / Partially Paid</span>
              <span className="font-mono font-medium text-rose-600">{(report?.summary.unpaidInvoicesCount || 0) + (report?.summary.partiallyPaidInvoicesCount || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
