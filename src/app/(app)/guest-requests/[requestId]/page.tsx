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

export default function GuestRequestDetailPage() {
  const params = useParams();
  const requestId = params?.requestId as string;
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [request, setRequest] = React.useState<StaffGuestServiceRequest | null>(null);
  const [events, setEvents] = React.useState<StaffGuestServiceRequestEvent[]>([]);
  const [staff, setStaff] = React.useState<{ id: string; full_name: string; email: string }[]>([]);

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
          full_name: s.fullName || s.email,
          email: s.email,
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
