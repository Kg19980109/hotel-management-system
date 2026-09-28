"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { getDashboardData } from "@/lib/dashboard/metrics";
import type { DashboardData } from "@/lib/dashboard/types";
import {
  DashboardHeader,
  DashboardKpiGrid,
  RoomStatusOverview,
  TodayArrivalsDepartures,
  OperationalAttention,
  RecentActivity,
  RevenueOccupancyOverview,
  AIBuddyPreview,
  DashboardGuestRequests,
} from "@/components/dashboard";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { Hotel } from "lucide-react";
import { useRouter } from "next/navigation";

// In-memory instant client cache for 0ms navigation transition
const dashboardCache = new Map<string, DashboardData>();

export default function DashboardPage() {
  const router = useRouter();
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;

  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(() => {
    if (activePropertyId && dashboardCache.has(activePropertyId)) {
      return dashboardCache.get(activePropertyId)!;
    }
    return null;
  });

  const [dataLoading, setDataLoading] = React.useState(() => {
    return !(activePropertyId && dashboardCache.has(activePropertyId));
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(
    async (isManualRefresh = false) => {
      if (!activePropertyId) {
        setDashboardData(null);
        setDataLoading(false);
        return;
      }

      if (isManualRefresh) {
        setRefreshing(true);
      } else if (!dashboardCache.has(activePropertyId)) {
        setDataLoading(true);
      }
      setError(null);

      try {
        const response = await getDashboardData(activePropertyId);
        if (response.success && response.data) {
          setDashboardData(response.data);
          dashboardCache.set(activePropertyId, response.data);
        } else if (!dashboardData) {
          setError(response.error || "Failed to load dashboard data.");
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        if (!dashboardData) {
          setError("An unexpected network error occurred while updating the dashboard.");
        }
      } finally {
        setDataLoading(false);
        setRefreshing(false);
      }
    },
    [activePropertyId, dashboardData]
  );

  // Property Switch / Initial Load Effect
  React.useEffect(() => {
    let isMounted = true;

    if (!authLoading && activePropertyId) {
      // Check cache first for instant render
      if (dashboardCache.has(activePropertyId)) {
        setDashboardData(dashboardCache.get(activePropertyId)!);
        setDataLoading(false);
      }
      void loadData();
    } else if (!authLoading && !activePropertyId) {
      setDataLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

  // Fast 2s visible-only background refresh
  React.useEffect(() => {
    if (!activePropertyId) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadData(false);
    }, 2000);
    return () => clearInterval(timer);
  }, [activePropertyId, loadData]);

  // 1. Initial Auth or Data Loading State (only if no cached data exists)
  if (authLoading || (dataLoading && !dashboardData)) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          property={
            currentProperty
              ? {
                  id: currentProperty.property_id,
                  name: currentProperty.property_name,
                  slug: currentProperty.property_slug,
                  city: currentProperty.city,
                  state: currentProperty.state,
                  country: currentProperty.country,
                  currency: currentProperty.currency,
                  timezone: currentProperty.timezone || "Asia/Kolkata",
                }
              : null
          }
        />
        <DashboardKpiGrid metrics={null} loading={true} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl p-6 h-64 animate-pulse bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-xs" />
            <div className="rounded-2xl p-6 h-64 animate-pulse bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-xs" />
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl p-6 h-48 animate-pulse bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-xs" />
            <div className="rounded-2xl p-6 h-48 animate-pulse bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-xs" />
          </div>
        </div>
      </div>
    );
  }

  // 2. No Active Property Assigned State
  if (!currentProperty) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<Hotel className="h-12 w-12 text-[var(--primary)]" />}
          title="No Active Property Found"
          description="You are not currently assigned to any active hotel property. Please complete hotel onboarding or request an invitation from your organization administrator."
          action={{
            label: "Create Hotel Property",
            onClick: () => {
              router.push("/onboarding");
            },
          }}
          className="rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border p-10 max-w-lg mx-auto shadow-xs"
        />
      </div>
    );
  }

  // 3. Error State
  if (error && !dashboardData) {
    return (
      <div className="py-12">
        <ErrorState
          title="Dashboard Unavailable"
          description={error}
          onRetry={() => loadData(true)}
          className="rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border p-10 max-w-lg mx-auto shadow-xs"
        />
      </div>
    );
  }

  const propertyInfo = dashboardData?.property || {
    id: currentProperty.property_id,
    name: currentProperty.property_name,
    slug: currentProperty.property_slug,
    city: currentProperty.city,
    state: currentProperty.state,
    country: currentProperty.country,
    currency: currentProperty.currency,
    timezone: currentProperty.timezone || "Asia/Kolkata",
  };

  const metrics = dashboardData?.metrics || null;
  const roomStatus = dashboardData?.roomStatus || null;
  const arrivals = dashboardData?.arrivals || [];
  const departures = dashboardData?.departures || [];
  const attentionItems = dashboardData?.attentionItems || [];
  const recentActivity = dashboardData?.recentActivity || [];

  return (
    <div className="space-y-4 relative -mt-3 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3">
      {/* Hero Ambient Background — Soft warm luxury glow */}
      <div
        className="absolute top-0 left-0 w-full h-[260px] z-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top left, rgba(81, 70, 229, 0.08) 0%, rgba(214, 168, 90, 0.04) 40%, transparent 75%)",
        }}
      />

      <div className="relative z-10 space-y-3.5">
        {/* 1. Header with Property Context, Timezone Date & Quick Actions */}
        <DashboardHeader
          property={propertyInfo}
          onRefresh={() => loadData(true)}
          isRefreshing={refreshing}
        />

        {/* 2. 6 Primary KPI Cards */}
        <DashboardKpiGrid metrics={metrics} loading={dataLoading && !dashboardData} />
      </div>

      {/* 3. Main Operational Layout (2 cols left, 1 col right on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
        {/* Left Column (Span 2): Live In-Room Guest QR Requests + Arrivals/Departures + Revenue & Occupancy */}
        <div className="lg:col-span-2 space-y-4">
          <DashboardGuestRequests propertyId={currentProperty.property_id} />

          <TodayArrivalsDepartures
            arrivals={arrivals}
            departures={departures}
            loading={dataLoading && !dashboardData}
          />

          <RevenueOccupancyOverview
            metrics={metrics}
            currency={propertyInfo.currency}
            loading={dataLoading && !dashboardData}
          />
        </div>

        {/* Right Column: Physical Room Inventory Status, Operational Attention, Recent Activity & AI Preview */}
        <div className="space-y-4">
          <RoomStatusOverview
            summary={roomStatus}
            loading={dataLoading && !dashboardData}
          />

          <OperationalAttention
            items={attentionItems}
            loading={dataLoading && !dashboardData}
          />

          <RecentActivity
            activities={recentActivity}
            loading={dataLoading && !dashboardData}
          />

          <AIBuddyPreview />
        </div>
      </div>
    </div>
  );
}
