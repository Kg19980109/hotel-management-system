"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchInventoryConsumptionReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import type {
  InventoryConsumptionReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { Boxes, Trash2, Sliders, UtensilsCrossed } from "lucide-react";

export default function InventoryConsumptionReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("NONE");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<InventoryConsumptionReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchInventoryConsumptionReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load consumption report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchInventoryConsumptionReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load consumption report:", err);
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
      const headers = ["Item Name", "Category", "Unit", "Consumed Quantity", "Waste Quantity", "Net Used"];
      const rows = report.byItem.map((i) => [
        i.itemName,
        i.category,
        i.unit,
        i.consumedQty,
        i.wasteQty,
        i.netUsed,
      ]);
      const res = await exportReportCsvAction(propertyId, "consumption", headers, rows, "Inventory Consumption & Waste Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_consumption_report_${startDate}_${endDate}.csv`);
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
        title="Inventory Consumption & Waste Analytics"
        description="F&B ingredient usage, completed stock consumption, recorded wastage, and inventory depletion."
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
          title="Total Consumption"
          value={report?.summary.totalConsumptionQty || 0}
          subtitle="Stock units consumed"
          icon={<Boxes className="w-4 h-4 text-blue-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Wastage & Spoilage"
          value={report?.summary.totalWasteQty || 0}
          subtitle="Written off waste units"
          icon={<Trash2 className="w-4 h-4 text-rose-500" />}
          variant="rose"
        />

        <KpiCard
          title="Stock Adjustments"
          value={report?.summary.totalAdjustmentQty || 0}
          subtitle="Physical audit corrections"
          icon={<Sliders className="w-4 h-4 text-amber-500" />}
        />

        <KpiCard
          title="Restaurant Depletion"
          value={report?.summary.restaurantConsumptionQty || 0}
          subtitle="Kitchen recipe usage"
          icon={<UtensilsCrossed className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />
      </div>

      {/* Item Usage Table */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Consumption by Inventory Item</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Item Name</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Consumed Qty</th>
                <th className="py-2.5 px-3">Waste Qty</th>
                <th className="py-2.5 px-4 text-right">Net Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.byItem && report.byItem.length > 0 ? (
                report.byItem.map((i, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-2 px-4 font-medium text-foreground">{i.itemName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{i.unit}</td>
                    <td className="py-2 px-3 font-mono font-medium">{i.consumedQty}</td>
                    <td className="py-2 px-3 font-mono text-rose-600">{i.wasteQty}</td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-foreground">{i.netUsed}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No consumption data recorded.
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
