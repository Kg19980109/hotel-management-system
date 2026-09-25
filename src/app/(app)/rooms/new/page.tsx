"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { fetchFloors, fetchRoomTypes } from "@/lib/rooms/queries";
import { createRoomAction } from "@/lib/rooms/actions";
import type {
  Floor,
  RoomType,
  RoomOperationalStatus,
  RoomHousekeepingStatus,
} from "@/lib/rooms/types";
import { PageHeader } from "@/components/shared/page-header";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

export default function NewRoomPage() {
  const router = useRouter();
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = React.useState<RoomType[]>([]);
  const [loadingDependencies, setLoadingDependencies] = React.useState(true);

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

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activePropertyId = currentProperty?.property_id;

  React.useEffect(() => {
    let isMounted = true;

    async function loadDeps() {
      if (!activePropertyId) return;
      try {
        const [floorsData, typesData] = await Promise.all([
          fetchFloors(supabase, activePropertyId),
          fetchRoomTypes(supabase, activePropertyId),
        ]);
        if (isMounted) {
          setFloors(floorsData);
          setRoomTypes(typesData);
          if (typesData.length > 0) {
            setRoomTypeId(typesData[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading room dependencies:", err);
      } finally {
        if (isMounted) setLoadingDependencies(false);
      }
    }

    if (!authLoading && activePropertyId) {
      loadDeps();
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePropertyId) return;

    if (!roomNumber.trim()) {
      setError("Please provide a room number.");
      return;
    }

    if (!roomTypeId) {
      setError("Please select a room type. Configure a room type first if none exist.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createRoomAction(activePropertyId, {
        room_number: roomNumber.trim(),
        room_name: roomName.trim() || null,
        room_type_id: roomTypeId,
        floor_id: floorId || null,
        status,
        housekeeping_status: housekeepingStatus,
        max_occupancy: maxOccupancy ? parseInt(maxOccupancy, 10) : null,
        view_type: viewType.trim() || null,
        notes: notes.trim() || null,
        is_active: true,
      });

      if (res.success) {
        router.push("/rooms");
      } else {
        setError(res.error || "Failed to create room.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loadingDependencies) {
    return <LoadingState message="Loading room setup form..." size="lg" />;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <PageHeader
        title="Add New Room"
        description="Configure a new physical room or suite to add to your property inventory."
        breadcrumbs={[
          { label: "Operations", href: "/rooms" },
          { label: "Rooms", href: "/rooms" },
          { label: "Add Room" },
        ]}
        actions={
          <Link href="/rooms">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Inventory
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

      {/* Warning if no room types configured */}
      {roomTypes.length === 0 && (
        <div className="p-4 rounded-[var(--radius-lg)] bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start justify-between gap-3">
          <div>
            <h4 className="font-semibold text-amber-900">Room Types Required</h4>
            <p className="mt-0.5 text-xs text-amber-700">
              You must create at least one room category (e.g. Standard, Deluxe) before adding physical rooms.
            </p>
          </div>
          <Link href="/rooms/types" className="shrink-0">
            <Button size="sm" variant="primary">
              Create Room Type
            </Button>
          </Link>
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
                placeholder="e.g. 101, 204, PH-01"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                required
              />
              <span className="text-[11px] text-[var(--foreground-muted)] mt-1 block">
                Must be unique within this property
              </span>
            </div>

            {/* Room Name / Label */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Room Custom Name (Optional)
              </label>
              <Input
                placeholder="e.g. Ocean Breeze Suite, Villa A"
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
                {roomTypes.length === 0 ? (
                  <option value="">No Room Types Configured</option>
                ) : (
                  roomTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) — {t.currency} {t.base_rate}
                    </option>
                  ))
                )}
              </Select>
            </div>

            {/* Floor */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Floor Assignment (Optional)
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

            {/* Operational Status */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Initial Operational Status
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoomOperationalStatus)}
              >
                <option value="AVAILABLE">Available — Ready for Check-in</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="DIRTY">Dirty — Needs Turnover Cleaning</option>
                <option value="CLEANING">Cleaning in Progress</option>
                <option value="OUT_OF_ORDER">Out of Order — Maintenance</option>
              </Select>
            </div>

            {/* Housekeeping Status */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Housekeeping State
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

            {/* Max Occupancy Override */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Max Capacity Override
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                placeholder="Leave blank to use Room Type default"
                value={maxOccupancy}
                onChange={(e) => setMaxOccupancy(e.target.value)}
              />
            </div>

            {/* View Type */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                View / Feature
              </label>
              <Input
                placeholder="e.g. Sea View, Pool View, Garden View"
                value={viewType}
                onChange={(e) => setViewType(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
              Room Notes / Key Details
            </label>
            <Textarea
              placeholder="Operational notes, specific access requirements, or feature specifications..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Link href="/rooms">
              <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || roomTypes.length === 0}
              className="shadow-sm"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {isSubmitting ? "Creating..." : "Save Room"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
