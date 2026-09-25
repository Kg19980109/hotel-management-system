"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchOccupancyReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatCurrency, formatPercentage } from "@/lib/reports/formatters";
import type {
  OccupancyReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { BedDouble, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";

export default function OccupancyReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<OccupancyReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchOccupancyReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) {
        setReport(res.data);
      }
    } catch (err) {
      console.error("Failed to load occupancy report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchOccupancyReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) {
          setReport(res.data);
        }
      } catch (err) {
        console.error("Failed to load occupancy report:", err);
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
      const headers = ["Date", "Total Rooms", "Sellable Rooms", "Occupied Rooms", "OOO Rooms", "OOS Rooms", "Occupancy %", "ADR", "RevPAR", "Room Revenue"];
      const rows = report.dailyRows.map((r) => [
        r.date,
        r.totalRooms,
        r.sellableRooms,
        r.occupiedRooms,
        r.outOfOrderRooms,
        r.outOfServiceRooms,
        r.occupancyRate,
        r.adr,
        r.revPar,
        r.roomRevenue,
      ]);
      const res = await exportReportCsvAction(propertyId, "occupancy", headers, rows, "Occupancy & ADR Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_occupancy_report_${startDate}_${endDate}.csv`);
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
        title="Occupancy & Room Utilization"
        description="Daily occupancy percentage, sellable room night trends, ADR and RevPAR analysis."
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
          title="Occupancy Rate"
          value={formatPercentage(report?.summary.occupancyRate.current)}
          metric={report?.summary.occupancyRate}
          subtitle="Occupied / Sellable room nights"
          icon={<BedDouble className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Average Daily Rate (ADR)"
          value={formatCurrency(report?.summary.adr.current, currency)}
          metric={report?.summary.adr}
          subtitle="Room Revenue / Sold Nights"
          icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />

        <KpiCard
          title="RevPAR"
          value={formatCurrency(report?.summary.revPar.current, currency)}
          metric={report?.summary.revPar}
          subtitle="Room Revenue / Sellable Nights"
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Out of Order / Service"
          value={`${(report?.summary.outOfOrderNights || 0) + (report?.summary.outOfServiceNights || 0)} nights`}
          subtitle="Excluded from sellable base"
          icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
          variant="rose"
        />
      </div>

      {/* Daily Breakdown Table */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Daily Occupancy & Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3">Total Rooms</th>
                <th className="py-2.5 px-3">Sellable</th>
                <th className="py-2.5 px-3">Occupied</th>
                <th className="py-2.5 px-3">OOO / OOS</th>
                <th className="py-2.5 px-3">Occupancy</th>
                <th className="py-2.5 px-3">ADR</th>
                <th className="py-2.5 px-3">RevPAR</th>
                <th className="py-2.5 px-4 text-right">Room Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.dailyRows && report.dailyRows.length > 0 ? (
                report.dailyRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-4 font-mono font-medium text-foreground">{row.date}</td>
                    <td className="py-2 px-3 text-muted-foreground">{row.totalRooms}</td>
                    <td className="py-2 px-3 font-medium text-foreground">{row.sellableRooms}</td>
                    <td className="py-2 px-3 text-indigo-600 font-semibold">{row.occupiedRooms}</td>
                    <td className="py-2 px-3 text-rose-600 font-mono">{row.outOfOrderRooms + row.outOfServiceRooms}</td>
                    <td className="py-2 px-3 font-semibold text-foreground">{formatPercentage(row.occupancyRate)}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{formatCurrency(row.adr, currency)}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{formatCurrency(row.revPar, currency)}</td>
                    <td className="py-2 px-4 text-right font-semibold text-emerald-600 font-mono">
                      {formatCurrency(row.roomRevenue, currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No data available for the selected period.
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
