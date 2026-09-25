"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchGuestAnalyticsReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatPercentage } from "@/lib/reports/formatters";
import type {
  GuestAnalyticsReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import { Users, UserPlus, HeartHandshake, Globe } from "lucide-react";

export default function GuestAnalyticsReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<GuestAnalyticsReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchGuestAnalyticsReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load guest analytics report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchGuestAnalyticsReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load guest analytics report:", err);
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
      const headers = ["Nationality", "Guest Count", "Percentage"];
      const rows = report.byNationality.map((n) => [
        n.country,
        n.guestCount,
        `${n.percentage}%`,
      ]);
      const res = await exportReportCsvAction(propertyId, "guests", headers, rows, "Guest Demographics & Loyalty Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_guest_analytics_${startDate}_${endDate}.csv`);
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
        title="Guest Demographics & Analytics"
        description="Guest profiles, loyalty retention rates, nationality and demographic breakdowns."
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
          title="Total Guests"
          value={report?.summary.totalGuests.current || 0}
          metric={report?.summary.totalGuests}
          subtitle="Registered guest profiles"
          icon={<Users className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="New Guests"
          value={report?.summary.newGuests || 0}
          subtitle="First-time visitors"
          icon={<UserPlus className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Returning Guests"
          value={report?.summary.returningGuests || 0}
          subtitle="Repeat stay guests"
          icon={<HeartHandshake className="w-4 h-4 text-rose-500" />}
          variant="rose"
        />

        <KpiCard
          title="Retention Rate"
          value={formatPercentage(report?.summary.returningGuestRate)}
          subtitle="Repeat visitor %"
          icon={<Globe className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />
      </div>

      {/* Breakdown by Nationality & Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold">Nationality Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="py-2.5 px-4">Country</th>
                  <th className="py-2.5 px-3">Guests</th>
                  <th className="py-2.5 px-4 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {report?.byNationality && report.byNationality.length > 0 ? (
                  report.byNationality.map((n, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2 px-4 font-medium text-foreground">{n.country}</td>
                      <td className="py-2 px-3 font-semibold font-mono">{n.guestCount}</td>
                      <td className="py-2 px-4 text-right font-medium text-muted-foreground">{n.percentage}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                      No nationality data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold">Language Preference</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="py-2.5 px-4">Language</th>
                  <th className="py-2.5 px-3">Guests</th>
                  <th className="py-2.5 px-4 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {report?.byLanguage && report.byLanguage.length > 0 ? (
                  report.byLanguage.map((l, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2 px-4 font-medium text-foreground">{l.language}</td>
                      <td className="py-2 px-3 font-semibold font-mono">{l.guestCount}</td>
                      <td className="py-2 px-4 text-right font-medium text-muted-foreground">{l.percentage}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                      No language preference recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
