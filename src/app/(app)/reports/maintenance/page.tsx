"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import {
  fetchMaintenanceReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatDurationHours } from "@/lib/reports/formatters";
import type {
  MaintenanceReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { Wrench, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export default function MaintenanceReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<MaintenanceReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchMaintenanceReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load maintenance report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchMaintenanceReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load maintenance report:", err);
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
        ["Open Work Orders", report.summary.openWorkOrders.current],
        ["Completed Work Orders", report.summary.completedWorkOrders],
        ["Average Resolution Time (Hours)", report.summary.averageResolutionTimeHours],
        ["Preventive Tasks Count", report.summary.preventiveTasksCount],
        ["Overdue Work Orders", report.summary.overdueWorkOrdersCount],
      ];
      const res = await exportReportCsvAction(propertyId, "maintenance", headers, rows, "Maintenance & Work Orders Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_maintenance_report_${startDate}_${endDate}.csv`);
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
        title="Maintenance & Facilities Analytics"
        description="Work order resolution rates, average turnaround time, preventive maintenance, and room downtime."
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
          title="Open Work Orders"
          value={report?.summary.openWorkOrders.current || 0}
          metric={report?.summary.openWorkOrders}
          subtitle="Currently in progress"
          icon={<Wrench className="w-4 h-4 text-orange-500" />}
          variant="default"
        />

        <KpiCard
          title="Completed Work Orders"
          value={report?.summary.completedWorkOrders || 0}
          subtitle="Resolved repair tickets"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Avg Resolution Time"
          value={formatDurationHours(report?.summary.averageResolutionTimeHours)}
          subtitle="Ticket open to close"
          icon={<Clock className="w-4 h-4 text-blue-500" />}
        />

        <KpiCard
          title="Overdue Work Orders"
          value={report?.summary.overdueWorkOrdersCount || 0}
          subtitle="Past target SLA"
          icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
          variant="rose"
        />
      </div>
    </div>
  );
}
