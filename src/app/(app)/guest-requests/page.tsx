"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { getStaffGuestServiceRequests } from "@/lib/guest-services/queries";
import { StaffGuestServiceRequest } from "@/lib/guest-services/types";
import { GuestRequestsBoard } from "@/components/guest-requests/guest-requests-board";
import { getPropertyStaff } from "@/lib/maintenance/queries";
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

export default function GuestRequestsPage() {
  return (
    <RoutePermissionGuard permission="guest_requests.view" moduleName="Guest Service Requests">
      <GuestRequestsContent />
    </RoutePermissionGuard>
  );
}

function GuestRequestsContent() {
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [requests, setRequests] = React.useState<StaffGuestServiceRequest[]>([]);
  const [staff, setStaff] = React.useState<{
    id: string;
    full_name: string;
    email: string;
    department_code?: string;
    department_name?: string;
    designation?: string;
  }[]>([]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const [reqData, staffData] = await Promise.all([
        getStaffGuestServiceRequests(activePropertyId),
        getPropertyStaff(supabase, activePropertyId),
      ]);

      setRequests(reqData);
      setStaff(
        staffData.map((s) => ({
          id: s.id,
          full_name: s.fullName,
          email: s.email,
          department_code: s.departmentCode,
          department_name: s.departmentName,
          designation: s.designation,
        }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load guest requests.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      if (activePropertyId) {
        void Promise.resolve().then(() => {
          if (!isMounted) return;
          loadData();
        });
      } else {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

  // Silent background refresh (no loading spinner → no board flicker).
  // Used by realtime events + backup polling so admin always sees live data.
  const refreshQuiet = React.useCallback(async () => {
    if (!activePropertyId) return;
    try {
      const [reqData] = await Promise.all([
        getStaffGuestServiceRequests(activePropertyId),
      ]);
      setRequests(reqData);
    } catch (err) {
      console.error("Guest requests background refresh failed:", err);
    }
  }, [activePropertyId]);

  // Real-time subscription to auto-update board on any request change.
  // Authenticated realtime + server-side property filter (was unfiltered +
  // 3s full-spinner poll that flickered the board and hammered the DB).
  React.useEffect(() => {
    if (!activePropertyId) return;

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // Authenticate the realtime socket so RLS passes for staff
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel(`stayhub:guest-requests-board:${activePropertyId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "guest_service_requests",
            filter: `property_id=eq.${activePropertyId}`,
          },
          () => {
            void refreshQuiet();
          }
        )
        .subscribe();
    });

    // 2s visible-only fast sync poll
    const pollInterval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshQuiet();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [activePropertyId, refreshQuiet]);

  if (authLoading || (loading && !requests.length)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Guest Service Requests"
          description="Manage and process live guest requests across housekeeping, maintenance, and concierge."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Guest Requests" }]}
        />
        <LoadingState message="Loading guest requests..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Guest Service Requests"
          description="Manage and process live guest requests across housekeeping, maintenance, and concierge."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Guest Requests" }]}
        />
        <ErrorState description={error} onRetry={() => void loadData()} />
      </div>
    );
  }

  const submittedCount = requests.filter((r) => r.status === "SUBMITTED").length;
  const activeCount = requests.filter((r) => r.status === "IN_PROGRESS" || r.status === "ASSIGNED" || r.status === "ACKNOWLEDGED").length;

  return (
    <div className="space-y-4">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/60">
        <PageHeader
          title="Guest Service Requests"
          description="Real-time operational dispatch center for in-stay QR orders, housekeeping, repairs, and concierge services."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Guest Requests" },
          ]}
          className="mb-0"
        />

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/80 shadow-2xs text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-foreground text-[11.5px]">Live Dispatch</span>
            <span className="text-muted-foreground/60 text-[11px] font-mono">
              ({requests.length} total)
            </span>
          </div>
        </div>
      </div>

      <GuestRequestsBoard
        propertyId={activePropertyId || ""}
        requests={requests}
        staffMembers={staff}
        onRefresh={loadData}
      />
    </div>
  );
}

