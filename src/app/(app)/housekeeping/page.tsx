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
import {
  ClipboardCheck,
  Plus,
  RotateCcw,
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
  const [floors, setFloors] = React.useState<FloorOption[]>([]);
  const [rooms, setRooms] = React.useState<RoomOption[]>([]);
  const [staffList, setStaffList] = React.useState<StaffOption[]>([]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = React.useState(false);

  const loadHousekeepingData = React.useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      // 1. Fetch KPIs & Tasks
      const [kpiRes, taskRes, staffRes] = await Promise.all([
        getHousekeepingKPIs(supabase, propertyId),
        getHousekeepingTasks(supabase, propertyId, { pageSize: 100 }),
        getPropertyStaff(supabase, propertyId),
      ]);

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

      {/* KPI Grid */}
      <HousekeepingKPIGrid stats={stats} loading={loading && tasks.length === 0} />

      {/* Main Board */}
      {loading && tasks.length === 0 ? (
        <LoadingState message="Loading housekeeping board..." />
      ) : error ? (
        <ErrorState
          title="Error Loading Housekeeping"
          description={error}
          onRetry={loadHousekeepingData}
        />
      ) : (
        <HousekeepingBoard
          tasks={tasks}
          floors={floors}
          rooms={rooms}
          staffList={staffList}
          propertyId={propertyId || ""}
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
