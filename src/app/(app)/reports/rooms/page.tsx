"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchRoomPerformanceReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatCurrency, formatPercentage } from "@/lib/reports/formatters";
import type {
  RoomPerformanceReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { DoorOpen, TrendingUp, DollarSign } from "lucide-react";

export default function RoomPerformanceReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("NONE");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<RoomPerformanceReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchRoomPerformanceReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load room performance report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchRoomPerformanceReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load room performance report:", err);
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
      const headers = ["Room Number", "Room Type", "Floor", "Available Nights", "Sold Nights", "Occupancy %", "ADR", "RevPAR", "Room Revenue"];
      const rows = report.rooms.map((r) => [
        r.roomNumber,
        r.roomType,
        r.floor,
        r.nightsAvailable,
        r.nightsSold,
        r.occupancyRate,
        r.adr,
        r.revPar,
        r.totalRevenue,
      ]);
      const res = await exportReportCsvAction(propertyId, "rooms", headers, rows, "Room Performance Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_room_performance_${startDate}_${endDate}.csv`);
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
        title="Room & Category Performance"
        description="Room nights sold, utilization rates, and revenue performance broken down by room, category, and floor."
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
          title="Room Nights Sold"
          value={report?.summary.totalNightsSold || 0}
          subtitle={`Out of ${report?.summary.totalNightsAvailable || 0} available`}
          icon={<DoorOpen className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Overall Occupancy"
          value={formatPercentage(report?.summary.overallOccupancy)}
          subtitle="Portfolio average"
          icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Average ADR"
          value={formatCurrency(report?.summary.averageAdr, currency)}
          subtitle="Revenue / Sold nights"
          icon={<DollarSign className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />

        <KpiCard
          title="Total Room Revenue"
          value={formatCurrency(report?.summary.totalRoomRevenue, currency)}
          subtitle="Authoritative room ledger"
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          variant="emerald"
        />
      </div>

      {/* Breakdown by Room Type */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Performance by Room Type</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Room Type</th>
                <th className="py-2.5 px-3">Total Rooms</th>
                <th className="py-2.5 px-3">Nights Available</th>
                <th className="py-2.5 px-3">Nights Sold</th>
                <th className="py-2.5 px-3">Occupancy</th>
                <th className="py-2.5 px-3">ADR</th>
                <th className="py-2.5 px-3">RevPAR</th>
                <th className="py-2.5 px-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.roomTypes && report.roomTypes.length > 0 ? (
                report.roomTypes.map((rt, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-4 font-medium text-foreground">{rt.roomTypeName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{rt.totalRooms}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{rt.nightsAvailable}</td>
                    <td className="py-2 px-3 text-indigo-600 font-semibold font-mono">{rt.nightsSold}</td>
                    <td className="py-2 px-3 font-semibold text-foreground">{formatPercentage(rt.occupancyRate)}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{formatCurrency(rt.adr, currency)}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{formatCurrency(rt.revPar, currency)}</td>
                    <td className="py-2 px-4 text-right font-semibold text-emerald-600 font-mono">
                      {formatCurrency(rt.totalRevenue, currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    No room type performance data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Individual Room Performance */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Individual Room Utilization</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Room</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Floor</th>
                <th className="py-2.5 px-3">Avail Nights</th>
                <th className="py-2.5 px-3">Sold Nights</th>
                <th className="py-2.5 px-3">Occupancy</th>
                <th className="py-2.5 px-3">ADR</th>
                <th className="py-2.5 px-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.rooms && report.rooms.length > 0 ? (
                report.rooms.map((r, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-4 font-mono font-bold text-foreground">Room {r.roomNumber}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.roomType}</td>
                    <td className="py-2 px-3 text-muted-foreground">Floor {r.floor}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{r.nightsAvailable}</td>
                    <td className="py-2 px-3 text-indigo-600 font-semibold font-mono">{r.nightsSold}</td>
                    <td className="py-2 px-3 font-semibold text-foreground">{formatPercentage(r.occupancyRate)}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{formatCurrency(r.adr, currency)}</td>
                    <td className="py-2 px-4 text-right font-semibold text-emerald-600 font-mono">
                      {formatCurrency(r.totalRevenue, currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    No room data found.
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
