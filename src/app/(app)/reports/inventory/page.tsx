"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchInventoryReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import type {
  InventoryReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { Boxes, AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function InventoryReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("NONE");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<InventoryReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchInventoryReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load inventory report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchInventoryReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load inventory report:", err);
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
      const headers = ["Item Name", "Category", "Unit", "Inflow (Purchases)", "Outflow (Consumption)", "Current Stock"];
      const rows = report.topMovingItems.map((i) => [
        i.itemName,
        i.category,
        i.unit,
        i.inflow,
        i.outflow,
        i.currentStock,
      ]);
      const res = await exportReportCsvAction(propertyId, "inventory", headers, rows, "Inventory Stock & Movements Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_inventory_report_${startDate}_${endDate}.csv`);
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

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <ReportHeader
        title="Inventory Stock & Movement Ledger"
        description="Immutable stock movement history, purchases, restaurant consumption, waste, and threshold alerts."
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
          title="Tracked Items"
          value={report?.summary.totalItems || 0}
          subtitle="Active SKUs"
          icon={<Boxes className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Low Stock Items"
          value={report?.summary.lowStockItemsCount || 0}
          subtitle="At or below reorder level"
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />

        <KpiCard
          title="Purchases Inflow"
          value={report?.summary.purchasesQuantity || 0}
          subtitle="Received goods units"
          icon={<ArrowDownRight className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Consumption Outflow"
          value={report?.summary.consumptionQuantity || 0}
          subtitle="Used in ops & dining"
          icon={<ArrowUpRight className="w-4 h-4 text-blue-500" />}
        />
      </div>

      {/* Top Moving Stock Table */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Active Inventory Item Movements</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Item Name</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Purchased In</th>
                <th className="py-2.5 px-3">Consumed Out</th>
                <th className="py-2.5 px-4 text-right">Current Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.topMovingItems && report.topMovingItems.length > 0 ? (
                report.topMovingItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-2 px-4 font-medium text-foreground">{item.itemName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{item.unit}</td>
                    <td className="py-2 px-3 font-mono text-emerald-600 font-semibold">+{item.inflow}</td>
                    <td className="py-2 px-3 font-mono text-rose-600 font-semibold">-{item.outflow}</td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-foreground">{item.currentStock}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No item movements found.
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
