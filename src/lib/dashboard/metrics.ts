/**
 * STAYHUB - Dashboard Metrics Engine & Server Action
 * Phase 5: Real Hotel Dashboard & Metrics Engine
 * 
 * Centralized, secure dashboard metrics engine.
 * Ensures strict multi-tenant authorization and error isolation.
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
 * Fetch complete dashboard data for a given property ID.
 * Strict Tenant Boundary:
 * 1. Checks current user session.
 * 2. Verifies user has active membership for the requested property_id.
 * 3. Fetches data with RLS enforcement.
 * 4. Isolates metric query failures using Promise.allSettled.
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

    // 2. Strict Tenant Authorization check: user must belong to this property
    const { data: membership, error: memberError } = await supabase
      .from("property_memberships")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .eq("status", "active")
      .maybeSingle();

    if (memberError || !membership) {
      return {
        success: false,
        error: "Access denied. You do not have an active membership for this property.",
      };
    }

    // 3. Query Property metadata
    const property = await queryPropertyDetails(supabase, propertyId);
    if (!property) {
      return { success: false, error: "Property not found or inaccessible." };
    }

    // 4. Concurrently and safely execute sub-queries using Promise.allSettled
    const [
      roomSummaryResult,
      arrivalsResult,
      departuresResult,
      inHouseResult,
      activityResult,
    ] = await Promise.allSettled([
      queryRoomInventorySummary(supabase, propertyId),
      queryTodayArrivals(supabase, propertyId, property.timezone),
      queryTodayDepartures(supabase, propertyId, property.timezone),
      queryInHouseGuestsCount(supabase, propertyId),
      queryRecentActivity(supabase, propertyId),
    ]);

    const roomSummary =
      roomSummaryResult.status === "fulfilled"
        ? roomSummaryResult.value
        : {
            total: 0,
            available: 0,
            occupied: 0,
            dirty: 0,
            maintenance: 0,
            outOfOrder: 0,
            isConfigured: false,
          };

    const arrivals = arrivalsResult.status === "fulfilled" ? arrivalsResult.value : [];
    const departures = departuresResult.status === "fulfilled" ? departuresResult.value : [];
    const inHouseGuests = inHouseResult.status === "fulfilled" ? inHouseResult.value : 0;
    const recentActivity = activityResult.status === "fulfilled" ? activityResult.value : [];

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
