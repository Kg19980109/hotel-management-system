"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  getMaintenanceKPIs,
  getMaintenanceWorkOrders,
  getPropertyStaff,
  RoomOption,
  StaffOption,
} from "@/lib/maintenance/queries";
import { MaintenanceKPIGrid, MaintenanceBoard, NewWorkOrderModal } from "@/components/maintenance";
import { MaintenanceKPIs, MaintenanceWorkOrder } from "@/lib/maintenance/types";
import { Plus, RotateCcw } from "lucide-react";

export default function MaintenancePage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<MaintenanceKPIs | null>(null);
  const [workOrders, setWorkOrders] = React.useState<MaintenanceWorkOrder[]>([]);
  const [rooms, setRooms] = React.useState<RoomOption[]>([]);
  const [staff, setStaff] = React.useState<StaffOption[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [kpiData, ordersData, staffData, roomsRes] = await Promise.all([
        getMaintenanceKPIs(supabase, activePropertyId),
        getMaintenanceWorkOrders(supabase, activePropertyId),
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

      setStats(kpiData);
      setWorkOrders(ordersData);
      setStaff(staffData);
      setRooms(formattedRooms);
    } catch (err: unknown) {
      console.error("Failed to load maintenance data:", err);
      setError(err instanceof Error ? err.message : "Failed to load maintenance records");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, supabase]);

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

  if (authLoading || (loading && !stats)) {
    return <LoadingState message="Loading maintenance dashboard..." />;
  }

  if (!activePropertyId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Maintenance Operations & Work Orders"
          description="Track facilities repair tickets, equipment servicing, technician dispatches, and room readiness."
          breadcrumbs={[
            { label: "Operations", href: "/maintenance" },
            { label: "Maintenance" },
          ]}
        />
        <div className="p-8 text-center text-[var(--foreground-muted)]">
          Please select a property to manage maintenance operations.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Maintenance Operations & Work Orders"
          description="Track facilities repair tickets, equipment servicing, technician dispatches, and room readiness."
          breadcrumbs={[
            { label: "Operations", href: "/maintenance" },
            { label: "Maintenance" },
          ]}
        />
        <ErrorState
          title="Error Loading Maintenance"
          description={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Operations & Work Orders"
        description="Track facilities repair tickets, equipment servicing, technician dispatches, and room readiness."
        breadcrumbs={[
          { label: "Operations", href: "/maintenance" },
          { label: "Maintenance" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            <Link href="/maintenance/new">
              <Button
                variant="primary"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Work Order
              </Button>
            </Link>
          </div>
        }
      />

      {/* Real-Time KPIs Grid */}
      {stats && <MaintenanceKPIGrid stats={stats} />}

      {/* Master Operations Board */}
      <MaintenanceBoard
        propertyId={activePropertyId}
        workOrders={workOrders}
        rooms={rooms}
        staff={staff}
        onRefresh={loadData}
      />

      {/* New Work Order Modal */}
      <NewWorkOrderModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        propertyId={activePropertyId}
        rooms={rooms}
        staff={staff}
        onSuccess={loadData}
      />
    </div>
  );
}
