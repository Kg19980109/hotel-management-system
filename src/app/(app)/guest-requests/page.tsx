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

export default function GuestRequestsPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [requests, setRequests] = React.useState<StaffGuestServiceRequest[]>([]);
  const [staff, setStaff] = React.useState<{ id: string; full_name: string; email: string }[]>([]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) return;
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
          full_name: s.fullName || s.email,
          email: s.email,
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
    if (!authLoading && activePropertyId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadData();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guest Service Requests"
        description="Manage and process live guest requests across housekeeping, maintenance, and concierge."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Guest Requests" }]}
      />

      <GuestRequestsBoard
        propertyId={activePropertyId || ""}
        requests={requests}
        staffMembers={staff}
        onRefresh={loadData}
      />
    </div>
  );
}
