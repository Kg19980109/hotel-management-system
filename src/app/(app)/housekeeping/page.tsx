"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  HousekeepingKPIGrid,
  HousekeepingBoard,
  NewTaskModal,
} from "@/components/housekeeping";
import {
  getHousekeepingKPIs,
  getHousekeepingTasks,
  getPropertyStaff,
} from "@/lib/housekeeping/queries";
import {
  HousekeepingKPIs,
  HousekeepingTask,
  StaffOption,
} from "@/lib/housekeeping/types";
import { getStaffGuestServiceRequests } from "@/lib/guest-services/queries";
import { StaffGuestServiceRequest } from "@/lib/guest-services/types";
import { GuestRequestsBoard } from "@/components/guest-requests/guest-requests-board";
import {
  ClipboardCheck,
  Plus,
  RotateCcw,
  Sparkles,
  BellRing,
} from "lucide-react";

interface FloorOption {
  id: string;
  floorNumber: number;
  name: string;
}

interface RoomOption {
  id: string;
  roomNumber: string;
  roomTypeName: string;
  status: string;
  housekeepingStatus: string;
}

export default function HousekeepingPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [stats, setStats] = React.useState<HousekeepingKPIs>({
    dirtyRooms: 0,
    cleaningInProgress: 0,
    inspectionPending: 0,
    readyClean: 0,
    priorityTasks: 0,
    outOfServiceOrOrder: 0,
    totalRooms: 0,
  });

  const [tasks, setTasks] = React.useState<HousekeepingTask[]>([]);
  const [guestRequests, setGuestRequests] = React.useState<StaffGuestServiceRequest[]>([]);
  const [activeTab, setActiveTab] = React.useState<"tasks" | "guest_requests">("tasks");
  const [floors, setFloors] = React.useState<FloorOption[]>([]);
  const [rooms, setRooms] = React.useState<RoomOption[]>([]);
  const [staffList, setStaffList] = React.useState<StaffOption[]>([]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "guest_requests" || params.get("tab") === "qr-requests") {
        setActiveTab("guest_requests");
      }
    }
  }, []);

  const mappedStaff = React.useMemo(() => {
    return staffList.map((s) => ({
      id: s.userId,
      full_name: s.fullName || s.email,
      email: s.email,
    }));
  }, [staffList]);

  const pendingGuestRequests = React.useMemo(() => {
    return guestRequests.filter(
      (r) =>
        r.status === "SUBMITTED" ||
        r.status === "ACKNOWLEDGED" ||
        r.status === "ASSIGNED" ||
        r.status === "IN_PROGRESS"
    ).length;
  }, [guestRequests]);

  const loadHousekeepingData = React.useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      // 1. Fetch KPIs, Tasks, Staff & QR Guest Service Requests
      const [kpiRes, taskRes, staffRes, allGuestReqs] = await Promise.all([
        getHousekeepingKPIs(supabase, propertyId),
        getHousekeepingTasks(supabase, propertyId, { pageSize: 100 }),
        getPropertyStaff(supabase, propertyId),
        getStaffGuestServiceRequests(propertyId),
      ]);

      const hkGuestReqs = (allGuestReqs || []).filter(
        (r) => r.category === "HOUSEKEEPING" || r.category === "LAUNDRY"
      );
      setGuestRequests(hkGuestReqs);

      // 2. Fetch Floors & Rooms for filters / creation
      const { data: floorsData } = await supabase
        .from("floors")
        .select("id, floor_number, name")
        .eq("property_id", propertyId)
        .order("floor_number", { ascending: true });

      const { data: roomsData } = await supabase
        .from("rooms")
        .select(`
          id,
          room_number,
          status,
          housekeeping_status,
          room_types:room_type_id (
            name
          )
        `)
        .eq("property_id", propertyId)
        .eq("is_active", true)
        .order("room_number", { ascending: true });

      setStats(kpiRes);
      setTasks(taskRes.tasks);
      setStaffList(staffRes);

      if (floorsData) {
        setFloors(
          floorsData.map((f) => ({
            id: f.id,
            floorNumber: f.floor_number,
            name: f.name || `Floor ${f.floor_number}`,
          }))
        );
      }

      if (roomsData) {
        setRooms(
          roomsData.map((r) => {
            const rt = r.room_types as unknown as { name?: string } | null;
            return {
              id: r.id,
              roomNumber: r.room_number,
              roomTypeName: rt?.name || "Room",
              status: r.status,
              housekeepingStatus: r.housekeeping_status,
            };
          })
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load housekeeping operations";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      if (propertyId) {
        void Promise.resolve().then(() => {
          if (!isMounted) return;
          loadHousekeepingData();
        });
      } else {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, propertyId, loadHousekeepingData]);

  // Real-time updates & background sync for housekeeping tasks
  React.useEffect(() => {
    if (!propertyId) return;

    const supabase = createClient();
    const channelName = `stayhub:housekeeping:${propertyId}:${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "housekeeping_tasks" },
        (payload) => {
          const rec = (payload.new || payload.old) as { property_id?: string };
          if (rec?.property_id && rec.property_id !== propertyId) return;
          void loadHousekeepingData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guest_service_requests" },
        (payload) => {
          const rec = (payload.new || payload.old) as { property_id?: string; category?: string };
          if (rec?.property_id && rec.property_id !== propertyId) return;
          void loadHousekeepingData();
        }
      )
      .subscribe();

    const poll = setInterval(() => {
      void loadHousekeepingData();
    }, 4000);

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [propertyId, loadHousekeepingData]);

  if (authLoading) {
    return <LoadingState message="Loading housekeeping operations console..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Housekeeping Operations"
        description="Real-time cleaning board, room readiness tracking, and cleaning assignments."
        breadcrumbs={[
          { label: "Operations", href: "/housekeeping" },
          { label: "Housekeeping" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/housekeeping/inspections">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                Inspection Queue
                {stats.inspectionPending > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold ml-1">
                    {stats.inspectionPending}
                  </span>
                )}
              </Button>
            </Link>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewTaskModalOpen(true)}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4" />
              New Cleaning Task
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadHousekeepingData}
              title="Refresh Housekeeping Console"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      {/* Live Guest QR Request Notification Bar */}
      {pendingGuestRequests > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <span>{pendingGuestRequests} Live Guest QR Request{pendingGuestRequests > 1 ? "s" : ""}</span>
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Action Required
                </span>
              </h4>
              <p className="text-xs text-muted-foreground">
                In-room guests have requested housekeeping services (Towels, Cleaning, Toiletries, Linens).
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab("guest_requests")}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
          >
            View Guest Requests ({pendingGuestRequests})
          </Button>
        </div>
      )}

      {/* KPI Grid */}
      <HousekeepingKPIGrid stats={stats} loading={loading && tasks.length === 0} />

      {/* Operational Navigation Tabs */}
      <div className="flex border-b border-[var(--border)] gap-6 text-sm">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === "tasks"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Room Cleaning Tasks ({tasks.length})
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
          Guest QR Requests ({guestRequests.length})
          {pendingGuestRequests > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
              {pendingGuestRequests}
            </span>
          )}
        </button>
      </div>

      {/* Main Board View */}
      {loading && tasks.length === 0 && guestRequests.length === 0 ? (
        <LoadingState message="Loading housekeeping operations..." />
      ) : error ? (
        <ErrorState
          title="Error Loading Housekeeping"
          description={error}
          onRetry={loadHousekeepingData}
        />
      ) : activeTab === "tasks" ? (
        <HousekeepingBoard
          tasks={tasks}
          floors={floors}
          rooms={rooms}
          staffList={staffList}
          propertyId={propertyId || ""}
        />
      ) : (
        <GuestRequestsBoard
          propertyId={propertyId || ""}
          requests={guestRequests}
          staffMembers={mappedStaff}
          onRefresh={loadHousekeepingData}
        />
      )}

      {/* New Task Modal */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        propertyId={propertyId || ""}
        rooms={rooms}
        staffList={staffList}
        onSuccess={loadHousekeepingData}
      />
    </div>
  );
}
