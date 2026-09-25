"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchRestaurantReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatCurrency } from "@/lib/reports/formatters";
import type {
  RestaurantReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { UtensilsCrossed, DollarSign, CheckCircle2, ShoppingBag } from "lucide-react";

export default function RestaurantReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<RestaurantReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchRestaurantReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load restaurant report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchRestaurantReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load restaurant report:", err);
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
      const headers = ["Order Type", "Order Count", "Gross Sales", "Share %"];
      const rows = report.byOrderType.map((o) => [
        o.orderType,
        o.orderCount,
        o.grossSales,
        `${o.percentage}%`,
      ]);
      const res = await exportReportCsvAction(propertyId, "restaurant", headers, rows, "Restaurant & F&B Sales Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_restaurant_report_${startDate}_${endDate}.csv`);
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
        title="Restaurant & F&B Analytics"
        description="Dining order volume, room service billing, gross food sales, and average order value."
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
          title="Gross Food & Beverage Sales"
          value={formatCurrency(report?.summary.grossSales.current, currency)}
          metric={report?.summary.grossSales}
          subtitle="All outlets & room service"
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Total Orders"
          value={report?.summary.totalOrders.current || 0}
          metric={report?.summary.totalOrders}
          subtitle="All order types"
          icon={<UtensilsCrossed className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Completed Orders"
          value={report?.summary.completedOrders || 0}
          subtitle="Fulfilled and billed"
          icon={<CheckCircle2 className="w-4 h-4 text-blue-500" />}
        />

        <KpiCard
          title="Avg Order Value (AOV)"
          value={formatCurrency(report?.summary.averageOrderValue, currency)}
          subtitle="Sales / Completed orders"
          icon={<ShoppingBag className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />
      </div>

      {/* Orders by Order Type */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Sales by Order Type</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Order Type</th>
                <th className="py-2.5 px-3">Orders</th>
                <th className="py-2.5 px-3">Gross Sales</th>
                <th className="py-2.5 px-4 text-right">Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.byOrderType && report.byOrderType.length > 0 ? (
                report.byOrderType.map((o, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-2 px-4 font-semibold text-foreground">{o.orderType}</td>
                    <td className="py-2 px-3 font-mono">{o.orderCount}</td>
                    <td className="py-2 px-3 font-mono font-medium text-foreground">{formatCurrency(o.grossSales, currency)}</td>
                    <td className="py-2 px-4 text-right font-medium text-indigo-600">{o.percentage}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No restaurant order records for this period.
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
