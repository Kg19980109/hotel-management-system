"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import {
  fetchHousekeepingReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatPercentage } from "@/lib/reports/formatters";
import type {
  HousekeepingReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { Sparkles, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

export default function HousekeepingReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<HousekeepingReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchHousekeepingReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load housekeeping report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchHousekeepingReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load housekeeping report:", err);
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
        ["Tasks Created", report.summary.tasksCreated.current],
        ["Tasks Completed", report.summary.tasksCompleted],
        ["Pending Tasks", report.summary.pendingTasks],
        ["Inspection Pass Rate %", report.summary.inspectionPassRate.current],
        ["Inspection Failure Rate %", report.summary.inspectionFailureRate],
        ["Average Cleaning Time (mins)", report.summary.averageCleaningTimeMinutes],
      ];
      const res = await exportReportCsvAction(propertyId, "housekeeping", headers, rows, "Housekeeping & Inspection Operations Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_housekeeping_report_${startDate}_${endDate}.csv`);
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
        title="Housekeeping & Inspection Operations"
        description="Cleaning task completion, supervisor inspection pass rate, and turnover durations."
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
          title="Cleaning Tasks Created"
          value={report?.summary.tasksCreated.current || 0}
          metric={report?.summary.tasksCreated}
          subtitle="Assigned cleaning jobs"
          icon={<Sparkles className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Tasks Completed"
          value={report?.summary.tasksCompleted || 0}
          subtitle="Cleaned & inspected"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Inspection Pass Rate"
          value={formatPercentage(report?.summary.inspectionPassRate.current)}
          metric={report?.summary.inspectionPassRate}
          subtitle="Supervisor QC approvals"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
          variant="emerald"
        />

        <KpiCard
          title="Avg Cleaning Duration"
          value={`${report?.summary.averageCleaningTimeMinutes || 28} mins`}
          subtitle="Standard room turnover"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />
      </div>
    </div>
  );
}
