"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { OwnerExecutiveKpisView } from "@/components/reports/business/owner-executive-kpis";
import { BusinessAttentionCard } from "@/components/reports/business/business-attention-card";
import { FinancialOperatingSection } from "@/components/reports/business/financial-operating-section";
import { RevenueExpenseFlow } from "@/components/reports/business/revenue-expense-flow";
import { RoomBookingPerformance } from "@/components/reports/business/room-booking-performance";
import { RestaurantFbPerformance } from "@/components/reports/business/restaurant-fb-performance";
import { OperationsIntelligenceSection } from "@/components/reports/business/operations-intelligence-section";
import { OutstandingMoneySection } from "@/components/reports/business/outstanding-money-section";
import { BusinessTrendsSection } from "@/components/reports/business/business-trends-section";
import { LoadingState } from "@/components/ui/states";
import {
  fetchOwnerBusinessReportAction,
  exportOwnerBusinessReportCsvAction,
} from "@/lib/reports/business-actions";
import type {
  OwnerBusinessReportData,
} from "@/lib/reports/business-types";
import type {
  DateRangePreset,
  ComparisonPreset,
} from "@/lib/reports/types";

export default function OwnerBusinessIntelligencePage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Property";

  const [preset, setPreset] = React.useState<DateRangePreset>("THIS_MONTH");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("PREVIOUS_PERIOD");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<OwnerBusinessReportData | null>(null);

  // Load report data
  const loadData = React.useCallback(async () => {
    try {
      const res = await fetchOwnerBusinessReportAction(propertyId, {
        preset,
        comparison,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.data) {
        setReport(res.data);
        if (!startDate) setStartDate(res.data.dateRange.startDate);
        if (!endDate) setEndDate(res.data.dateRange.endDate);
      }
    } catch (err) {
      console.error("Failed to load owner business report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    setIsLoading(true);
    void loadData();
  }, [loadData]);

  // 2s visible-only refresh
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadData();
    }, 2000);
    return () => clearInterval(timer);
  }, [loadData]);

  // CSV Export
  const handleExportCsv = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      const res = await exportOwnerBusinessReportCsvAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data?.content) {
        const blob = new Blob([res.data.content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.data.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to export business report CSV:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading || (isLoading && !report)) {
    return <LoadingState message="Aggregating owner business intelligence..." />;
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <ReportNav />
        <div className="p-12 text-center text-muted-foreground text-xs">
          Unable to generate business report for this property.
        </div>
      </div>
    );
  }

  const currency = report.currency || "INR";

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Sub-navigation across reports */}
      <ReportNav />

      {/* 2. Header with Date Controls & Export */}
      <ReportHeader
        title="Owner Business Intelligence & Financial Command"
        description={`Executive performance analytics, revenue streams, operational expenditures, and key indicators for ${propertyName}.`}
        activePreset={preset}
        comparison={comparison}
        startDate={startDate || report.dateRange.startDate}
        endDate={endDate || report.dateRange.endDate}
        onPresetChange={(p) => setPreset(p)}
        onComparisonChange={(c) => setComparison(c)}
        onCustomDateChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
      />

      {/* 3. Executive KPI Strip */}
      <OwnerExecutiveKpisView
        kpis={report.executiveKpis}
        currency={currency}
        isLoading={isLoading}
      />

      {/* 4. Actionable Business Attention Alerts */}
      <BusinessAttentionCard items={report.attentionItems} />

      {/* 5. Financial Operating Equation & Revenue Breakdown */}
      <FinancialOperatingSection
        financials={report.financialPerformance}
        revenueBreakdown={report.revenueBreakdown}
        currency={currency}
      />

      {/* 6. Revenue Streams & Expense Allocation Flow */}
      <RevenueExpenseFlow
        revenueBreakdown={report.revenueBreakdown}
        expenseIntelligence={report.expenseIntelligence}
        grossRevenue={report.financialPerformance.grossRevenue}
        totalExpenses={report.financialPerformance.totalExpenses}
        currency={currency}
      />

      {/* 7. Accommodation & Booking Performance */}
      <RoomBookingPerformance
        performance={report.roomPerformance}
        currency={currency}
      />

      {/* 8. Restaurant & Food & Beverage Intelligence */}
      <RestaurantFbPerformance
        performance={report.restaurantPerformance}
        currency={currency}
      />

      {/* 9. Operations Intelligence (Housekeeping, Maintenance, Staff, Services) */}
      <OperationsIntelligenceSection operations={report.operationsIntelligence} />

      {/* 10. Outstanding Receivables & Unpaid Accounts */}
      <OutstandingMoneySection
        outstanding={report.outstandingMoney}
        currency={currency}
      />

      {/* 11. Daily Performance Trend Timeline & Interactive Graph */}
      <BusinessTrendsSection trends={report.dailyTrends} currency={currency} />
    </div>
  );
}
