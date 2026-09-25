"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  getPropertyStaff,
  RoomOption,
  StaffOption,
} from "@/lib/maintenance/queries";
import { NewWorkOrderForm } from "./new-work-order-form";
import { ArrowLeft } from "lucide-react";

export default function NewMaintenanceWorkOrderPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rooms, setRooms] = React.useState<RoomOption[]>([]);
  const [staff, setStaff] = React.useState<StaffOption[]>([]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) return;
    try {
      setLoading(true);
      setError(null);

      const [staffData, roomsRes] = await Promise.all([
        getPropertyStaff(supabase, activePropertyId),
        supabase
          .from("rooms")
          .select("id, room_number, room_types(name)")
          .eq("property_id", activePropertyId)
          .eq("is_active", true)
          .order("room_number", { ascending: true }),
      ]);

      const formattedRooms: RoomOption[] = ((roomsRes.data || []) as unknown as Array<{
        id: string;
        room_number: string;
        room_types: { name: string } | null;
      }>).map((r) => ({
        id: r.id,
        room_number: r.room_number,
        room_type: r.room_types,
      }));

      setStaff(staffData);
      setRooms(formattedRooms);
    } catch (err: unknown) {
      console.error("Failed to load property data:", err);
      setError(err instanceof Error ? err.message : "Failed to load property data");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, supabase]);

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

  if (authLoading || (!activePropertyId && loading)) {
    return <LoadingState message="Loading form..." />;
  }

  if (!activePropertyId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Report Maintenance Work Order"
          description="Log a repair request, equipment failure, or facility servicing ticket."
          breadcrumbs={[
            { label: "Operations", href: "/maintenance" },
            { label: "Maintenance", href: "/maintenance" },
            { label: "New Work Order" },
          ]}
        />
        <div className="p-8 text-center text-[var(--foreground-muted)]">
          Please select an active property to create a maintenance work order.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Report Maintenance Work Order"
          description="Log a repair request, equipment failure, or facility servicing ticket."
          breadcrumbs={[
            { label: "Operations", href: "/maintenance" },
            { label: "Maintenance", href: "/maintenance" },
            { label: "New Work Order" },
          ]}
        />
        <ErrorState
          title="Error Loading Form"
          description={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
        <Link
          href="/maintenance"
          className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Maintenance Board
        </Link>
      </div>

      <PageHeader
        title="Report Maintenance Work Order"
        description="Log a repair request, equipment failure, or facility servicing ticket."
        breadcrumbs={[
          { label: "Operations", href: "/maintenance" },
          { label: "Maintenance", href: "/maintenance" },
          { label: "New Work Order" },
        ]}
      />

      <NewWorkOrderForm
        propertyId={activePropertyId}
        rooms={rooms}
        staff={staff}
      />
    </div>
  );
}
