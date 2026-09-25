"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import {
  fetchKitchenReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatDurationMinutes } from "@/lib/reports/formatters";
import type {
  KitchenReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { ChefHat, Clock, CheckCircle, AlertTriangle } from "lucide-react";

export default function KitchenReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<KitchenReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchKitchenReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load kitchen report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchKitchenReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load kitchen report:", err);
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
        ["Total Tickets", report.summary.totalTickets.current],
        ["Completed Tickets", report.summary.completedTickets],
        ["Avg Prep Time (Minutes)", report.summary.averagePrepTimeMinutes.current],
        ["Delayed Tickets", report.summary.delayedTicketsCount],
        ["Remake Tickets", report.summary.remakeTicketsCount],
      ];
      const res = await exportReportCsvAction(propertyId, "kitchen", headers, rows, "Kitchen Display System (KDS) Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_kitchen_report_${startDate}_${endDate}.csv`);
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
        title="Kitchen Display System (KDS) Analytics"
        description="Ticket counts, average preparation durations, station throughput, and ticket delays."
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
          title="Total Kitchen Tickets"
          value={report?.summary.totalTickets.current || 0}
          metric={report?.summary.totalTickets}
          subtitle="Orders routed to KDS"
          icon={<ChefHat className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Average Prep Time"
          value={formatDurationMinutes(report?.summary.averagePrepTimeMinutes.current)}
          metric={report?.summary.averagePrepTimeMinutes}
          subtitle="Time to ready status"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />

        <KpiCard
          title="Completed Tickets"
          value={report?.summary.completedTickets || 0}
          subtitle="Dispatched from kitchen"
          icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Delayed Tickets"
          value={report?.summary.delayedTicketsCount || 0}
          subtitle="Exceeded target time"
          icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
        />
      </div>
    </div>
  );
}
