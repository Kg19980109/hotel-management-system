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
      {/* ── LUXURY DOSSIER HERO ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/maintenance"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Maintenance Board</span>
            </Link>

            <span className="font-mono text-xs text-slate-400">
              ID: {workOrder.id}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-2"
                style={{
                  color: "var(--brand-gold)",
                  borderColor: "rgba(214,168,90,0.25)",
                  background: "rgba(214,168,90,0.08)",
                }}
              >
                <span>WO-{workOrder.id.slice(0, 8).toUpperCase()}</span>
                {workOrder.room && <span>• Room {workOrder.room.room_number}</span>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
                {workOrder.title}
              </h1>
              <p className="text-xs text-slate-300/80 mt-1 font-mono">
                Reported {new Date(workOrder.reported_at).toLocaleString()}
                {workOrder.reporter && ` by ${workOrder.reporter.full_name}`}
              </p>
            </div>
          </div>
        </div>
      </div>

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
