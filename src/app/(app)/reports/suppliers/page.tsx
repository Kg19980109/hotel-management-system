"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchSupplierReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatCurrency } from "@/lib/reports/formatters";
import type {
  SupplierReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { Truck, FileText, DollarSign, Clock } from "lucide-react";

export default function SupplierReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("NONE");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<SupplierReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchSupplierReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load supplier report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchSupplierReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load supplier report:", err);
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
      const headers = ["Supplier Name", "Category", "POs Count", "Total PO Value"];
      const rows = report.bySupplier.map((s) => [
        s.supplierName,
        s.categoryName,
        s.poCount,
        s.poValue,
      ]);
      const res = await exportReportCsvAction(propertyId, "suppliers", headers, rows, "Suppliers & Procurement Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_supplier_report_${startDate}_${endDate}.csv`);
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
        title="Supplier & Procurement Analytics"
        description="Purchase order commitments, goods receiving fulfilment, vendor expenditure, and pending orders."
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
          title="Active Suppliers"
          value={report?.summary.totalSuppliers || 0}
          subtitle="Registered vendors"
          icon={<Truck className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Purchase Orders"
          value={report?.summary.totalPurchaseOrders.current || 0}
          metric={report?.summary.totalPurchaseOrders}
          subtitle="Issued purchase orders"
          icon={<FileText className="w-4 h-4 text-blue-500" />}
        />

        <KpiCard
          title="Committed PO Value"
          value={formatCurrency(report?.summary.totalPurchaseValue.current, currency)}
          metric={report?.summary.totalPurchaseValue}
          subtitle="Total PO spend"
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Pending Orders"
          value={report?.summary.pendingOrdersCount || 0}
          subtitle="Awaiting receipt"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />
      </div>

      {/* Supplier Table */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Vendor Procurement Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Supplier Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">PO Count</th>
                <th className="py-2.5 px-4 text-right">PO Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.bySupplier && report.bySupplier.length > 0 ? (
                report.bySupplier.map((s, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-2 px-4 font-medium text-foreground">{s.supplierName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{s.categoryName}</td>
                    <td className="py-2 px-3 font-mono font-medium">{s.poCount}</td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(s.poValue, currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No supplier purchase orders found.
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
