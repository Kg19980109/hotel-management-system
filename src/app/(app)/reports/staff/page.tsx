"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchStaffReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatPercentage } from "@/lib/reports/formatters";
import type {
  StaffReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { UserCheck, Clock, CalendarDays } from "lucide-react";

export default function StaffReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("NONE");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<StaffReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchStaffReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load staff report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchStaffReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load staff report:", err);
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
      const headers = ["Employee Name", "Department", "Shifts Scheduled", "Days Present", "Days Late", "Attendance Rate %"];
      const rows = report.staffMembers.map((s) => [
        s.fullName,
        s.department,
        s.shiftsScheduled,
        s.daysPresent,
        s.daysLate,
        s.rate,
      ]);
      const res = await exportReportCsvAction(propertyId, "staff", headers, rows, "Staff Attendance & Rostering Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_staff_attendance_${startDate}_${endDate}.csv`);
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
        title="Staff & Attendance Analytics"
        description="Employee check-in punctuality, attendance rates, department rosters, and leave utilisation."
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
          title="Attendance Rate"
          value={formatPercentage(report?.summary.overallAttendanceRate.current)}
          metric={report?.summary.overallAttendanceRate}
          subtitle="Present / Scheduled shifts"
          icon={<UserCheck className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Active Staff"
          value={report?.summary.activeStaffCount || 0}
          subtitle="Onboarded team members"
          icon={<UserCheck className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Late Check-ins"
          value={report?.summary.lateCount || 0}
          subtitle="Arrived after grace period"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />

        <KpiCard
          title="Approved Leave Days"
          value={report?.summary.onLeaveCount || 0}
          subtitle="Scheduled time off"
          icon={<CalendarDays className="w-4 h-4 text-blue-500" />}
        />
      </div>

      {/* Staff Attendance Summary Table */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Staff Attendance Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Shifts Scheduled</th>
                <th className="py-2.5 px-3">Days Present</th>
                <th className="py-2.5 px-3">Late Count</th>
                <th className="py-2.5 px-4 text-right">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.staffMembers && report.staffMembers.length > 0 ? (
                report.staffMembers.map((s, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-2 px-4 font-medium text-foreground">{s.fullName}</td>
                    <td className="py-2 px-3 text-muted-foreground">{s.department}</td>
                    <td className="py-2 px-3 font-mono">{s.shiftsScheduled}</td>
                    <td className="py-2 px-3 font-mono text-emerald-600 font-semibold">{s.daysPresent}</td>
                    <td className="py-2 px-3 font-mono text-amber-600">{s.daysLate}</td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-foreground">{formatPercentage(s.rate)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    No staff attendance records for this period.
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
