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
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = React.useState<"tasks" | "guest_requests">("guest_requests");
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
      if (document.visibilityState !== "visible") return;
      void loadHousekeepingData();
    }, 10000);

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
      {/* ── LUXURY HERO HEADER ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Ambient radial lighting */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
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
              <Sparkles className="h-3 w-3" />
              <span>Housekeeping Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              Housekeeping & Room Readiness
            </h1>
            <p className="text-sm text-slate-300/80 mt-1 max-w-xl">
              Real-time cleaning board, priority turn-down schedules, inspection queue, and room turnover control.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-xs text-slate-300">
              <div className="text-center">
                <span className="block font-bold text-white font-mono text-sm">{stats.dirtyRooms}</span>
                <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">Dirty</span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="text-center">
                <span className="block font-bold text-white font-mono text-sm">{stats.cleaningInProgress}</span>
                <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">Cleaning</span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="text-center">
                <span className="block font-bold text-white font-mono text-sm">{stats.readyClean}</span>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Ready</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/housekeeping/inspections">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 bg-white/10 hover:bg-white/15 text-white border-white/15 h-9"
                >
                  <ClipboardCheck className="h-4 w-4 text-emerald-400" />
                  <span>Inspections</span>
                  {stats.inspectionPending > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black ml-1">
                      {stats.inspectionPending}
                    </span>
                  )}
                </Button>
              </Link>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewTaskModalOpen(true)}
                className="gap-1.5 h-9 font-semibold shadow-md shadow-indigo-900/40"
              >
                <Plus className="h-4 w-4" />
                <span>New Cleaning Task</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={loadHousekeepingData}
                title="Refresh Housekeeping Console"
                className="bg-white/10 hover:bg-white/15 text-white border-white/15 h-9 w-9 p-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Guest QR Request Notification Bar */}
      {pendingGuestRequests > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shadow-amber-500/5 backdrop-blur-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                <span>{pendingGuestRequests} Live Guest QR Request{pendingGuestRequests > 1 ? "s" : ""}</span>
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Action Required
                </span>
              </h4>
              <p className="text-xs text-[var(--foreground-muted)]">
                In-room guests have requested housekeeping services (Towels, Cleaning, Toiletries, Linens).
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab("guest_requests")}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 h-9"
          >
            View Guest Requests ({pendingGuestRequests})
          </Button>
        </div>
      )}

      {/* KPI Grid */}
      <HousekeepingKPIGrid stats={stats} loading={loading && tasks.length === 0} />

      {/* Operational Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs max-w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("guest_requests")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2",
            activeTab === "guest_requests"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <BellRing className="w-4 h-4 text-amber-400" />
          <span>Guest QR Requests</span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold",
              activeTab === "guest_requests"
                ? "bg-white/20 text-white"
                : pendingGuestRequests > 0
                ? "bg-rose-500 text-white animate-pulse"
                : "bg-slate-100 text-slate-700"
            )}
          >
            {guestRequests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2",
            activeTab === "tasks"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Cleaning Tasks</span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold",
              activeTab === "tasks"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-700"
            )}
          >
            {tasks.length}
          </span>
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
