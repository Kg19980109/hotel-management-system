"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { checkInStayAction } from "@/lib/front-desk/actions";
import { getAvailableRooms } from "@/lib/bookings/queries";
import { createClient } from "@/lib/supabase/client";
import type { ArrivalRecord } from "@/lib/front-desk/types";
import { AlertCircle, CheckCircle2, UserCheck, AlertTriangle } from "lucide-react";

interface CheckInModalProps {
  open: boolean;
  arrival: ArrivalRecord | null;
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CheckInModal({
  open,
  arrival,
  propertyId,
  onClose,
  onSuccess,
}: CheckInModalProps) {
  const supabase = React.useMemo(() => createClient(), []);

  const [roomId, setRoomId] = React.useState<string>("");
  const [adults, setAdults] = React.useState<number>(1);
  const [children, setChildren] = React.useState<number>(0);
  const [notes, setNotes] = React.useState<string>("");
  const [isEarly, setIsEarly] = React.useState<boolean>(false);
  const [authorizeEarly, setAuthorizeEarly] = React.useState<boolean>(false);

  const [availableRooms, setAvailableRooms] = React.useState<
    { id: string; room_number: string; room_name: string | null }[]
  >([]);
  const [loadingRooms, setLoadingRooms] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadRooms = React.useCallback(async () => {
    if (!arrival) return;
    setLoadingRooms(true);
    try {
      const rooms = await getAvailableRooms(
        supabase,
        propertyId,
        arrival.checkInDate,
        arrival.checkOutDate,
        arrival.roomTypeId
      );

      // If already assigned a room, prepend it if not already in list
      if (arrival.roomId && !rooms.some((r) => r.id === arrival.roomId)) {
        rooms.unshift({
          id: arrival.roomId,
          room_number: arrival.roomNumber || "Assigned",
          room_name: null,
          room_type_id: arrival.roomTypeId,
        });
      }

      setAvailableRooms(rooms);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load rooms";
      setError(msg);
    } finally {
      setLoadingRooms(false);
    }
  }, [arrival, propertyId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (open && arrival) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        setRoomId(arrival.roomId || "");
        setAdults(arrival.adults || 1);
        setChildren(arrival.children || 0);
        setNotes("");
        setError(null);
        setAuthorizeEarly(false);

        // Check if arrival date is strictly in the future (early check-in)
        const todayStr = new Date().toISOString().split("T")[0];
        setIsEarly(todayStr < arrival.checkInDate);

        loadRooms();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [open, arrival, loadRooms]);

  if (!arrival) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) {
      setError("Please assign a physical room before completing check-in.");
      return;
    }

    if (isEarly && !authorizeEarly) {
      setError("Early arrival requires explicit front desk authorization.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await checkInStayAction({
      reservationRoomId: arrival.reservationRoomId,
      roomId,
      propertyId,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      notes: notes.trim() || undefined,
      isEarly: isEarly && authorizeEarly,
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to complete check-in.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Check In Guest: ${arrival.guestName}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Booking Summary Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] text-xs grid grid-cols-2 gap-y-2 gap-x-4">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Confirmation</span>
            <span className="font-mono font-bold text-slate-800">{arrival.confirmationNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Room Category</span>
            <span className="font-medium text-slate-800">{arrival.roomTypeName} ({arrival.roomTypeCode})</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Stay Window</span>
            <span className="text-slate-800">{arrival.checkInDate} → {arrival.checkOutDate} ({arrival.nights}n)</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Booking Source</span>
            <span className="text-slate-800 capitalize">{arrival.bookingSource.toLowerCase()}</span>
          </div>
        </div>

        {/* Early Check-In Notice */}
        {isEarly && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-950">Early Arrival Override</div>
              <p className="text-[11px] text-amber-800">
                Scheduled check-in date is <strong>{arrival.checkInDate}</strong>. Confirming check-in today initiates occupancy immediately.
              </p>
              <label className="flex items-center gap-2 pt-1 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorizeEarly}
                  onChange={(e) => setAuthorizeEarly(e.target.checked)}
                  className="rounded border-amber-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span>Authorize Early Check-In</span>
              </label>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--radius-md)] text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <div>{error}</div>
          </div>
        )}

        {/* Physical Room Selection */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Physical Room Assignment <span className="text-rose-500">*</span>
          </label>
          <Select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
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
              Verifying room inventory availability...
            </p>
          )}
        </div>

        {/* Guest Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Adults</label>
            <Input
              type="number"
              min={1}
              value={adults}
              onChange={(e) => setAdults(parseInt(e.target.value, 10) || 1)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Children</label>
            <Input
              type="number"
              min={0}
              value={children}
              onChange={(e) => setChildren(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>

        {/* Check-In Notes */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Front Desk Notes / Key Card ID (Optional)
          </label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. ID verified, Issued Keycard #204, Guest requested extra towels..."
          />
        </div>

        {/* Invariant Info Notice */}
        <div className="text-[11px] text-[var(--foreground-subtle)] p-2.5 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] flex items-center gap-2">
          <UserCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span>Completing check-in will immediately set the room status to <strong>OCCUPIED</strong> and record official arrival.</span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting || loadingRooms || (isEarly && !authorizeEarly)}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? "Processing..." : "Complete Check-In"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
