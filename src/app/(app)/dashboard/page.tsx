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
} from "@/components/dashboard";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { Hotel } from "lucide-react";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { currentProperty, loading: authLoading } = useAuth();

  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activePropertyId = currentProperty?.property_id;

  const loadData = React.useCallback(
    async (isManualRefresh = false) => {
      if (!activePropertyId) {
        setDashboardData(null);
        setDataLoading(false);
        return;
      }

      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setDataLoading(true);
      }
      setError(null);

      try {
        const response = await getDashboardData(activePropertyId);
        if (response.success && response.data) {
          setDashboardData(response.data);
        } else {
          setError(response.error || "Failed to load dashboard data.");
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("An unexpected network error occurred while updating the dashboard.");
      } finally {
        setDataLoading(false);
        setRefreshing(false);
      }
    },
    [activePropertyId]
  );

  // Property Switch / Initial Load Effect
  React.useEffect(() => {
    let isMounted = true;

    if (!authLoading) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        if (activePropertyId) {
          loadData();
        } else {
          setDataLoading(false);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

  // 1. Initial Auth or Data Loading State
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
            <div className="stayhub-card p-5 h-64 animate-pulse bg-slate-100" />
            <div className="stayhub-card p-5 h-64 animate-pulse bg-slate-100" />
          </div>
          <div className="space-y-6">
            <div className="stayhub-card p-5 h-48 animate-pulse bg-slate-100" />
            <div className="stayhub-card p-5 h-48 animate-pulse bg-slate-100" />
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
          className="stayhub-card p-10 max-w-lg mx-auto"
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
          className="stayhub-card p-10 max-w-lg mx-auto"
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
    <div className="space-y-6">
      {/* 1. Header with Property Context, Timezone Date & Quick Actions */}
      <DashboardHeader
        property={propertyInfo}
        onRefresh={() => loadData(true)}
        isRefreshing={refreshing}
      />

      {/* 2. 6 Primary KPI Cards */}
      <DashboardKpiGrid metrics={metrics} loading={dataLoading && !dashboardData} />

      {/* 3. Main Operational Layout (2 cols left, 1 col right on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2): Live Arrivals/Departures + Revenue & Occupancy Analytics */}
        <div className="lg:col-span-2 space-y-6">
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
        <div className="space-y-6">
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
