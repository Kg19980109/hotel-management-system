"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchFrontDeskReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import type {
  FrontDeskReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { Luggage, LogOut, Users, UserX } from "lucide-react";

export default function FrontDeskReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<FrontDeskReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchFrontDeskReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load front desk report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchFrontDeskReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load front desk report:", err);
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
      const headers = ["Guest Name", "Room Number", "Check In", "Check Out", "Status"];
      const rows = report.arrivalsList.map((a) => [
        a.guestName,
        a.roomNumber || "Unassigned",
        a.checkInDate,
        a.checkOutDate,
        a.status,
      ]);
      const res = await exportReportCsvAction(propertyId, "front-desk", headers, rows, "Front Desk Stays & Movements Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_front_desk_report_${startDate}_${endDate}.csv`);
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
        title="Front Desk & Guest Movements"
        description="Arrivals, departures, current in-house occupancy, and stay movements."
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
          title="Arrivals"
          value={report?.summary.arrivalsCount.current || 0}
          metric={report?.summary.arrivalsCount}
          subtitle="Check-ins in period"
          icon={<Luggage className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Departures"
          value={report?.summary.departuresCount.current || 0}
          metric={report?.summary.departuresCount}
          subtitle="Completed checkouts"
          icon={<LogOut className="w-4 h-4 text-blue-500" />}
        />

        <KpiCard
          title="In-House Guests"
          value={report?.summary.currentInHouseGuests || 0}
          subtitle="Active stay occupants"
          icon={<Users className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="No Shows"
          value={report?.summary.noShowsCount || 0}
          subtitle="Unfulfilled reservations"
          icon={<UserX className="w-4 h-4 text-rose-500" />}
        />
      </div>

      {/* Recent Movements Table */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Stay Log & Guest Movements</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Guest Name</th>
                <th className="py-2.5 px-3">Room</th>
                <th className="py-2.5 px-3">Check In Date</th>
                <th className="py-2.5 px-3">Check Out Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {report?.arrivalsList && report.arrivalsList.length > 0 ? (
                report.arrivalsList.map((a, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-4 font-medium text-foreground">{a.guestName}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-primary">{a.roomNumber}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{a.checkInDate}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{a.checkOutDate}</td>
                    <td className="py-2 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-muted-foreground">{a.source}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    No front desk movements in this period.
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
