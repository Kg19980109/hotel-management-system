/**
 * STAYHUB - Dashboard Metrics Engine & Server Action
 * High-Performance, Low-Latency Parallel Execution
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import {
  queryPropertyDetails,
  queryRoomInventorySummary,
  queryTodayArrivals,
  queryTodayDepartures,
  queryInHouseGuestsCount,
  queryOperationalAttention,
  queryRecentActivity,
  deriveDashboardMetrics,
} from "./queries";
import type { DashboardData } from "./types";

export interface DashboardResponse {
  success: boolean;
  data?: DashboardData;
  error?: string;
}

/**
 * Fetch complete dashboard data for a given property ID with maximum parallel concurrency.
 */
export async function getDashboardData(propertyId: string): Promise<DashboardResponse> {
  try {
    if (!propertyId) {
      return { success: false, error: "Property ID is required." };
    }

    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to access hotel dashboard." };
    }

    // 2. Concurrently execute authorization, property details, and all dashboard layers in ONE single Promise.all batch!
    const [
      membershipRes,
      propertyRes,
      roomSummaryRes,
      arrivalsRes,
      departuresRes,
      inHouseRes,
      activityRes,
    ] = await Promise.allSettled([
      supabase
        .from("property_memberships")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("property_id", propertyId)
        .eq("status", "active")
        .maybeSingle(),
      queryPropertyDetails(supabase, propertyId),
      queryRoomInventorySummary(supabase, propertyId),
      queryTodayArrivals(supabase, propertyId, "Asia/Kolkata"),
      queryTodayDepartures(supabase, propertyId, "Asia/Kolkata"),
      queryInHouseGuestsCount(supabase, propertyId),
      queryRecentActivity(supabase, propertyId),
    ]);

    // Check membership authorization result
    if (membershipRes.status !== "fulfilled" || membershipRes.value.error || !membershipRes.value.data) {
      return {
        success: false,
        error: "Access denied. You do not have an active membership for this property.",
      };
    }

    const property = propertyRes.status === "fulfilled" && propertyRes.value ? propertyRes.value : {
      id: propertyId,
      name: "StayHub Property",
      slug: "stayhub",
      city: "",
      state: "",
      country: "",
      currency: "INR",
      timezone: "Asia/Kolkata",
    };

    const roomSummary =
      roomSummaryRes.status === "fulfilled"
        ? roomSummaryRes.value
        : {
            total: 0,
            available: 0,
            occupied: 0,
            dirty: 0,
            maintenance: 0,
            outOfOrder: 0,
            isConfigured: false,
          };

    const arrivals = arrivalsRes.status === "fulfilled" ? arrivalsRes.value : [];
    const departures = departuresRes.status === "fulfilled" ? departuresRes.value : [];
    const inHouseGuests = inHouseRes.status === "fulfilled" ? inHouseRes.value : 0;
    const recentActivity = activityRes.status === "fulfilled" ? activityRes.value : [];

    // Derive operational attention items
    const attentionItems = await queryOperationalAttention(supabase, propertyId, roomSummary);

    // Derive KPI metrics
    const metrics = deriveDashboardMetrics(
      roomSummary,
      arrivals,
      departures,
      property.currency,
      inHouseGuests
    );

    const dashboardData: DashboardData = {
      property,
      metrics,
      roomStatus: roomSummary,
      arrivals,
      departures,
      attentionItems,
      recentActivity,
      lastUpdated: new Date().toISOString(),
    };

    return {
      success: true,
      data: dashboardData,
    };
  } catch (err) {
    console.error("Dashboard metrics engine exception:", err);
    return {
      success: false,
      error: "Unable to load hotel dashboard metrics. Please try again.",
    };
  }
}
