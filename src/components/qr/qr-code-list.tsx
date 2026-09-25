"use client";

import * as React from "react";
import { 
  QrCode, 
  RotateCw, 
  PowerOff, 
  Printer, 
  BedDouble, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Search,
  Plus,
  Loader2
} from "lucide-react";
import { GuestQrCode } from "@/lib/guest-portal/types";
import { rotateGuestQrCodeAction, deactivateGuestQrCodeAction } from "@/lib/guest-portal/actions";
import { PrintQrModal } from "./print-qr-modal";

interface QrCodeListProps {
  qrCodes: GuestQrCode[];
  propertyId: string;
  propertyName?: string;
  onOpenCreate: () => void;
}

export function QrCodeList({
  qrCodes,
  propertyId,
  propertyName,
  onOpenCreate,
}: QrCodeListProps) {
  const [filterType, setFilterType] = React.useState<string>("ALL");
  const [search, setSearch] = React.useState("");
  const [rotatingId, setRotatingId] = React.useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = React.useState<string | null>(null);
  
  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = React.useState(false);
  const [selectedQrForPrint, setSelectedQrForPrint] = React.useState<GuestQrCode | null>(null);
  const [freshRawToken, setFreshRawToken] = React.useState<string | null>(null);

  const filteredQrs = qrCodes.filter((qr) => {
    if (filterType !== "ALL" && qr.qr_type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = qr.name.toLowerCase().includes(q);
      const matchRoom = qr.room?.room_number.toLowerCase().includes(q);
      return matchName || matchRoom;
    }
    return true;
  });

  const handleRotate = async (qr: GuestQrCode) => {
    if (!confirm(`Rotate security token for "${qr.name}"? The previous QR code will immediately become invalid.`)) {
      return;
    }

    setRotatingId(qr.id);
    try {
      const res = await rotateGuestQrCodeAction(qr.id, propertyId);
      if (res.success && res.qrCode && res.rawToken) {
        setSelectedQrForPrint(res.qrCode);
        setFreshRawToken(res.rawToken);
        setPrintModalOpen(true);
      } else {
        alert(res.error || "Failed to rotate QR code.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
      alert(msg);
    } finally {
      setRotatingId(null);
    }
  };

  const handleDeactivate = async (qr: GuestQrCode) => {
    if (!confirm(`Deactivate QR code "${qr.name}"? Guests will no longer be able to scan this access point.`)) {
      return;
    }

    setDeactivatingId(qr.id);
    try {
      const res = await deactivateGuestQrCodeAction(qr.id, propertyId);
      if (!res.success) {
        alert(res.error || "Failed to deactivate QR code.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
      alert(msg);
    } finally {
      setDeactivatingId(null);
    }
  };

  const handlePrint = (qr: GuestQrCode) => {
    setSelectedQrForPrint(qr);
    setFreshRawToken(null);
    setPrintModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search & Filter */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by room or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {["ALL", "ROOM", "HOTEL_GENERAL"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  filterType === t
                    ? "bg-white dark:bg-slate-800 text-amber-500 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t === "ALL" ? "All" : t === "ROOM" ? "Rooms" : "General"}
              </button>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={onOpenCreate}
          className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New QR Code</span>
        </button>
      </div>

      {/* QR Codes Grid */}
      {filteredQrs.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <QrCode className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">No QR access points found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate digital QR access points for your guest rooms and public hotel directory.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQrs.map((qr) => (
            <div
              key={qr.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    qr.qr_type === "ROOM"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-blue-500/10 text-blue-500"
                  }`}>
                    {qr.qr_type === "ROOM" ? <BedDouble className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{qr.name}</h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {qr.qr_type === "ROOM" ? `Room ${qr.room?.room_number || ""}` : "Public Directory"}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  qr.is_active
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-rose-500/10 text-rose-500"
                }`}>
                  {qr.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {qr.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Token Digest Security Banner */}
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>Digest: {qr.token_hash.slice(0, 16)}...</span>
                <span>SHA-256 Hashed</span>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handlePrint(qr)}
                  className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-500" />
                  <span>Print</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleRotate(qr)}
                    disabled={rotatingId === qr.id}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Rotate Security Token"
                  >
                    {rotatingId === qr.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCw className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {qr.is_active && (
                    <button
                      onClick={() => handleDeactivate(qr)}
                      disabled={deactivatingId === qr.id}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Deactivate QR Code"
                    >
                      {deactivatingId === qr.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PowerOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Print Modal */}
      <PrintQrModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        qrCode={selectedQrForPrint}
        rawToken={freshRawToken}
        propertyName={propertyName}
      />
    </div>
  );
}
