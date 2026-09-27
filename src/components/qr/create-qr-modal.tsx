"use client";

import * as React from "react";
import { X, QrCode, Building2, BedDouble, AlertCircle, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { QrType, GuestQrCode } from "@/lib/guest-portal/types";
import { createGuestQrCodeAction } from "@/lib/guest-portal/actions";
import { Button } from "@/components/ui/button";

interface RoomOption {
  id: string;
  room_number: string;
  room_type_name?: string;
}

interface CreateQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  rooms: RoomOption[];
  onCreated: (qrCode: GuestQrCode, rawToken: string) => void;
}

export function CreateQrModal({
  isOpen,
  onClose,
  propertyId,
  rooms,
  onCreated,
}: CreateQrModalProps) {
  const [qrType, setQrType] = React.useState<QrType>("ROOM");
  const [name, setName] = React.useState("");
  const [roomId, setRoomId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qrType === "ROOM" && !roomId) {
      setError("Please select a room for the Room QR code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedRoom = rooms.find((r) => r.id === roomId);
      const computedName =
        name.trim() ||
        (qrType === "ROOM" ? `Room ${selectedRoom?.room_number || ""}` : "General Hotel QR");

      const res = await createGuestQrCodeAction({
        propertyId,
        qrType,
        name: computedName,
        roomId: qrType === "ROOM" ? roomId : null,
      });

      if (res.success && res.qrCode && res.rawToken) {
        onCreated(res.qrCode, res.rawToken);
        onClose();
      } else {
        setError(res.error || "Failed to create QR code.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-gradient-to-r from-amber-500/10 via-card to-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <QrCode className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Create QR Access Point
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Generate authenticated guest mobile access point
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Access Point Type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setQrType("ROOM")}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  qrType === "ROOM"
                    ? "border-amber-500/80 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "border-border/80 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <BedDouble className="w-5 h-5" />
                <span>In-Room Bedside</span>
              </button>

              <button
                type="button"
                onClick={() => setQrType("HOTEL_GENERAL")}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  qrType === "HOTEL_GENERAL"
                    ? "border-indigo-500/80 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "border-border/80 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>Public / Lobby</span>
              </button>
            </div>
          </div>

          {/* Room Selection (if ROOM) */}
          {qrType === "ROOM" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Assigned Guest Room <span className="text-amber-500">*</span>
              </label>
              <select
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">Select a room...</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} {r.room_type_name ? `(${r.room_type_name})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Any previous QR for this room will be rotated automatically.
              </p>
            </div>
          )}

          {/* Custom Name / Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Card Label <span className="text-muted-foreground text-[10.5px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder={qrType === "ROOM" ? "e.g. Master Bedroom Nightstand QR" : "e.g. Lobby Reception Desk QR"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs h-9 px-4 flex items-center gap-1.5 shadow-md shadow-amber-950/20"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Secure QR</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
