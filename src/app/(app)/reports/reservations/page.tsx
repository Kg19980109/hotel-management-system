"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchReservationReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatCurrency, formatPercentage } from "@/lib/reports/formatters";
import type {
  ReservationReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { CalendarCheck, Clock, XCircle, Award } from "lucide-react";

export default function ReservationsReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<ReservationReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchReservationReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load reservation report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchReservationReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load reservation report:", err);
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
      const headers = ["Booking Source", "Reservations Count", "Percentage", "Revenue", "ALOS (Nights)"];
      const rows = report.bySource.map((s) => [
        s.source,
        s.count,
        `${s.percentage}%`,
        s.revenue,
        s.alos,
      ]);
      const res = await exportReportCsvAction(propertyId, "reservations", headers, rows, "Reservations & Booking Sources Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_reservations_report_${startDate}_${endDate}.csv`);
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
        title="Reservation & Booking Source Analytics"
        description="Booking volume, channel mix, average length of stay (ALOS), and booking lead time."
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
          title="Total Bookings"
          value={report?.summary.totalReservations.current || 0}
          metric={report?.summary.totalReservations}
          subtitle="New reservations created"
          icon={<CalendarCheck className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="Avg Length of Stay (ALOS)"
          value={`${report?.summary.averageLengthOfStay.current || 0} nights`}
          metric={report?.summary.averageLengthOfStay}
          subtitle="Total nights / Bookings"
          icon={<Clock className="w-4 h-4 text-blue-500" />}
        />

        <KpiCard
          title="Avg Lead Time"
          value={`${report?.summary.averageLeadTimeDays.current || 0} days`}
          metric={report?.summary.averageLeadTimeDays}
          subtitle="Days prior to check-in"
          icon={<Award className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />

        <KpiCard
          title="Cancellation Rate"
          value={formatPercentage(report?.summary.cancellationRate)}
          subtitle={`${report?.summary.cancelledCount || 0} cancelled`}
          icon={<XCircle className="w-4 h-4 text-rose-500" />}
          variant="rose"
        />
      </div>

      {/* Breakdown by Booking Source */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Performance by Booking Source</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Booking Source</th>
                <th className="py-2.5 px-3">Reservations</th>
                <th className="py-2.5 px-3">Share %</th>
                <th className="py-2.5 px-3">Avg Stay</th>
                <th className="py-2.5 px-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.bySource && report.bySource.length > 0 ? (
                report.bySource.map((s, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-4 font-medium text-foreground">{s.source}</td>
                    <td className="py-2 px-3 font-semibold text-foreground font-mono">{s.count}</td>
                    <td className="py-2 px-3 text-muted-foreground">{s.percentage}%</td>
                    <td className="py-2 px-3 text-muted-foreground">{s.alos} nights</td>
                    <td className="py-2 px-4 text-right font-semibold text-emerald-600 font-mono">
                      {formatCurrency(s.revenue, currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No booking source data available for this period.
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
