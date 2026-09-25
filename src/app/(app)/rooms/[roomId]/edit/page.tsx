"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { fetchRoomById, fetchFloors, fetchRoomTypes } from "@/lib/rooms/queries";
import { updateRoomAction } from "@/lib/rooms/actions";
import type {
  Floor,
  RoomType,
  RoomOperationalStatus,
  RoomHousekeepingStatus,
} from "@/lib/rooms/types";
import { PageHeader } from "@/components/shared/page-header";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

export default function EditRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = React.useState<RoomType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form states
  const [roomNumber, setRoomNumber] = React.useState("");
  const [roomName, setRoomName] = React.useState("");
  const [roomTypeId, setRoomTypeId] = React.useState("");
  const [floorId, setFloorId] = React.useState("");
  const [status, setStatus] = React.useState<RoomOperationalStatus>("AVAILABLE");
  const [housekeepingStatus, setHousekeepingStatus] = React.useState<RoomHousekeepingStatus>("CLEAN");
  const [maxOccupancy, setMaxOccupancy] = React.useState<string>("");
  const [viewType, setViewType] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const activePropertyId = currentProperty?.property_id;

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!activePropertyId || !roomId) return;
      setLoading(true);
      setError(null);
      try {
        const [roomData, floorsData, typesData] = await Promise.all([
          fetchRoomById(supabase, activePropertyId, roomId),
          fetchFloors(supabase, activePropertyId),
          fetchRoomTypes(supabase, activePropertyId),
        ]);

        if (isMounted) {
          if (!roomData) {
            setError("Room not found in this property.");
            return;
          }

          setFloors(floorsData);
          setRoomTypes(typesData);

          setRoomNumber(roomData.room_number);
          setRoomName(roomData.room_name || "");
          setRoomTypeId(roomData.room_type_id);
          setFloorId(roomData.floor_id || "");
          setStatus(roomData.status);
          setHousekeepingStatus(roomData.housekeeping_status);
          setMaxOccupancy(roomData.max_occupancy ? roomData.max_occupancy.toString() : "");
          setViewType(roomData.view_type || "");
          setNotes(roomData.notes || "");
          setIsActive(roomData.is_active);
        }
      } catch (err) {
        console.error("Error loading room data:", err);
        if (isMounted) setError("Failed to load room details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (!authLoading && activePropertyId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, roomId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePropertyId || !roomId) return;

    if (!roomNumber.trim()) {
      setError("Room number is required.");
      return;
    }

    if (!roomTypeId) {
      setError("Room type must be selected.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await updateRoomAction(activePropertyId, roomId, {
        room_number: roomNumber.trim(),
        room_name: roomName.trim() || null,
        room_type_id: roomTypeId,
        floor_id: floorId || null,
        status,
        housekeeping_status: housekeepingStatus,
        max_occupancy: maxOccupancy ? parseInt(maxOccupancy, 10) : null,
        view_type: viewType.trim() || null,
        notes: notes.trim() || null,
        is_active: isActive,
      });

      if (res.success) {
        router.push(`/rooms/${roomId}`);
      } else {
        setError(res.error || "Failed to update room.");
      }
    } catch (err) {
      console.error("Update error:", err);
      setError("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingState message="Loading room editor..." size="lg" />;
  }

  if (error && !roomNumber) {
    return (
      <div className="space-y-4">
        <Link href="/rooms">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Inventory
          </Button>
        </Link>
        <ErrorState
          title="Room Not Found"
          description={error}
          onRetry={() => router.push("/rooms")}
          className="stayhub-card"
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <PageHeader
        title={`Edit Room ${roomNumber}`}
        description="Update physical specifications, category assignment, or operational status."
        breadcrumbs={[
          { label: "Operations", href: "/rooms" },
          { label: "Rooms", href: "/rooms" },
          { label: `Room ${roomNumber}`, href: `/rooms/${roomId}` },
          { label: "Edit" },
        ]}
        actions={
          <Link href={`/rooms/${roomId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-[var(--radius-md)] bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="stayhub-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Room Number */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Room Number <span className="text-red-500">*</span>
              </label>
              <Input
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                required
              />
            </div>

            {/* Room Name */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Room Custom Name (Optional)
              </label>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>

            {/* Room Type */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Room Type / Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={roomTypeId}
                onChange={(e) => setRoomTypeId(e.target.value)}
                required
              >
                {roomTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code}) — {t.currency} {t.base_rate}
                  </option>
                ))}
              </Select>
            </div>

            {/* Floor */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Floor Assignment
              </label>
              <Select
                value={floorId}
                onChange={(e) => setFloorId(e.target.value)}
              >
                <option value="">Unassigned Floor</option>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.floor_number !== null ? `${f.name} (Floor ${f.floor_number})` : f.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Operational Status
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoomOperationalStatus)}
              >
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="DIRTY">Dirty</option>
                <option value="CLEANING">Cleaning</option>
                <option value="INSPECTED">Inspected</option>
                <option value="OUT_OF_ORDER">Out of Order</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
              </Select>
            </div>

            {/* Housekeeping */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Housekeeping Status
              </label>
              <Select
                value={housekeepingStatus}
                onChange={(e) => setHousekeepingStatus(e.target.value as RoomHousekeepingStatus)}
              >
                <option value="CLEAN">Clean</option>
                <option value="DIRTY">Dirty</option>
                <option value="CLEANING">Cleaning in Progress</option>
                <option value="INSPECTION_PENDING">Inspection Pending</option>
              </Select>
            </div>

            {/* Max Occupancy */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Max Capacity Override
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={maxOccupancy}
                onChange={(e) => setMaxOccupancy(e.target.value)}
              />
            </div>

            {/* View Type */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                View / Aspect
              </label>
              <Input
                value={viewType}
                onChange={(e) => setViewType(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
              Room Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Active Inventory Status */}
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)]">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <label htmlFor="isActiveCheck" className="text-xs font-medium text-[var(--foreground)] cursor-pointer">
              Room is active in hotel inventory (uncheck to deactivate without deleting)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Link href={`/rooms/${roomId}`}>
              <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="shadow-sm"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
