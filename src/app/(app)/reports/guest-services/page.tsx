"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import {
  fetchGuestServiceReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatPercentage } from "@/lib/reports/formatters";
import type {
  GuestServiceReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { BellRing, CheckCircle2, Clock, XCircle } from "lucide-react";

export default function GuestServiceReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<GuestServiceReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchGuestServiceReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load guest services report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchGuestServiceReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load guest services report:", err);
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
        ["Total Requests", report.summary.totalRequests.current],
        ["Completed Requests", report.summary.completedRequests],
        ["Pending Requests", report.summary.pendingRequests],
        ["Cancelled Requests", report.summary.cancelledRequests],
        ["Completion Rate %", report.summary.completionRate],
      ];
      const res = await exportReportCsvAction(propertyId, "guest-services", headers, rows, "Guest Service Requests & SLA Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_guest_services_${startDate}_${endDate}.csv`);
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
        title="Guest Services & Request SLA Analytics"
        description="Room amenities, luggage assistance, concierge and housekeeping requests raised via QR portal or front desk."
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
          title="Total Service Requests"
          value={report?.summary.totalRequests.current || 0}
          metric={report?.summary.totalRequests}
          subtitle="QR & front desk tickets"
          icon={<BellRing className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Fulfilled Requests"
          value={report?.summary.completedRequests || 0}
          subtitle="Completed guest requests"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Fulfillment Rate"
          value={formatPercentage(report?.summary.completionRate)}
          subtitle="Completed vs requested"
          icon={<Clock className="w-4 h-4 text-blue-500" />}
        />

        <KpiCard
          title="Pending in Queue"
          value={report?.summary.pendingRequests || 0}
          subtitle="Awaiting staff action"
          icon={<XCircle className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />
      </div>
    </div>
  );
}
