"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { reassignStayRoomAction } from "@/lib/front-desk/actions";
import { fetchRooms } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/client";
import type { InHouseRecord } from "@/lib/front-desk/types";
import { AlertCircle, ArrowRightLeft, BedDouble } from "lucide-react";

interface ReassignStayRoomModalProps {
  open: boolean;
  stay: InHouseRecord | null;
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReassignStayRoomModal({
  open,
  stay,
  propertyId,
  onClose,
  onSuccess,
}: ReassignStayRoomModalProps) {
  const supabase = React.useMemo(() => createClient(), []);

  const [newRoomId, setNewRoomId] = React.useState<string>("");
  const [availableRooms, setAvailableRooms] = React.useState<
    { id: string; room_number: string; room_name: string | null }[]
  >([]);
  const [loadingRooms, setLoadingRooms] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadRooms = React.useCallback(async () => {
    if (!stay) return;
    setLoadingRooms(true);
    try {
      const res = await fetchRooms(supabase, propertyId, {
        pageSize: 100,
        isActive: true,
      });

      // Filter available rooms only (not occupied, not OOO, not current room)
      const available = res.rooms
        .filter((r) => r.id !== stay.roomId && r.status === "AVAILABLE")
        .map((r) => ({
          id: r.id,
          room_number: r.room_number,
          room_name: r.room_name,
        }));

      setAvailableRooms(available);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load rooms";
      setError(msg);
    } finally {
      setLoadingRooms(false);
    }
  }, [stay, propertyId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (open && stay) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        setNewRoomId("");
        setError(null);
        loadRooms();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [open, stay, loadRooms]);

  if (!stay) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomId) {
      setError("Please select a target room for reassignment.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await reassignStayRoomAction(stay.stayId, propertyId, newRoomId);
    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to reassign room.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reassign Room: ${stay.guestName}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">Current Room</span>
            <span className="font-bold text-slate-800 text-sm">Room {stay.roomNumber}</span>
          </div>
          <ArrowRightLeft className="h-4 w-4 text-slate-400" />
          <div className="text-right">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">Category</span>
            <span className="font-medium text-slate-800 text-sm">{stay.roomTypeName}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--radius-md)] text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <div>{error}</div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Select Destination Room <span className="text-rose-500">*</span>
          </label>
          <Select
            value={newRoomId}
            onChange={(e) => setNewRoomId(e.target.value)}
            disabled={loadingRooms || submitting}
            required
          >
            <option value="">-- Select Available Room --</option>
            {availableRooms.map((rm) => (
              <option key={rm.id} value={rm.id}>
                Room {rm.room_number} {rm.room_name ? `(${rm.room_name})` : ""}
              </option>
            ))}
          </Select>
          {loadingRooms && (
            <p className="text-[11px] text-[var(--foreground-muted)] mt-1 animate-pulse">
              Finding clean and available rooms...
            </p>
          )}
        </div>

        <p className="text-[11px] text-slate-500 italic">
          Notice: Current Room {stay.roomNumber} will automatically transition to DIRTY status upon reassignment.
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting || loadingRooms || !newRoomId}
            className="gap-1.5"
          >
            <BedDouble className="h-4 w-4" />
            {submitting ? "Moving..." : "Confirm Move"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
