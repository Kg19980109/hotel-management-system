"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { fetchFloorViewData } from "@/lib/rooms/queries";
import type { Room, Floor } from "@/lib/rooms/types";
import { OperationalStatusBadge } from "@/components/rooms/room-status-badge";
import { RoomStatusModal } from "@/components/rooms/room-status-modal";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import {
  ArrowLeft,
  Plus,
  Layers,
  BedDouble,
  SlidersHorizontal,
  Eye,
} from "lucide-react";

export default function FloorViewPage() {
  const router = useRouter();
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [floorGroups, setFloorGroups] = React.useState<
    Array<{ floor: Floor | null; rooms: Room[] }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedRoomForStatus, setSelectedRoomForStatus] = React.useState<Room | null>(null);

  const activePropertyId = currentProperty?.property_id;

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) return;
    setLoading(true);
    try {
      const data = await fetchFloorViewData(supabase, activePropertyId);
      setFloorGroups(data);
    } catch (err) {
      console.error("Error loading floor view:", err);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && activePropertyId) {
      void Promise.resolve().then(() => {
        if (isMounted) loadData();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

  if (authLoading || loading) {
    return <LoadingState message="Loading floor layouts..." size="lg" />;
  }

  const totalRooms = floorGroups.reduce((acc, g) => acc + g.rooms.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Interactive Floor View"
        description="Visual architectural layout of physical rooms organized by level and operational status."
        breadcrumbs={[
          { label: "Operations", href: "/rooms" },
          { label: "Rooms", href: "/rooms" },
          { label: "Floor View" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/rooms">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Table View
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

      {totalRooms === 0 ? (
        <div className="stayhub-card p-10">
          <EmptyState
            icon={<Layers className="h-10 w-10 text-[var(--foreground-subtle)]" />}
            title="No rooms or floors to display"
            description="Configure floors and rooms to generate your property's visual floor plan."
            action={{
              label: "Add Room",
              onClick: () => router.push("/rooms/new"),
            }}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {floorGroups.map((group, gIdx) => {
            const floorTitle = group.floor ? group.floor.name : "Unassigned Level";
            const floorSubtitle = group.floor?.floor_number !== null && group.floor?.floor_number !== undefined
              ? `Level ${group.floor.floor_number}`
              : "Standard Block";

            return (
              <div key={gIdx} className="space-y-3">
                {/* Level Title Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-[var(--radius-md)] bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-bold text-xs">
                      {group.floor?.floor_number !== null && group.floor?.floor_number !== undefined
                        ? group.floor.floor_number
                        : "L"}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--foreground)]">{floorTitle}</h3>
                      <p className="text-xs text-[var(--foreground-muted)]">{floorSubtitle}</p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)]">
                    {group.rooms.length} Room{group.rooms.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Rooms Grid for this Floor */}
                {group.rooms.length === 0 ? (
                  <p className="text-xs text-[var(--foreground-subtle)] py-4 italic">
                    No rooms assigned to this floor yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {group.rooms.map((room) => {
                      const typeName = room.room_type?.name || "Standard";

                      return (
                        <div
                          key={room.id}
                          className="stayhub-card p-3 flex flex-col justify-between hover:shadow-md hover:border-[var(--primary)]/40 transition-all group"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-lg font-black text-[var(--foreground)] tracking-tight">
                                {room.room_number}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedRoomForStatus(room)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                                title="Change Status"
                              >
                                <SlidersHorizontal className="h-3 w-3" />
                              </Button>
                            </div>

                            <p className="text-[11px] font-medium text-[var(--foreground-muted)] truncate flex items-center gap-1 mb-2">
                              <BedDouble className="h-3 w-3 text-[var(--foreground-subtle)] shrink-0" />
                              {typeName}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-[var(--border)] flex flex-col gap-1.5">
                            <OperationalStatusBadge status={room.status} />

                            <Link href={`/rooms/${room.id}`} className="w-full">
                              <Button size="sm" variant="ghost" className="w-full h-6 text-[10px] px-1 text-[var(--foreground-muted)] hover:text-[var(--primary)]">
                                <Eye className="h-2.5 w-2.5 mr-1" />
                                Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
    </div>
  );
}
