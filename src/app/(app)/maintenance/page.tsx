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
import { getStaffGuestServiceRequests } from "@/lib/guest-services/queries";
import { StaffGuestServiceRequest } from "@/lib/guest-services/types";
import { GuestRequestsBoard } from "@/components/guest-requests/guest-requests-board";
import { Plus, RotateCcw, Wrench, BellRing, ClipboardList } from "lucide-react";

export default function MaintenancePage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<MaintenanceKPIs | null>(null);
  const [workOrders, setWorkOrders] = React.useState<MaintenanceWorkOrder[]>([]);
  const [guestRequests, setGuestRequests] = React.useState<StaffGuestServiceRequest[]>([]);
  const [activeTab, setActiveTab] = React.useState<"orders" | "guest_requests">("orders");
  const [rooms, setRooms] = React.useState<RoomOption[]>([]);
  const [staff, setStaff] = React.useState<StaffOption[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "guest_requests" || params.get("tab") === "qr-requests") {
        setActiveTab("guest_requests");
      }
    }
  }, []);

  const mappedStaff = React.useMemo(() => {
    return staff.map((s) => ({
      id: s.id,
      full_name: s.fullName || s.email,
      email: s.email,
    }));
  }, [staff]);

  const pendingGuestRequests = React.useMemo(() => {
    return guestRequests.filter(
      (r) =>
        r.status === "SUBMITTED" ||
        r.status === "ACKNOWLEDGED" ||
        r.status === "ASSIGNED" ||
        r.status === "IN_PROGRESS"
    ).length;
  }, [guestRequests]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [kpiData, ordersData, staffData, roomsRes, guestReqs] = await Promise.all([
        getMaintenanceKPIs(supabase, activePropertyId),
        getMaintenanceWorkOrders(supabase, activePropertyId),
        getPropertyStaff(supabase, activePropertyId),
        supabase
          .from("rooms")
          .select("id, room_number, room_types(name)")
          .eq("property_id", activePropertyId)
          .eq("is_active", true)
          .order("room_number", { ascending: true }),
        getStaffGuestServiceRequests(activePropertyId, { category: "MAINTENANCE" }),
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
      setGuestRequests(guestReqs || []);
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

  // Real-time updates & background sync for maintenance work orders
  React.useEffect(() => {
    if (!activePropertyId) return;

    const supabase = createClient();
    const channelName = `stayhub:maintenance:${activePropertyId}:${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maintenance_work_orders" },
        (payload) => {
          const rec = (payload.new || payload.old) as { property_id?: string };
          if (rec?.property_id && rec.property_id !== activePropertyId) return;
          void loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guest_service_requests" },
        (payload) => {
          const rec = (payload.new || payload.old) as { property_id?: string; category?: string };
          if (rec?.property_id && rec.property_id !== activePropertyId) return;
          if (rec?.category && rec.category !== "MAINTENANCE" && rec.category !== "TECHNICAL") return;
          void loadData();
        }
      )
      .subscribe();

    const poll = setInterval(() => {
      void loadData();
    }, 4000);

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [activePropertyId, loadData]);

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

      {/* Live Guest QR Repair Ticket Notification Bar */}
      {pendingGuestRequests > 0 && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <span>{pendingGuestRequests} Guest QR Repair Ticket{pendingGuestRequests > 1 ? "s" : ""}</span>
                <span className="text-[10px] bg-blue-500 text-white font-black px-2 py-0.5 rounded-full uppercase">
                  Action Required
                </span>
              </h4>
              <p className="text-xs text-muted-foreground">
                In-room guests reported maintenance and engineering issues (AC, Plumbing, Electrical, Appliances).
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab("guest_requests")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            View QR Repair Tickets ({pendingGuestRequests})
          </Button>
        </div>
      )}

      {/* Real-Time KPIs Grid */}
      {stats && <MaintenanceKPIGrid stats={stats} />}

      {/* Operational Navigation Tabs */}
      <div className="flex border-b border-[var(--border)] gap-6 text-sm">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === "orders"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Facilities Work Orders ({workOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("guest_requests")}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === "guest_requests"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BellRing className="w-4 h-4" />
          Guest QR Repair Tickets ({guestRequests.length})
          {pendingGuestRequests > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white animate-pulse">
              {pendingGuestRequests}
            </span>
          )}
        </button>
      </div>

      {/* Master Operations Board */}
      {activeTab === "orders" ? (
        <MaintenanceBoard
          propertyId={activePropertyId}
          workOrders={workOrders}
          rooms={rooms}
          staff={staff}
          onRefresh={loadData}
        />
      ) : (
        <GuestRequestsBoard
          propertyId={activePropertyId || ""}
          requests={guestRequests}
          staffMembers={mappedStaff}
          onRefresh={loadData}
        />
      )}

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
