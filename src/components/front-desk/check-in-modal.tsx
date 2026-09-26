"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { checkInStayAction } from "@/lib/front-desk/actions";
import { getAvailableRooms } from "@/lib/bookings/queries";
import { createClient } from "@/lib/supabase/client";
import type { ArrivalRecord } from "@/lib/front-desk/types";
import { AlertCircle, CheckCircle2, UserCheck, AlertTriangle, BedDouble, Calendar } from "lucide-react";

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

  const initials = arrival.guestName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "G";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Front Desk Check-In"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Guest Identity & Booking Summary Card */}
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold flex items-center justify-center shrink-0 border border-[var(--primary)]/20">
                {initials}
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--foreground)]">{arrival.guestName}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[10.5px] font-bold text-[var(--primary)] bg-[var(--primary-subtle)] px-1.5 py-0.2 rounded border border-[var(--primary)]/20">
                    {arrival.confirmationNumber}
                  </span>
                  <span className="text-[11px] text-[var(--foreground-muted)] capitalize">
                    via {arrival.bookingSource.toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] text-xs">
            <div>
              <span className="text-[10.5px] text-[var(--foreground-muted)] block font-medium">Category</span>
              <span className="font-semibold text-[var(--foreground)] flex items-center gap-1 mt-0.5">
                <BedDouble className="h-3.5 w-3.5 text-[var(--primary)]" />
                {arrival.roomTypeName} ({arrival.roomTypeCode})
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-[var(--foreground-muted)] block font-medium">Stay Window</span>
              <span className="font-semibold text-[var(--foreground)] flex items-center gap-1 mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-[var(--foreground-subtle)]" />
                {arrival.checkInDate} → {arrival.checkOutDate} ({arrival.nights}n)
              </span>
            </div>
          </div>
        </div>

        {/* Early Check-In Notice */}
        {isEarly && (
          <div className="p-3 bg-[var(--warning-light)] border border-[var(--warning)]/30 rounded-[var(--radius-md)] text-[var(--warning-foreground)] text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-[var(--warning)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">Early Arrival Override</div>
              <p className="text-[11px]">
                Scheduled check-in date is <strong>{arrival.checkInDate}</strong>. Confirming check-in today initiates occupancy immediately.
              </p>
              <label className="flex items-center gap-2 pt-1 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorizeEarly}
                  onChange={(e) => setAuthorizeEarly(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span>Authorize Early Check-In</span>
              </label>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger)]/30 rounded-[var(--radius-md)] text-[var(--danger-foreground)] text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-[var(--danger)]" />
            <div>{error}</div>
          </div>
        )}

        {/* Physical Room Selection */}
        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            Physical Room Assignment <span className="text-[var(--danger)]">*</span>
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
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Adults</label>
            <Input
              type="number"
              min={1}
              value={adults}
              onChange={(e) => setAdults(parseInt(e.target.value, 10) || 1)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Children</label>
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
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
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
        <div className="text-[11px] text-[var(--foreground-muted)] p-2.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-sm)] flex items-center gap-2">
          <UserCheck className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
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
            className="gap-1.5 shadow-md"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? "Processing..." : "Complete Check-In"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
