"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { assignRoomAction } from "@/lib/bookings/actions";
import { getAvailableRooms } from "@/lib/bookings/queries";
import { ReservationRoom } from "@/lib/bookings/types";
import { createClient } from "@/lib/supabase/client";

interface AssignRoomModalProps {
  open: boolean;
  reservationId: string;
  reservationRoom: ReservationRoom | null;
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignRoomModal({
  open,
  reservationId,
  reservationRoom,
  propertyId,
  onClose,
  onSuccess,
}: AssignRoomModalProps) {
  const [selectedRoomId, setSelectedRoomId] = React.useState<string>("");
  const [availableRooms, setAvailableRooms] = React.useState<
    { id: string; room_number: string; room_name: string | null }[]
  >([]);
  const [loadingRooms, setLoadingRooms] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createClient(), []);

  const loadRooms = React.useCallback(async () => {
    if (!reservationRoom) return;
    setLoadingRooms(true);
    try {
      const rooms = await getAvailableRooms(
        supabase,
        propertyId,
        reservationRoom.check_in_date,
        reservationRoom.check_out_date,
        reservationRoom.room_type_id
      );

      // If current room is already assigned, keep it in the list of options
      if (reservationRoom.room_id && !rooms.some((r) => r.id === reservationRoom.room_id)) {
        rooms.unshift({
          id: reservationRoom.room_id,
          room_number: reservationRoom.room_number || "Current",
          room_name: reservationRoom.room_name || null,
          room_type_id: reservationRoom.room_type_id,
        });
      }

      setAvailableRooms(rooms);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load rooms";
      setError(msg);
    } finally {
      setLoadingRooms(false);
    }
  }, [reservationRoom, supabase, propertyId]);

  React.useEffect(() => {
    let isMounted = true;
    if (open && reservationRoom) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        setSelectedRoomId(reservationRoom.room_id || "");
        setError(null);
        loadRooms();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [open, reservationRoom, loadRooms]);

  if (!reservationRoom) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const roomIdToAssign = selectedRoomId.trim() === "" ? null : selectedRoomId;
    const res = await assignRoomAction(
      reservationId,
      propertyId,
      reservationRoom.id,
      roomIdToAssign
    );
    setSaving(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to assign room.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign Physical Room"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="text-xs text-[var(--foreground-muted)] p-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] space-y-1">
          <div>
            <span className="font-semibold text-slate-700">Room Category: </span>
            {reservationRoom.room_type_name} ({reservationRoom.room_type_code})
          </div>
          <div>
            <span className="font-semibold text-slate-700">Stay Window: </span>
            {reservationRoom.check_in_date} to {reservationRoom.check_out_date}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--radius-md)] text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
            Select Physical Room
          </label>
          <Select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            disabled={loadingRooms}
          >
            <option value="">-- Unassigned (Run of House / Allocate Later) --</option>
            {availableRooms.map((rm) => (
              <option key={rm.id} value={rm.id}>
                Room {rm.room_number} {rm.room_name ? `(${rm.room_name})` : ""}
              </option>
            ))}
          </Select>
          {loadingRooms && (
            <p className="text-[11px] text-[var(--foreground-muted)] mt-1 animate-pulse">
              Checking availability for selected dates...
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving || loadingRooms}>
            {saving ? "Saving..." : "Save Assignment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
