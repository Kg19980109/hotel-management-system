"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchDashboardReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatCurrency, formatPercentage } from "@/lib/reports/formatters";
import type {
  DashboardReportData,
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";
import {
  BedDouble,
  DollarSign,
  TrendingUp,
  Users,
  Luggage,
  Sparkles,
  Wrench,
  Boxes,
  UtensilsCrossed,
  Receipt,
} from "lucide-react";

export default function ReportsDashboardPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<DashboardReportData | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchDashboardReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) {
        setReport(res.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchDashboardReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) {
          setReport(res.data);
          setStartDate(res.data.dateRange.startDate);
          setEndDate(res.data.dateRange.endDate);
        }
      } catch (err) {
        console.error("Failed to load dashboard report:", err);
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
      const headers = ["Date", "Occupancy %", "Room Revenue", "Restaurant Revenue", "Total Revenue", "Arrivals", "Departures"];
      const rows = report.dailyTrends.map((d) => [
        d.date,
        d.occupancyRate,
        d.roomRevenue,
        d.restaurantRevenue,
        d.totalRevenue,
        d.arrivals,
        d.departures,
      ]);
      const res = await exportReportCsvAction(propertyId, "dashboard", headers, rows, "Executive Dashboard Report");
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_dashboard_report_${startDate}_${endDate}.csv`);
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

  const currency = report?.propertyContext.currency || "INR";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header with global controls */}
      <ReportHeader
        title="Reports & Analytics"
        description="Comprehensive property intelligence, financial metrics, and operational performance."
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

      {/* Navigation Sub-Tabs */}
      <ReportNav />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Occupancy"
          value={formatPercentage(report?.kpis.occupancy.current)}
          metric={report?.kpis.occupancy}
          subtitle="Sellable rooms basis"
          icon={<BedDouble className="w-4 h-4 text-indigo-500" />}
          variant="indigo"
        />

        <KpiCard
          title="ADR (Avg Daily Rate)"
          value={formatCurrency(report?.kpis.adr.current, currency)}
          metric={report?.kpis.adr}
          subtitle="Per room sold night"
          icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
          variant="gold"
        />

        <KpiCard
          title="RevPAR"
          value={formatCurrency(report?.kpis.revPar.current, currency)}
          metric={report?.kpis.revPar}
          subtitle="Per available room night"
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />

        <KpiCard
          title="Total Net Revenue"
          value={formatCurrency(report?.kpis.totalRevenue.current, currency)}
          metric={report?.kpis.totalRevenue}
          subtitle="All outlets & rooms"
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          variant="emerald"
        />

        <KpiCard
          title="Room Revenue"
          value={formatCurrency(report?.kpis.roomRevenue.current, currency)}
          metric={report?.kpis.roomRevenue}
          subtitle="Authoritative room charges"
          icon={<BedDouble className="w-4 h-4 text-indigo-400" />}
        />

        <KpiCard
          title="Restaurant Sales"
          value={formatCurrency(report?.kpis.restaurantRevenue.current, currency)}
          metric={report?.kpis.restaurantRevenue}
          subtitle="Dine-in, room service, takeaway"
          icon={<UtensilsCrossed className="w-4 h-4 text-amber-500" />}
        />

        <KpiCard
          title="In-House Guests"
          value={report?.kpis.inHouseGuests.current || 0}
          metric={report?.kpis.inHouseGuests}
          subtitle="Active stay headcount"
          icon={<Users className="w-4 h-4 text-blue-500" />}
        />

        <KpiCard
          title="Arrivals / Departures"
          value={`${report?.kpis.arrivals.current || 0} / ${report?.kpis.departures.current || 0}`}
          subtitle="Front desk movements"
          icon={<Luggage className="w-4 h-4 text-sky-500" />}
        />
      </div>

      {/* Operational Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Outstanding Folios"
          value={report?.kpis.outstandingFolios.current || 0}
          subtitle="Open un-settled folios"
          icon={<Receipt className="w-4 h-4 text-rose-500" />}
          variant="rose"
        />

        <KpiCard
          title="Low Stock Items"
          value={report?.kpis.lowStockItemsCount || 0}
          subtitle="Below reorder threshold"
          icon={<Boxes className="w-4 h-4 text-amber-500" />}
        />

        <KpiCard
          title="Housekeeping Pass"
          value={formatPercentage(report?.kpis.housekeepingCompletionRate.current)}
          metric={report?.kpis.housekeepingCompletionRate}
          subtitle="Completed vs scheduled"
          icon={<Sparkles className="w-4 h-4 text-emerald-500" />}
        />

        <KpiCard
          title="Open Work Orders"
          value={report?.kpis.maintenanceOpenOrders.current || 0}
          subtitle="Active maintenance tickets"
          icon={<Wrench className="w-4 h-4 text-orange-500" />}
        />
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart (2 Cols) */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue & Occupancy Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {report?.dailyTrends && report.dailyTrends.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="h-48 w-full flex items-end gap-1 pt-6 pb-2 border-b border-border/60">
                  {report.dailyTrends.slice(-14).map((d, i) => {
                    const heightPct = Math.min(100, Math.max(10, (d.totalRevenue / (report.kpis.totalRevenue.current || 1)) * 100 * 5));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatCurrency(d.totalRevenue, currency)}
                        </div>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all"
                        />
                        <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Past 14 days daily revenue bars</span>
                  <span className="font-medium text-foreground">
                    Avg Daily: {formatCurrency((report?.kpis.totalRevenue.current || 0) / (report?.dailyTrends.length || 1), currency)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No trend data available for the selected period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Distribution (1 Col) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col gap-4">
            {report?.revenueBySource && report.revenueBySource.length > 0 ? (
              report.revenueBySource.map((s, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>{s.source}</span>
                    <span className="text-foreground">{formatCurrency(s.amount, currency)} ({s.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${i === 0 ? "bg-indigo-600" : i === 1 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${s.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No revenue recorded in this period.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
