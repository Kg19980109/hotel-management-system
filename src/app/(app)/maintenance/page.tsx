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
import { cn } from "@/lib/utils";

export default function MaintenancePage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<MaintenanceKPIs | null>(null);
  const [workOrders, setWorkOrders] = React.useState<MaintenanceWorkOrder[]>([]);
  const [guestRequests, setGuestRequests] = React.useState<StaffGuestServiceRequest[]>([]);
  const [activeTab, setActiveTab] = React.useState<"orders" | "guest_requests">("guest_requests");
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
      if (document.visibilityState !== "visible") return;
      void loadData();
    }, 2000);

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
      {/* ── LUXURY HERO HEADER ── */}
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
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.08) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.25)",
                background: "rgba(214,168,90,0.08)",
              }}
            >
              <Wrench className="h-3 w-3" />
              <span>Facilities & Engineering Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              Maintenance & Work Orders
            </h1>
            <p className="text-sm text-slate-300/80 mt-1 max-w-xl">
              Track facilities repair tickets, equipment servicing, technician dispatches, and room readiness.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {stats && (
              <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-xs text-slate-300">
                <div className="text-center">
                  <span className="block font-bold text-white font-mono text-sm">{stats.open}</span>
                  <span className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Open</span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div className="text-center">
                  <span className="block font-bold text-white font-mono text-sm">{stats.inProgress}</span>
                  <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">Active</span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div className="text-center">
                  <span className="block font-bold text-white font-mono text-sm">{stats.urgent}</span>
                  <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">Urgent</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Link href="/maintenance/new">
                <Button
                  variant="primary"
                  size="sm"
                  className="gap-1.5 h-9 font-semibold shadow-md shadow-indigo-900/40"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Work Order</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                title="Refresh Console"
                className="bg-white/10 hover:bg-white/15 text-white border-white/15 h-9 w-9 p-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Guest QR Repair Ticket Notification Bar */}
      {pendingGuestRequests > 0 && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold shrink-0">
              <Wrench className="w-4.5 h-4.5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <span>{pendingGuestRequests} Live QR Repair Ticket{pendingGuestRequests > 1 ? "s" : ""}</span>
                <span className="text-[10px] bg-blue-600 text-white font-black px-2 py-0.5 rounded-full uppercase">
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
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 h-9 px-4 shadow-xs"
          >
            View Tickets ({pendingGuestRequests})
          </Button>
        </div>
      )}

      {/* Operational Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card border border-border/80 shadow-xs max-w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer",
            activeTab === "orders"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <ClipboardList className={cn("w-3.5 h-3.5", activeTab === "orders" ? "text-primary-foreground" : "text-indigo-400")} />
          <span>Work Orders</span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold",
              activeTab === "orders"
                ? "bg-white/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {workOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("guest_requests")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer",
            activeTab === "guest_requests"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <BellRing className={cn("w-3.5 h-3.5", activeTab === "guest_requests" ? "text-primary-foreground" : "text-amber-500")} />
          <span>Guest QR Tickets</span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold",
              activeTab === "guest_requests"
                ? "bg-white/20 text-primary-foreground"
                : pendingGuestRequests > 0
                ? "bg-rose-500 text-white animate-pulse"
                : "bg-muted text-muted-foreground"
            )}
          >
            {guestRequests.length}
          </span>
        </button>
      </div>

      {/* Master Operations Board */}
      {activeTab === "orders" ? (
        <div className="space-y-4">
          {/* Real-Time KPIs Grid */}
          {stats && <MaintenanceKPIGrid stats={stats} />}
          <MaintenanceBoard
            propertyId={activePropertyId}
            workOrders={workOrders}
            rooms={rooms}
            staff={staff}
            onRefresh={loadData}
          />
        </div>
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
