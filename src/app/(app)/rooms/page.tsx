"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import {
  fetchRooms,
  fetchRoomStats,
  fetchFloors,
  fetchRoomTypes,
} from "@/lib/rooms/queries";
import { deactivateRoomAction } from "@/lib/rooms/actions";
import type {
  Room,
  RoomStats,
  Floor,
  RoomType,
  RoomFilterOptions,
} from "@/lib/rooms/types";
import {
  RoomKpiGrid,
  RoomFilters,
  RoomTable,
  RoomCardGrid,
  RoomStatusModal,
} from "@/components/rooms";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import {
  Plus,
  BedDouble,
  Layers,
  LayoutGrid,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
} from "lucide-react";

export default function RoomsPage() {
  const router = useRouter();
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [stats, setStats] = React.useState<RoomStats | null>(null);
  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = React.useState<RoomType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [filters, setFilters] = React.useState<RoomFilterOptions>({
    status: "ALL",
    housekeepingStatus: "ALL",
    floorId: "ALL",
    roomTypeId: "ALL",
    isActive: "ALL",
    search: "",
    page: 1,
    pageSize: 24,
  });
  const [selectedRoomForStatus, setSelectedRoomForStatus] = React.useState<Room | null>(null);
  const [roomToDeactivate, setRoomToDeactivate] = React.useState<Room | null>(null);
  const [isDeactivating, setIsDeactivating] = React.useState(false);

  const activePropertyId = currentProperty?.property_id;
  const currency = currentProperty?.currency || "INR";

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [roomsResult, statsResult, floorsResult, typesResult] = await Promise.all([
        fetchRooms(supabase, activePropertyId, filters),
        fetchRoomStats(supabase, activePropertyId),
        fetchFloors(supabase, activePropertyId),
        fetchRoomTypes(supabase, activePropertyId),
      ]);
      setRooms(roomsResult.rooms);
      setTotalCount(roomsResult.totalCount);
      setStats(statsResult);
      setFloors(floorsResult);
      setRoomTypes(typesResult);
    } catch (err) {
      setError("Failed to load room inventory data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, filters, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        if (activePropertyId) loadData();
        else setLoading(false);
      });
    }
    return () => { isMounted = false; };
  }, [authLoading, activePropertyId, loadData]);

  const handleConfirmDeactivate = async () => {
    if (!roomToDeactivate || !activePropertyId) return;
    setIsDeactivating(true);
    try {
      const res = await deactivateRoomAction(activePropertyId, roomToDeactivate.id, roomToDeactivate.is_active);
      if (res.success) { setRoomToDeactivate(null); loadData(); }
      else alert(res.error || "Failed to update room activation state.");
    } catch (err) {
      console.error("Deactivate error:", err);
    } finally {
      setIsDeactivating(false);
    }
  };

  const totalPages = Math.ceil(totalCount / (filters.pageSize || 24)) || 1;
  const currentPage = filters.page || 1;

  if (authLoading) return <LoadingState message="Loading room management..." size="lg" />;

  if (!currentProperty) {
    return (
      <EmptyState
        icon={<BedDouble className="h-12 w-12 text-[var(--primary)]" />}
        title="No Active Property Selected"
        description="Please select or configure an active hotel property to manage rooms."
        action={{ label: "Complete Onboarding", onClick: () => router.push("/onboarding") }}
        className="stayhub-card p-10 max-w-lg mx-auto my-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#07090f] via-[#0d1635] to-[#111030] px-7 pt-7 pb-6 shadow-xl">
        {/* Decorative orbs */}
        <div className="absolute -top-12 right-12 w-60 h-60 bg-violet-700/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-36 bg-indigo-600/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-2 right-1/3 w-80 h-16 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            {/* Tag */}
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-300/90 bg-violet-400/10 border border-violet-400/20 px-2.5 py-1 rounded-full mb-3">
              <Home className="h-3 w-3" />
              Hotel Suite & Room Inventory
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight leading-tight">
              Rooms & Suites
              <span className="block text-violet-300/80 text-xl font-semibold mt-0.5">Live Inventory Control</span>
            </h1>

            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center">
                  <BedDouble className="h-3 w-3 text-white/70" />
                </div>
                <span className="text-white/70 text-xs"><span className="font-bold text-white">{totalCount}</span> total rooms</span>
              </div>
              {stats && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-white/70 text-xs"><span className="font-bold text-violet-300">{stats.occupied ?? 0}</span> occupied</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-white/70 text-xs"><span className="font-bold text-emerald-300">{stats.available ?? 0}</span> available</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Link href="/rooms/calendar">
              <button className="h-9 px-3.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/15 border border-white/10 transition-all">
                <Calendar className="h-3.5 w-3.5" />
                <span>Calendar</span>
              </button>
            </Link>
            <Link href="/rooms/types">
              <button className="h-9 px-3.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/15 border border-white/10 transition-all">
                <BedDouble className="h-3.5 w-3.5" />
                <span>Types ({roomTypes.length})</span>
              </button>
            </Link>
            <Link href="/rooms/floors">
              <button className="h-9 px-3.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/15 border border-white/10 transition-all">
                <Layers className="h-3.5 w-3.5" />
                <span>Floors ({floors.length})</span>
              </button>
            </Link>
            <Link href="/rooms/new">
              <button className="h-9 px-4 rounded-xl flex items-center gap-2 text-sm font-bold text-violet-950 bg-gradient-to-r from-violet-300 to-indigo-300 hover:from-violet-200 hover:to-indigo-200 shadow-md shadow-violet-400/30 transition-all">
                <Plus className="h-4 w-4" />
                Add Room
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <RoomKpiGrid stats={stats} loading={loading && !stats} />

      {/* ── FILTER BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
        <RoomFilters
          filters={filters}
          onFilterChange={setFilters}
          floors={floors}
          roomTypes={roomTypes}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* ── ERROR ── */}
      {error && (
        <ErrorState title="Error Loading Inventory" description={error} onRetry={loadData} className="stayhub-card" />
      )}

      {/* ── CONTENT ── */}
      {loading && rooms.length === 0 ? (
        <div className="stayhub-card p-12">
          <LoadingState message="Fetching room records..." />
        </div>
      ) : rooms.length === 0 ? (
        <div className="stayhub-card p-8">
          <EmptyState
            icon={<BedDouble className="h-10 w-10 text-[var(--foreground-subtle)]" />}
            title={
              filters.search || filters.status !== "ALL" || filters.floorId !== "ALL" || filters.roomTypeId !== "ALL"
                ? "No rooms match your filter criteria"
                : "No rooms configured yet"
            }
            description={
              filters.search || filters.status !== "ALL"
                ? "Try clearing your search terms or adjusting the status and floor filters."
                : "Add physical rooms and assign them to room categories to begin tracking inventory."
            }
            action={
              filters.search || filters.status !== "ALL"
                ? {
                    label: "Reset Filters",
                    onClick: () =>
                      setFilters({ search: "", status: "ALL", housekeepingStatus: "ALL", floorId: "ALL", roomTypeId: "ALL", isActive: "ALL", page: 1 }),
                  }
                : { label: "Add First Room", onClick: () => router.push("/rooms/new") }
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {viewMode === "list" ? (
            <RoomTable
              rooms={rooms}
              currency={currency}
              onOpenStatusModal={(room) => setSelectedRoomForStatus(room)}
              onDeactivateRoom={(room) => setRoomToDeactivate(room)}
            />
          ) : (
            <RoomCardGrid
              rooms={rooms}
              currency={currency}
              onOpenStatusModal={(room) => setSelectedRoomForStatus(room)}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {(currentPage - 1) * (filters.pageSize || 24) + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(currentPage * (filters.pageSize || 24), totalCount)}
                </span>{" "}
                of <span className="font-semibold text-slate-700">{totalCount}</span> rooms
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters({ ...filters, page: currentPage - 1 })}
                  className="h-8 px-2.5 text-xs rounded-xl"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <span className="text-xs font-bold px-2 text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters({ ...filters, page: currentPage + 1 })}
                  className="h-8 px-2.5 text-xs rounded-xl"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <RoomStatusModal
        open={Boolean(selectedRoomForStatus)}
        room={selectedRoomForStatus}
        propertyId={activePropertyId || ""}
        onClose={() => setSelectedRoomForStatus(null)}
        onSuccess={loadData}
      />

      <ConfirmModal
        open={Boolean(roomToDeactivate)}
        onClose={() => setRoomToDeactivate(null)}
        onConfirm={handleConfirmDeactivate}
        title={roomToDeactivate?.is_active ? "Deactivate Room" : "Reactivate Room"}
        description={
          roomToDeactivate?.is_active
            ? `Are you sure you want to deactivate Room ${roomToDeactivate?.room_number}? It will be hidden from booking availability.`
            : `Reactivate Room ${roomToDeactivate?.room_number} and return it to operational inventory?`
        }
        confirmLabel={roomToDeactivate?.is_active ? "Deactivate Room" : "Reactivate Room"}
        variant={roomToDeactivate?.is_active ? "danger" : "primary"}
        loading={isDeactivating}
      />
    </div>
  );
}
