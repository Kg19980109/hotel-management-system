"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  getMaintenanceWorkOrderById,
  getPropertyStaff,
  StaffOption,
} from "@/lib/maintenance/queries";
import { MaintenanceWorkOrder } from "@/lib/maintenance/types";
import { WorkOrderDetailClient } from "./work-order-detail-client";
import { ArrowLeft } from "lucide-react";

export default function WorkOrderDetailPage() {
  const params = useParams();
  const workOrderId = params?.workOrderId as string;
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [workOrder, setWorkOrder] = React.useState<MaintenanceWorkOrder | null>(null);
  const [staff, setStaff] = React.useState<StaffOption[]>([]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId || !workOrderId) return;
    try {
      setLoading(true);
      setError(null);

      const [orderData, staffData] = await Promise.all([
        getMaintenanceWorkOrderById(supabase, activePropertyId, workOrderId),
        getPropertyStaff(supabase, activePropertyId),
      ]);

      if (!orderData) {
        setError("Work order not found or you do not have permission to view it.");
        return;
      }

      setWorkOrder(orderData);
      setStaff(staffData);
    } catch (err: unknown) {
      console.error("Failed to load work order:", err);
      setError(err instanceof Error ? err.message : "Failed to load work order");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, workOrderId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && activePropertyId && workOrderId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadData();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, workOrderId, loadData]);

  if (authLoading || (!activePropertyId && loading)) {
    return <LoadingState message="Loading work order details..." />;
  }

  if (!activePropertyId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Maintenance Work Order"
          description="View and update maintenance repair records."
          breadcrumbs={[
            { label: "Operations", href: "/maintenance" },
            { label: "Maintenance", href: "/maintenance" },
          ]}
        />
        <div className="p-8 text-center text-[var(--foreground-muted)]">
          Please select a property to view maintenance records.
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingState message="Loading work order details..." />;
  }

  if (error || !workOrder) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Maintenance Work Order"
          description="View and update maintenance repair records."
          breadcrumbs={[
            { label: "Operations", href: "/maintenance" },
            { label: "Maintenance", href: "/maintenance" },
          ]}
        />
        <ErrorState
          title="Work Order Not Found"
          description={error || "The requested work order could not be located."}
          onRetry={loadData}
        />
      </div>
    );
  }

  const now = new Date();
  const isUnresolved = !["RESOLVED", "CLOSED", "CANCELLED"].includes(workOrder.status);
  const isOverdue = !!(isUnresolved && workOrder.scheduled_for && new Date(workOrder.scheduled_for) < now);

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
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
        title={workOrder.title}
        description={`Work Order ID: ${workOrder.id.slice(0, 8)} • Reported on ${new Date(
          workOrder.reported_at
        ).toLocaleString()}`}
        breadcrumbs={[
          { label: "Operations", href: "/maintenance" },
          { label: "Maintenance", href: "/maintenance" },
          { label: `WO-${workOrder.id.slice(0, 6)}` },
        ]}
      />

      {/* Client Interactive Actions & Console */}
      <WorkOrderDetailClient
        propertyId={activePropertyId}
        workOrder={workOrder}
        staff={staff}
        isOverdue={isOverdue}
      />
    </div>
  );
}
