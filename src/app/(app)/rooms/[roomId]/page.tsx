"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { fetchRoomById } from "@/lib/rooms/queries";
import { updateRoomStatusAction, deactivateRoomAction } from "@/lib/rooms/actions";
import type { Room, RoomOperationalStatus, RoomHousekeepingStatus } from "@/lib/rooms/types";
import { formatCurrency, formatPropertyDate } from "@/lib/dashboard/formatters";
import { OperationalStatusBadge, HousekeepingStatusBadge } from "@/components/rooms/room-status-badge";
import { RoomStatusModal } from "@/components/rooms/room-status-modal";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { RoomHousekeepingCard } from "@/components/housekeeping";
import { RoomMaintenanceCard } from "@/components/maintenance";
import {
  getRoomHousekeepingHistory,
  getPropertyStaff,
} from "@/lib/housekeeping/queries";
import { getRoomMaintenanceHistory } from "@/lib/maintenance/queries";
import {
  HousekeepingTask,
  HousekeepingInspection,
  StaffOption,
} from "@/lib/housekeeping/types";
import { MaintenanceWorkOrder } from "@/lib/maintenance/types";
import {
  ArrowLeft,
  Edit,
  SlidersHorizontal,
  BedDouble,
  MapPin,
  Users,
  Eye,
  Sparkles,
  Wrench,
  Ban,
  CheckCircle,
} from "lucide-react";

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [room, setRoom] = React.useState<Room | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Housekeeping & Maintenance integration state
  const [activeHkTask, setActiveHkTask] = React.useState<HousekeepingTask | null>(null);
  const [hkHistory, setHkHistory] = React.useState<HousekeepingTask[]>([]);
  const [hkInspections, setHkInspections] = React.useState<HousekeepingInspection[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = React.useState<MaintenanceWorkOrder[]>([]);
  const [staffList, setStaffList] = React.useState<StaffOption[]>([]);

  // Modals
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = React.useState(false);
  const [isDeactivating, setIsDeactivating] = React.useState(false);

  const activePropertyId = currentProperty?.property_id;
  const currency = currentProperty?.currency || "INR";
  const timezone = currentProperty?.timezone || "Asia/Kolkata";

  const loadRoom = React.useCallback(async () => {
    if (!activePropertyId || !roomId) return;
    setLoading(true);
    setError(null);
    try {
      const [roomData, hkData, maintData, staffData] = await Promise.all([
        fetchRoomById(supabase, activePropertyId, roomId),
        getRoomHousekeepingHistory(supabase, roomId, activePropertyId),
        getRoomMaintenanceHistory(supabase, activePropertyId, roomId),
        getPropertyStaff(supabase, activePropertyId),
      ]);

      if (roomData) {
        setRoom(roomData);
        setActiveHkTask(hkData.activeTask);
        setHkHistory(hkData.history);
        setHkInspections(hkData.inspections);
        setMaintenanceHistory(maintData);
        setStaffList(staffData);
      } else {
        setError("Room not found in active property.");
      }
    } catch (err) {
      console.error("Error fetching room:", err);
      setError("Failed to load room details.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, roomId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && activePropertyId) {
      void Promise.resolve().then(() => {
        if (isMounted) loadRoom();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadRoom]);

  const handleQuickStatus = async (
    newStatus: RoomOperationalStatus,
    newHk?: RoomHousekeepingStatus
  ) => {
    if (!activePropertyId || !room) return;
    try {
      const res = await updateRoomStatusAction(activePropertyId, room.id, newStatus, newHk);
      if (res.success) {
        loadRoom();
      } else {
        alert(res.error || "Failed to update status.");
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const handleDeactivate = async () => {
    if (!activePropertyId || !room) return;
    setIsDeactivating(true);
    try {
      const res = await deactivateRoomAction(activePropertyId, room.id, room.is_active);
      if (res.success) {
        setDeactivateModalOpen(false);
        loadRoom();
      } else {
        alert(res.error || "Failed to deactivate room.");
      }
    } catch (err) {
      console.error("Deactivate error:", err);
    } finally {
      setIsDeactivating(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingState message="Loading room details..." size="lg" />;
  }

  if (error || !room) {
    return (
      <div className="space-y-4">
        <Link href="/rooms">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Inventory
          </Button>
        </Link>
        <ErrorState
          title="Room Unavailable"
          description={error || "The requested room does not exist in this property."}
          onRetry={() => router.push("/rooms")}
          className="stayhub-card"
        />
      </div>
    );
  }

  const rate = room.room_type?.base_rate || 0;
  const capacity = room.max_occupancy || room.room_type?.max_occupancy || 2;
  const amenities = room.room_type?.amenities || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Room ${room.room_number}`}
        description={room.room_name ? `${room.room_name} • ${room.room_type?.name}` : room.room_type?.name}
        breadcrumbs={[
          { label: "Operations", href: "/rooms" },
          { label: "Rooms", href: "/rooms" },
          { label: `Room ${room.room_number}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/rooms">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusModalOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              Adjust Status
            </Button>
            <Link href={`/rooms/${room.id}/edit`}>
              <Button variant="primary" size="sm">
                <Edit className="h-4 w-4 mr-1.5" />
                Edit Room
              </Button>
            </Link>
          </div>
        }
      />

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Housekeeping Operations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Primary Specifications */}
          <div className="stayhub-card p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
              <div>
                <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                  Room Category
                </span>
                <h3 className="text-xl font-bold text-[var(--foreground)] mt-0.5">
                  {room.room_type?.name || "Standard Room"}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--foreground-muted)] block">Base Rack Rate</span>
                <span className="text-2xl font-black text-[var(--foreground)]">
                  {formatCurrency(rate, currency)}
                </span>
                <span className="text-xs text-[var(--foreground-subtle)] font-normal"> / night</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-[var(--foreground-muted)] block">Floor</span>
                <p className="font-semibold text-[var(--foreground)] mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[var(--primary)]" />
                  {room.floor?.name || "Unassigned"}
                </p>
              </div>

              <div>
                <span className="text-xs text-[var(--foreground-muted)] block">Max Occupancy</span>
                <p className="font-semibold text-[var(--foreground)] mt-0.5 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-[var(--foreground-subtle)]" />
                  {capacity} Guests
                </p>
              </div>

              <div>
                <span className="text-xs text-[var(--foreground-muted)] block">Bed Layout</span>
                <p className="font-semibold text-[var(--foreground)] mt-0.5 flex items-center gap-1">
                  <BedDouble className="h-3.5 w-3.5 text-[var(--foreground-subtle)]" />
                  {room.room_type?.bed_configuration || "Standard"}
                </p>
              </div>

              <div>
                <span className="text-xs text-[var(--foreground-muted)] block">View / Aspect</span>
                <p className="font-semibold text-[var(--foreground)] mt-0.5 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-[var(--foreground-subtle)]" />
                  {room.view_type || "Standard View"}
                </p>
              </div>

              <div>
                <span className="text-xs text-[var(--foreground-muted)] block">Size</span>
                <p className="font-semibold text-[var(--foreground)] mt-0.5">
                  {room.room_type?.size_sqft ? `${room.room_type.size_sqft} sq ft` : "Not specified"}
                </p>
              </div>

              <div>
                <span className="text-xs text-[var(--foreground-muted)] block">Category Code</span>
                <p className="font-semibold text-[var(--foreground)] mt-0.5 font-mono">
                  {room.room_type?.code || "---"}
                </p>
              </div>
            </div>

            {/* Amenities Chips */}
            {amenities.length > 0 && (
              <div className="pt-4 mt-4 border-t border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--foreground-muted)] block mb-2">
                  Category Amenities & Features
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-[var(--radius-md)] text-xs bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {room.notes && (
              <div className="pt-4 mt-4 border-t border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--foreground-muted)] block mb-1">
                  Operational Notes
                </span>
                <p className="text-xs text-[var(--foreground)] bg-slate-50 p-3 rounded-[var(--radius-md)] border border-slate-200 leading-relaxed">
                  {room.notes}
                </p>
              </div>
            )}
          </div>

          {/* Phase 10: Housekeeping Integration Section */}
          <RoomHousekeepingCard
            roomId={room.id}
            propertyId={activePropertyId || ""}
            roomStatus={room.status}
            housekeepingStatus={room.housekeeping_status}
            activeTask={activeHkTask}
            history={hkHistory}
            inspections={hkInspections}
            staffList={staffList}
          />

          {/* Phase 11: Maintenance Integration Section */}
          <RoomMaintenanceCard
            propertyId={activePropertyId || ""}
            roomId={room.id}
            roomNumber={room.room_number}
            currentRoomStatus={room.status}
            history={maintenanceHistory}
            staff={staffList.map((s) => ({
              id: s.userId,
              fullName: s.fullName,
              email: s.email,
              role: s.roleCode,
            }))}
            onRefresh={loadRoom}
          />
        </div>

        {/* Right Column: Status & Operational Controls */}
        <div className="space-y-6">
          {/* Card: Live Operational Status */}
          <div className="stayhub-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Operational Status
            </h3>

            <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)]">
              <span className="text-xs text-[var(--foreground-muted)] font-medium">Room State</span>
              <OperationalStatusBadge status={room.status} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)]">
              <span className="text-xs text-[var(--foreground-muted)] font-medium">Housekeeping</span>
              <HousekeepingStatusBadge status={room.housekeeping_status} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)]">
              <span className="text-xs text-[var(--foreground-muted)] font-medium">Inventory Active</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  room.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}
              >
                {room.is_active ? "Active" : "Deactivated"}
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 border-t border-[var(--border)] space-y-2">
              <span className="text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider block">
                Quick State Change
              </span>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickStatus("AVAILABLE", "CLEAN")}
                  className="text-xs h-8"
                  disabled={room.status === "AVAILABLE"}
                >
                  <Sparkles className="h-3 w-3 mr-1 text-emerald-600" />
                  Mark Ready
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickStatus("DIRTY", "DIRTY")}
                  className="text-xs h-8"
                  disabled={room.status === "DIRTY"}
                >
                  <Sparkles className="h-3 w-3 mr-1 text-amber-600" />
                  Mark Dirty
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickStatus("OUT_OF_ORDER")}
                  className="text-xs h-8 col-span-2"
                  disabled={room.status === "OUT_OF_ORDER"}
                >
                  <Wrench className="h-3 w-3 mr-1 text-red-600" />
                  Mark Out of Order (Maintenance)
                </Button>
              </div>
            </div>

            {/* Deactivation Trigger */}
            <div className="pt-2 border-t border-[var(--border)]">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeactivateModalOpen(true)}
                className={`w-full text-xs h-8 ${
                  room.is_active ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                {room.is_active ? (
                  <>
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    Deactivate from Inventory
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Reactivate Room
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Audit Metadata */}
          <div className="stayhub-card p-4 text-xs text-[var(--foreground-muted)] space-y-1.5">
            <div className="flex justify-between">
              <span>Created:</span>
              <span className="font-mono text-[var(--foreground)]">
                {formatPropertyDate(room.created_at, timezone, "short")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Modified:</span>
              <span className="font-mono text-[var(--foreground)]">
                {formatPropertyDate(room.updated_at, timezone, "short")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>System ID:</span>
              <span className="font-mono text-[var(--foreground-subtle)] truncate max-w-[120px]">
                {room.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Adjust Status Modal */}
      <RoomStatusModal
        open={statusModalOpen}
        room={room}
        propertyId={activePropertyId || ""}
        onClose={() => setStatusModalOpen(false)}
        onSuccess={loadRoom}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmModal
        open={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        onConfirm={handleDeactivate}
        title={room.is_active ? "Deactivate Room" : "Reactivate Room"}
        description={
          room.is_active
            ? `Are you sure you want to deactivate Room ${room.room_number}? It will be hidden from front desk booking availability, but preserved for historical reporting.`
            : `Reactivate Room ${room.room_number} and return it to operational inventory?`
        }
        confirmLabel={room.is_active ? "Deactivate Room" : "Reactivate Room"}
        variant={room.is_active ? "danger" : "primary"}
        loading={isDeactivating}
      />
    </div>
  );
}
