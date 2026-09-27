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
  RoomLiveDetailsModal,
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
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("grid");
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
  const [selectedRoomForLiveDetails, setSelectedRoomForLiveDetails] = React.useState<Room | null>(null);
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
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Decorative ambient radial gradients */}
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
            {/* Tag */}
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.30)",
                background: "rgba(214,168,90,0.10)",
              }}
            >
              <Home className="h-3 w-3" />
              Room & Suite Inventory
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Physical Rooms & Suites
              <span className="block text-white/50 text-base font-normal mt-0.5">
                Live Status, Category Allocations & Housekeeping
              </span>
            </h1>

            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-white/70">
                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center">
                  <BedDouble className="h-3 w-3 text-white/70" />
                </div>
                <span><span className="font-bold text-white">{totalCount}</span> total rooms</span>
              </div>
              {stats && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: "var(--purple)" }}
                    />
                    <span><span className="font-bold text-white">{stats.occupied ?? 0}</span> occupied</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: "var(--success)" }}
                    />
                    <span><span className="font-bold text-white">{stats.available ?? 0}</span> available</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: "var(--warning)" }}
                    />
                    <span><span className="font-bold text-white">{stats.dirty ?? 0}</span> cleaning</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Link href="/rooms/calendar">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 h-9"
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Calendar
              </Button>
            </Link>
            <Link href="/rooms/types">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 h-9"
              >
                <BedDouble className="h-3.5 w-3.5 mr-1.5" />
                Types ({roomTypes.length})
              </Button>
            </Link>
            <Link href="/rooms/floors">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 h-9"
              >
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Floors ({floors.length})
              </Button>
            </Link>
            <Link href="/rooms/new">
              <Button
                variant="primary"
                size="sm"
                className="h-9 gap-1.5 shadow-md"
              >
                <Plus className="h-4 w-4" />
                Add Room
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI GRID (Interactive Filter Cards) ── */}
      <RoomKpiGrid
        stats={stats}
        loading={loading && !stats}
        selectedStatus={filters.status || "ALL"}
        onSelectStatus={(status) =>
          setFilters((prev) => ({ ...prev, status: status as any, page: 1 }))
        }
      />

      {/* ── FILTER BAR ── */}
      <div className="stayhub-card p-4">
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
              onSelectRoom={(room) => setSelectedRoomForLiveDetails(room)}
            />
          ) : (
            <RoomCardGrid
              rooms={rooms}
              currency={currency}
              onOpenStatusModal={(room) => setSelectedRoomForStatus(room)}
              onSelectRoom={(room) => setSelectedRoomForLiveDetails(room)}
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

      {/* Live Guest & Stay Inspection Modal */}
      <RoomLiveDetailsModal
        open={Boolean(selectedRoomForLiveDetails)}
        room={selectedRoomForLiveDetails}
        propertyId={activePropertyId || ""}
        currency={currency}
        onClose={() => setSelectedRoomForLiveDetails(null)}
        onSuccess={() => {
          loadData();
          // Update the selected room in state if open
          if (selectedRoomForLiveDetails) {
            const updated = rooms.find((r) => r.id === selectedRoomForLiveDetails.id);
            if (updated) setSelectedRoomForLiveDetails(updated);
          }
        }}
      />

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
