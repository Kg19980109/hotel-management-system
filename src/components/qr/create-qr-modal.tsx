"use client";

import * as React from "react";
import { X, QrCode, Building2, BedDouble, AlertCircle, Loader2 } from "lucide-react";
import { QrType, GuestQrCode } from "@/lib/guest-portal/types";
import { createGuestQrCodeAction } from "@/lib/guest-portal/actions";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Create QR Access Point
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Access Point Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQrType("ROOM")}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  qrType === "ROOM"
                    ? "border-amber-500 bg-amber-500/10 text-amber-500 dark:text-amber-400"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <BedDouble className="w-4 h-4" />
                <span>Room In-Stay</span>
              </button>

              <button
                type="button"
                onClick={() => setQrType("HOTEL_GENERAL")}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  qrType === "HOTEL_GENERAL"
                    ? "border-amber-500 bg-amber-500/10 text-amber-500 dark:text-amber-400"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Hotel General</span>
              </button>
            </div>
          </div>

          {/* Room Selection (if ROOM) */}
          {qrType === "ROOM" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assigned Room <span className="text-amber-500">*</span>
              </label>
              <select
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="">Select a room...</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} {r.room_type_name ? `(${r.room_type_name})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Any existing active QR for this room will be automatically rotated.
              </p>
            </div>
          )}

          {/* Custom Name / Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Access Point Label <span className="text-slate-400 text-[10px]">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder={qrType === "ROOM" ? "e.g. Master Bedroom QR" : "e.g. Main Lobby Reception QR"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Generate Secure QR</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
