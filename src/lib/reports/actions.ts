"use server";

// ============================================================
// STAYHUB REPORTING SERVER ACTIONS (Phase 19)
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { hasReportPermission, type ReportPermission } from "./permissions";
import {
  getDashboardReport,
  getOccupancyReport,
  getRoomPerformanceReport,
  getReservationReport,
  getFrontDeskReport,
  getGuestAnalyticsReport,
  getRevenueReport,
  getFinancialReport,
  getRestaurantReport,
  getKitchenReport,
  getHousekeepingReport,
  getMaintenanceReport,
  getInventoryReport,
  getInventoryConsumptionReport,
  getSupplierReport,
  getStaffReport,
  getExpenseReport,
  getGuestServiceReport,
} from "./queries";
import { exportToCsv } from "./formatters";
import type { ReportFilterParams } from "./types";

interface AuthCheckResult {
  userId: string;
  roleCode: string;
}

async function checkReportAuth(
  propertyId: string,
  requiredPermission: ReportPermission
): Promise<{ error?: string; user?: AuthCheckResult }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required. Please log in to view reports." };
    }

    // Check membership
    const { data: membership } = await supabase
      .from("property_memberships")
      .select("role:roles(code), status")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    let roleCode = "GENERAL_MANAGER";
    if (membership?.role) {
      roleCode = (membership.role as unknown as { code: string })?.code || "GENERAL_MANAGER";
    }

    if (!hasReportPermission(roleCode, requiredPermission)) {
      return {
        error: `Access denied. Your role (${roleCode}) does not have '${requiredPermission}' access.`,
      };
    }

    return { user: { userId: user.id, roleCode } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify report permissions.";
    return { error: message };
  }
}

export async function fetchDashboardReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORTS_VIEW");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getDashboardReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchOccupancyReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_OCCUPANCY");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getOccupancyReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchRoomPerformanceReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_OCCUPANCY");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getRoomPerformanceReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchReservationReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_RESERVATIONS");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getReservationReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchFrontDeskReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_RESERVATIONS");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getFrontDeskReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchGuestAnalyticsReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_GUESTS");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getGuestAnalyticsReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchRevenueReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_REVENUE");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getRevenueReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchFinancialReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_FINANCIALS");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getFinancialReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchRestaurantReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_RESTAURANT");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getRestaurantReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchKitchenReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_KITCHEN");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getKitchenReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchHousekeepingReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_HOUSEKEEPING");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getHousekeepingReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchMaintenanceReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_MAINTENANCE");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getMaintenanceReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchInventoryReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_INVENTORY");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getInventoryReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchInventoryConsumptionReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_INVENTORY");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getInventoryConsumptionReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchSupplierReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_SUPPLIERS");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getSupplierReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchStaffReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_STAFF");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getStaffReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchExpenseReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_EXPENSES");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getExpenseReport(supabase, propertyId, params);
  return { error: null, data };
}

export async function fetchGuestServiceReportAction(propertyId: string, params: Partial<ReportFilterParams>) {
  const auth = await checkReportAuth(propertyId, "REPORT_GUEST_SERVICES");
  if (auth.error) return { error: auth.error, data: null };

  const supabase = await createClient();
  const data = await getGuestServiceReport(supabase, propertyId, params);
  return { error: null, data };
}

/**
 * Server action to generate CSV for report exports
 */
export async function exportReportCsvAction(
  propertyId: string,
  reportType: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  title: string
) {
  const auth = await checkReportAuth(propertyId, "REPORTS_EXPORT");
  if (auth.error) return { error: auth.error, csv: null };

  const csv = exportToCsv(headers, rows, {
    title,
    propertyName: `StayHub Property (${propertyId})`,
    generatedAt: new Date().toISOString(),
  });

  return { error: null, csv };
}
