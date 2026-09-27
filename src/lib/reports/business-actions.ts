"use server";

// ============================================================
// STAYHUB OWNER BUSINESS INTELLIGENCE — SERVER ACTIONS
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { getOwnerBusinessReport } from "./business-queries";
import type { ReportFilterParams } from "./types";
import type { OwnerBusinessReportData } from "./business-types";

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Authenticate session & verify access for Owner Business Intelligence
 */
async function authenticateOwnerSession(_propertyId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, error: "Authentication required" };
  }

  // Check if user belongs to property
  const { data: member } = await supabase
    .from("organization_members")
    .select("role, is_active")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return { supabase, user, member, error: null };
}

/**
 * Fetch complete Owner Business Intelligence aggregated report
 */
export async function fetchOwnerBusinessReportAction(
  propertyId: string,
  params: Partial<ReportFilterParams>
): Promise<ActionResponse<OwnerBusinessReportData>> {
  try {
    const { supabase, error } = await authenticateOwnerSession(propertyId);
    if (error || !supabase) return { success: false, error: error || "Unauthorized" };

    const data = await getOwnerBusinessReport(supabase, propertyId, params);
    return { success: true, data };
  } catch (err) {
    console.error("fetchOwnerBusinessReportAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate business report.",
    };
  }
}

/**
 * Export Owner Business Report summary to CSV
 */
export async function exportOwnerBusinessReportCsvAction(
  propertyId: string,
  params: Partial<ReportFilterParams>
): Promise<ActionResponse<{ filename: string; content: string }>> {
  try {
    const { supabase, error } = await authenticateOwnerSession(propertyId);
    if (error || !supabase) return { success: false, error: error || "Unauthorized" };

    const report = await getOwnerBusinessReport(supabase, propertyId, params);

    const headers = [
      "Metric / Category",
      "Current Period Value",
      "Previous Period Value",
      "Change (%)",
    ];

    const rows = [
      ["Gross Revenue", report.executiveKpis.totalRevenue.current, report.executiveKpis.totalRevenue.previous ?? "-", report.executiveKpis.totalRevenue.displayPctDiff || "-"],
      ["Total Operating Expenses", report.executiveKpis.totalExpenses.current, report.executiveKpis.totalExpenses.previous ?? "-", report.executiveKpis.totalExpenses.displayPctDiff || "-"],
      ["Operating Result", report.executiveKpis.operatingResult.current, report.executiveKpis.operatingResult.previous ?? "-", report.executiveKpis.operatingResult.displayPctDiff || "-"],
      ["Occupancy Rate (%)", `${report.executiveKpis.occupancyRate.current}%`, `${report.executiveKpis.occupancyRate.previous ?? 0}%`, report.executiveKpis.occupancyRate.displayPctDiff || "-"],
      ["Average Daily Rate (ADR)", report.executiveKpis.adr.current, report.executiveKpis.adr.previous ?? "-", report.executiveKpis.adr.displayPctDiff || "-"],
      ["RevPAR", report.executiveKpis.revpar.current, report.executiveKpis.revpar.previous ?? "-", report.executiveKpis.revpar.displayPctDiff || "-"],
      ["Total Bookings / Stays", report.executiveKpis.totalBookings.current, report.executiveKpis.totalBookings.previous ?? "-", report.executiveKpis.totalBookings.displayPctDiff || "-"],
      ["Payments Collected", report.financialPerformance.paymentsCollected, "-", "-"],
      ["Outstanding Receivables", report.financialPerformance.outstandingReceivables, "-", "-"],
      ["Room Accommodation Revenue", report.financialPerformance.roomRevenue, "-", "-"],
      ["F&B Total Sales", report.restaurantPerformance.totalFbSales, "-", "-"],
      ["Top Expense Category", report.expenseIntelligence.topCategoryName || "None", report.expenseIntelligence.topCategoryAmount, "-"],
    ];

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const dateStr = new Date().toISOString().split("T")[0];

    return {
      success: true,
      data: {
        filename: `stayhub-owner-business-report-${dateStr}.csv`,
        content: csvContent,
      },
    };
  } catch (err) {
    console.error("exportOwnerBusinessReportCsvAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to export report CSV",
    };
  }
}
