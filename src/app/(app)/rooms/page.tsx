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
import { PageHeader } from "@/components/shared/page-header";
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
} from "lucide-react";

export default function RoomsPage() {
  const router = useRouter();
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  // Data states
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [stats, setStats] = React.useState<RoomStats | null>(null);
  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = React.useState<RoomType[]>([]);

  // UI & Filter states
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

  // Modal states
  const [selectedRoomForStatus, setSelectedRoomForStatus] = React.useState<Room | null>(null);
  const [roomToDeactivate, setRoomToDeactivate] = React.useState<Room | null>(null);
  const [isDeactivating, setIsDeactivating] = React.useState(false);

  const activePropertyId = currentProperty?.property_id;
  const currency = currentProperty?.currency || "INR";

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }

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
      console.error("Error loading rooms:", err);
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
        if (activePropertyId) {
          loadData();
        } else {
          setLoading(false);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

  // Handle deactivation
  const handleConfirmDeactivate = async () => {
    if (!roomToDeactivate || !activePropertyId) return;
    setIsDeactivating(true);
    try {
      const res = await deactivateRoomAction(
        activePropertyId,
        roomToDeactivate.id,
        roomToDeactivate.is_active // If currently active, deactivate; else reactivate
      );
      if (res.success) {
        setRoomToDeactivate(null);
        loadData();
      } else {
        alert(res.error || "Failed to update room activation state.");
      }
    } catch (err) {
      console.error("Deactivate error:", err);
    } finally {
      setIsDeactivating(false);
    }
  };

  const totalPages = Math.ceil(totalCount / (filters.pageSize || 24)) || 1;
  const currentPage = filters.page || 1;

  if (authLoading) {
    return <LoadingState message="Loading room management..." size="lg" />;
  }

  if (!currentProperty) {
    return (
      <EmptyState
        icon={<BedDouble className="h-12 w-12 text-[var(--primary)]" />}
        title="No Active Property Selected"
        description="Please select or configure an active hotel property to manage rooms."
        action={{
          label: "Complete Onboarding",
          onClick: () => router.push("/onboarding"),
        }}
        className="stayhub-card p-10 max-w-lg mx-auto my-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Room Inventory"
        description="Configure room inventory, operational status, housekeeping state, and categories."
        breadcrumbs={[{ label: "Operations", href: "/rooms" }, { label: "Rooms" }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/rooms/calendar">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                <Calendar className="h-4 w-4 mr-1.5" />
                Calendar View
              </Button>
            </Link>
            <Link href="/rooms/floor-view">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                Floor View
              </Button>
            </Link>
            <Link href="/rooms/types">
              <Button variant="outline" size="sm">
                <BedDouble className="h-4 w-4 mr-1.5" />
                Room Types ({roomTypes.length})
              </Button>
            </Link>
            <Link href="/rooms/floors">
              <Button variant="outline" size="sm">
                <Layers className="h-4 w-4 mr-1.5" />
                Floors ({floors.length})
              </Button>
            </Link>
            <Link href="/rooms/new">
              <Button variant="primary" size="sm" className="shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Room
              </Button>
            </Link>
          </div>
        }
      />

      {/* 2. Room Statistics / KPI Grid */}
      <RoomKpiGrid stats={stats} loading={loading && !stats} />

      {/* 3. Search & Filter Bar */}
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

      {/* 4. Error Display */}
      {error && (
        <ErrorState
          title="Error Loading Inventory"
          description={error}
          onRetry={loadData}
          className="stayhub-card"
        />
      )}

      {/* 5. Room Content */}
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
                : "Add physical rooms and assign them to room categories to begin tracking inventory and reservations."
            }
            action={
              filters.search || filters.status !== "ALL"
                ? {
                    label: "Reset Filters",
                    onClick: () =>
                      setFilters({
                        search: "",
                        status: "ALL",
                        housekeepingStatus: "ALL",
                        floorId: "ALL",
                        roomTypeId: "ALL",
                        isActive: "ALL",
                        page: 1,
                      }),
                  }
                : {
                    label: "Add First Room",
                    onClick: () => router.push("/rooms/new"),
                  }
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-xs text-[var(--foreground-muted)]">
                Showing {(currentPage - 1) * (filters.pageSize || 24) + 1} to{" "}
                {Math.min(currentPage * (filters.pageSize || 24), totalCount)} of {totalCount} rooms
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters({ ...filters, page: currentPage - 1 })}
                  className="h-8 px-2.5 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <span className="text-xs font-semibold px-2 text-[var(--foreground)]">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters({ ...filters, page: currentPage + 1 })}
                  className="h-8 px-2.5 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Status Modal */}
      <RoomStatusModal
        open={Boolean(selectedRoomForStatus)}
        room={selectedRoomForStatus}
        propertyId={activePropertyId || ""}
        onClose={() => setSelectedRoomForStatus(null)}
        onSuccess={loadData}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmModal
        open={Boolean(roomToDeactivate)}
        onClose={() => setRoomToDeactivate(null)}
        onConfirm={handleConfirmDeactivate}
        title={roomToDeactivate?.is_active ? "Deactivate Room" : "Reactivate Room"}
        description={
          roomToDeactivate?.is_active
            ? `Are you sure you want to deactivate Room ${roomToDeactivate?.room_number}? It will be hidden from front desk booking availability, but preserved for historical reporting.`
            : `Reactivate Room ${roomToDeactivate?.room_number} and return it to operational inventory?`
        }
        confirmLabel={roomToDeactivate?.is_active ? "Deactivate Room" : "Reactivate Room"}
        variant={roomToDeactivate?.is_active ? "danger" : "primary"}
        loading={isDeactivating}
      />
    </div>
  );
}
