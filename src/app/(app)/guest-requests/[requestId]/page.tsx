"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  getStaffGuestServiceRequestDetail,
  getStaffGuestServiceRequestEvents,
} from "@/lib/guest-services/queries";
import {
  StaffGuestServiceRequest,
  StaffGuestServiceRequestEvent,
} from "@/lib/guest-services/types";
import { StaffGuestRequestDetailView } from "@/components/guest-requests/guest-request-detail-view";
import { getPropertyStaff } from "@/lib/maintenance/queries";
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

export default function GuestRequestDetailPage() {
  return (
    <RoutePermissionGuard permission="guest_requests.view" moduleName="Guest Request Details">
      <GuestRequestDetailContent />
    </RoutePermissionGuard>
  );
}

function GuestRequestDetailContent() {
  const params = useParams();
  const requestId = params?.requestId as string;
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [request, setRequest] = React.useState<StaffGuestServiceRequest | null>(null);
  const [events, setEvents] = React.useState<StaffGuestServiceRequestEvent[]>([]);
  const [staff, setStaff] = React.useState<{
    id: string;
    full_name: string;
    email: string;
    department_code?: string;
    department_name?: string;
    designation?: string;
  }[]>([]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId || !requestId) return;
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const [reqData, evData, staffData] = await Promise.all([
        getStaffGuestServiceRequestDetail(activePropertyId, requestId),
        getStaffGuestServiceRequestEvents(activePropertyId, requestId),
        getPropertyStaff(supabase, activePropertyId),
      ]);

      if (!reqData) {
        setError("Request not found or access denied.");
        return;
      }

      setRequest(reqData);
      setEvents(evData);
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
      setError(err instanceof Error ? err.message : "Failed to load request details.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, requestId]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && activePropertyId && requestId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadData();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, requestId, loadData]);

  // Silent refresh (no spinner) for realtime updates — guest cancel, other staff actions
  const refreshQuiet = React.useCallback(async () => {
    if (!activePropertyId || !requestId) return;
    try {
      const supabase = createClient();
      const [reqData, evData] = await Promise.all([
        getStaffGuestServiceRequestDetail(activePropertyId, requestId),
        getStaffGuestServiceRequestEvents(activePropertyId, requestId),
      ]);
      if (reqData) setRequest(reqData);
      setEvents(evData);
    } catch (err) {
      console.error("Request detail background refresh failed:", err);
    }
  }, [activePropertyId, requestId]);

  // Live updates: request row + timeline events (was: no subscription at all)
  React.useEffect(() => {
    if (!activePropertyId || !requestId) return;
    const supabase = createClient();
    let requestChannel: ReturnType<typeof supabase.channel> | null = null;
    let eventsChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);

      requestChannel = supabase
        .channel(`stayhub:staff-request:${requestId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "guest_service_requests", filter: `id=eq.${requestId}` },
          () => void refreshQuiet()
        )
        .subscribe();

      eventsChannel = supabase
        .channel(`stayhub:staff-request-events:${requestId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "guest_service_request_events", filter: `request_id=eq.${requestId}` },
          () => void refreshQuiet()
        )
        .subscribe();
    });

    const poll = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshQuiet();
    }, 15000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshQuiet();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      cancelled = true;
      clearInterval(poll);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      if (requestChannel) void supabase.removeChannel(requestChannel);
      if (eventsChannel) void supabase.removeChannel(eventsChannel);
    };
  }, [activePropertyId, requestId, refreshQuiet]);

  if (authLoading || (loading && !request)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Guest Request Details"
          description="View and process guest request."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Guest Requests", href: "/guest-requests" },
            { label: "Request Details" },
          ]}
        />
        <LoadingState message="Loading request details..." />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Guest Request Details"
          description="View and process guest request."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Guest Requests", href: "/guest-requests" },
            { label: "Request Details" },
          ]}
        />
        <ErrorState description={error || "Request not found."} onRetry={() => void loadData()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StaffGuestRequestDetailView
        propertyId={activePropertyId || ""}
        request={request}
        events={events}
        staffMembers={staff}
      />
    </div>
  );
}
