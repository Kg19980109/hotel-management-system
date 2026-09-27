"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  QrCode,
  BedDouble,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  RotateCw,
  PowerOff,
  Printer,
  Loader2,
  Zap,
  AlertCircle,
  Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { GuestQrCode } from "@/lib/guest-portal/types";
import { getGuestQrCodes } from "@/lib/guest-portal/queries";
import {
  createGuestQrCodeAction,
  rotateGuestQrCodeAction,
  deactivateGuestQrCodeAction,
} from "@/lib/guest-portal/actions";
import { PrintQrModal } from "@/components/qr/print-qr-modal";

interface RoomRow {
  id: string;
  room_number: string;
  room_type_name?: string;
  status: string;
  floor_label?: string | null;
}

interface RoomWithQr extends RoomRow {
  qrCode: GuestQrCode | null;
}

export default function RoomQrManagementPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;
  const propertyName = currentProperty?.property_name || "StayHub Hotel";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomsWithQr, setRoomsWithQr] = useState<RoomWithQr[]>([]);

  const [generatingRoomId, setGeneratingRoomId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printQrCode, setPrintQrCode] = useState<GuestQrCode | null>(null);
  const [printRawToken, setPrintRawToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const [roomsRes, qrCodes] = await Promise.all([
        supabase
          .from("rooms")
          .select("id, room_number, room_type:room_type_id(name), status, floor_label, is_active")
          .eq("property_id", propertyId)
          .eq("is_active", true)
          .order("room_number", { ascending: true }),
        getGuestQrCodes(propertyId),
      ]);

      const rooms = ((roomsRes.data || []) as unknown as Array<{
        id: string;
        room_number: string;
        room_type: { name: string } | null;
        status: string;
        floor_label: string | null;
      }>).map((r) => ({
        id: r.id,
        room_number: r.room_number,
        room_type_name: r.room_type?.name,
        status: r.status,
        floor_label: r.floor_label,
      }));

      const qrByRoomId = new Map<string, GuestQrCode>();
      for (const qr of qrCodes) {
        if (qr.room_id && qr.is_active) {
          qrByRoomId.set(qr.room_id, qr);
        }
      }

      setRoomsWithQr(rooms.map((room) => ({ ...room, qrCode: qrByRoomId.get(room.id) || null })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (!authLoading && propertyId) {
      void loadData();
    }
  }, [authLoading, propertyId, loadData]);

  const handleGenerateQr = async (room: RoomRow) => {
    if (!propertyId) return;
    setGeneratingRoomId(room.id);
    try {
      const res = await createGuestQrCodeAction({
        propertyId,
        qrType: "ROOM",
        name: `Room ${room.room_number} In-Room Portal QR`,
        roomId: room.id,
      });
      if (res.success && res.qrCode && res.rawToken) {
        setPrintQrCode(res.qrCode as GuestQrCode);
        setPrintRawToken(res.rawToken);
        setPrintModalOpen(true);
        await loadData();
      } else {
        alert(res.error || "Failed to generate QR code.");
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to generate QR");
    } finally {
      setGeneratingRoomId(null);
    }
  };

  const handleBulkGenerate = async () => {
    if (!propertyId) return;
    const roomsWithoutQr = roomsWithQr.filter((r) => !r.qrCode);
    if (roomsWithoutQr.length === 0) {
      alert("All rooms already have active QR codes.");
      return;
    }
    if (!confirm(`Generate QR codes for ${roomsWithoutQr.length} room(s)?`)) return;
    setBulkGenerating(true);
    let successCount = 0;
    let errorCount = 0;
    for (const room of roomsWithoutQr) {
      try {
        const res = await createGuestQrCodeAction({
          propertyId,
          qrType: "ROOM",
          name: `Room ${room.room_number} In-Room Portal QR`,
          roomId: room.id,
        });
        if (res.success) successCount++;
        else errorCount++;
      } catch { errorCount++; }
    }
    await loadData();
    setBulkGenerating(false);
    alert(`Generated ${successCount} QR code(s).${errorCount > 0 ? ` ${errorCount} failed.` : ""}`);
  };

  const handleRotate = async (room: RoomWithQr) => {
    if (!propertyId || !room.qrCode) return;
    if (!confirm(`Rotate QR token for Room ${room.room_number}? The old QR becomes invalid.`)) return;
    setRotatingId(room.id);
    try {
      const res = await rotateGuestQrCodeAction(room.qrCode.id, propertyId);
      if (res.success && res.qrCode && res.rawToken) {
        setPrintQrCode(res.qrCode as GuestQrCode);
        setPrintRawToken(res.rawToken);
        setPrintModalOpen(true);
        await loadData();
      } else {
        alert(res.error || "Failed to rotate QR.");
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to rotate QR");
    } finally {
      setRotatingId(null);
    }
  };

  const handleDeactivate = async (room: RoomWithQr) => {
    if (!propertyId || !room.qrCode) return;
    if (!confirm(`Deactivate QR for Room ${room.room_number}?`)) return;
    setDeactivatingId(room.id);
    try {
      const res = await deactivateGuestQrCodeAction(room.qrCode.id, propertyId);
      if (!res.success) alert(res.error || "Failed to deactivate QR.");
      else await loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to deactivate QR");
    } finally {
      setDeactivatingId(null);
    }
  };

  const handlePrint = (room: RoomWithQr) => {
    if (!room.qrCode) return;
    setPrintQrCode(room.qrCode);
    setPrintRawToken(null);
    setPrintModalOpen(true);
  };

  const roomsWithQrCount = roomsWithQr.filter((r) => r.qrCode).length;
  const roomsWithoutQrCount = roomsWithQr.filter((r) => !r.qrCode).length;

  if (authLoading || (loading && roomsWithQr.length === 0)) {
    return <LoadingState message="Loading Room QR Management..." />;
  }
  if (error) {
    return <ErrorState title="Failed to Load Rooms" description={error} onRetry={loadData} />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Sub-Navigation Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <a
          href="/qr-services"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-2 shrink-0"
        >
          <span>All Access Points</span>
        </a>
        <a
          href="/qr-services/rooms"
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-sm flex items-center gap-2 shrink-0"
        >
          <span>Room Batch Manager</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10.5px]">
            {roomsWithQr.length} Rooms
          </span>
        </a>
        <a
          href="/qr-services/dining"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-2 shrink-0"
        >
          <span>QR Dining Publisher</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10.5px] font-bold">
            Live Menu
          </span>
        </a>
      </div>

      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl px-6 py-6"
        style={{ background: "linear-gradient(135deg, #0B1528 0%, #091122 60%, #040812 100%)" }}
      >
        <div className="absolute top-0 right-0 w-96 h-40 bg-amber-500/8 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-32 bg-indigo-500/6 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 shrink-0">
              <BedDouble className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Room QR Management
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  All Rooms
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate, manage and print QR codes for every guest room at {propertyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData()}
              disabled={loading}
              className="h-9 px-3 text-xs font-bold border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
              Refresh
            </Button>
            {roomsWithoutQrCount > 0 && (
              <Button
                size="sm"
                onClick={() => void handleBulkGenerate()}
                disabled={bulkGenerating}
                className="h-9 px-4 text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20"
              >
                {bulkGenerating ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-1.5" />
                )}
                Generate All Missing ({roomsWithoutQrCount})
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <BedDouble className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Rooms</p>
              <p className="text-base font-extrabold text-white font-mono">{roomsWithQr.length}</p>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">With QR</p>
              <p className="text-base font-extrabold text-emerald-400 font-mono">{roomsWithQrCount}</p>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Missing QR</p>
              <p className="text-base font-extrabold text-rose-400 font-mono">{roomsWithoutQrCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rooms Table */}
      {roomsWithQr.length === 0 ? (
        <div className="py-20 text-center bg-card rounded-2xl border border-dashed border-border space-y-3">
          <BedDouble className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Rooms Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Add rooms to this property first to manage their QR codes.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            <div className="col-span-2">Room #</div>
            <div className="col-span-3">Type</div>
            <div className="col-span-2">Room Status</div>
            <div className="col-span-2">QR Status</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {roomsWithQr.map((room) => {
              const isGenerating = generatingRoomId === room.id;
              const isRotating = rotatingId === room.id;
              const isDeactivating = deactivatingId === room.id;
              const hasQr = !!room.qrCode;

              return (
                <div
                  key={room.id}
                  className="flex sm:grid sm:grid-cols-12 flex-wrap gap-2 sm:gap-2 px-5 py-4 items-center hover:bg-muted/20 transition-colors"
                >
                  {/* Room Number */}
                  <div className="flex items-center gap-2.5 col-span-2 w-full sm:w-auto">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <BedDouble className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Room {room.room_number}</span>
                  </div>

                  {/* Room Type */}
                  <div className="col-span-3 hidden sm:block">
                    <span className="text-xs text-muted-foreground">
                      {room.room_type_name || "Standard Room"}
                    </span>
                    {room.floor_label && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground/50">
                        · Floor {room.floor_label}
                      </span>
                    )}
                  </div>

                  {/* Room Status */}
                  <div className="col-span-2 hidden sm:block">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        room.status === "AVAILABLE"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : room.status === "OCCUPIED"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  {/* QR Status */}
                  <div className="col-span-2 hidden sm:flex items-center gap-1.5">
                    {hasQr ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-[10px] font-bold text-emerald-500">Active QR</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                        <span className="text-[10px] font-bold text-rose-400">No QR</span>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex items-center justify-end gap-2 w-full sm:w-auto">
                    {hasQr ? (
                      <>
                        <button
                          onClick={() => handlePrint(room)}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
                          title="Print QR"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => void handleRotate(room)}
                          disabled={isRotating}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition disabled:opacity-50"
                          title="Rotate Token"
                        >
                          {isRotating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => void handleDeactivate(room)}
                          disabled={isDeactivating}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition disabled:opacity-50"
                          title="Deactivate QR"
                        >
                          {isDeactivating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PowerOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => void handleGenerateQr(room)}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow transition active:scale-95 disabled:opacity-60"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        Generate QR
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hotel General QR note */}
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Hotel General QR (Lobby / Public)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage hotel-wide general QR codes for walk-in guests in the{" "}
            <a href="/qr-services" className="text-amber-500 font-semibold hover:underline">
              QR Access Points
            </a>{" "}
            main page.
          </p>
        </div>
      </div>

      <PrintQrModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        qrCode={printQrCode}
        rawToken={printRawToken}
        propertyName={propertyName}
      />
    </div>
  );
}
