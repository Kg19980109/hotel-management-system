"use client";

import * as React from "react";
import { X, Printer, QrCode, Sparkles, Copy, Check } from "lucide-react";
import { GuestQrCode } from "@/lib/guest-portal/types";

interface PrintQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: GuestQrCode | null;
  rawToken?: string | null;
  propertyName?: string;
}

export function PrintQrModal({
  isOpen,
  onClose,
  qrCode,
  rawToken,
  propertyName = "StayHub Luxury Hotel",
}: PrintQrModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !qrCode) return null;

  // Use rawToken if provided (fresh creation/rotation) or token hash placeholder
  const tokenString = rawToken || qrCode.token_hash.slice(0, 16);
  const portalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/guest/qr/${tokenString}`
    : `/guest/qr/${tokenString}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Printable Guest QR Card
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
          <div
            id="printable-card"
            className="w-full max-w-xs bg-slate-900 text-white rounded-2xl border-2 border-amber-500/30 p-6 text-center space-y-4 shadow-xl relative overflow-hidden"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                {propertyName}
              </span>
              <h4 className="text-lg font-extrabold text-white tracking-tight">
                {qrCode.qr_type === "ROOM" ? `Room ${qrCode.room?.room_number || ""}` : qrCode.name}
              </h4>
            </div>

            {/* Visual QR Representation */}
            <div className="p-4 bg-white rounded-xl mx-auto w-48 h-48 flex flex-col items-center justify-center shadow-inner relative group">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  portalUrl
                )}`}
                alt="Guest Portal QR Code"
                className="w-40 h-40 object-contain"
              />
            </div>

            <div className="space-y-1 text-slate-400">
              <p className="text-xs font-semibold text-slate-200">
                Scan with your phone camera
              </p>
              <p className="text-[10px] text-slate-400">
                Unlock instant digital room dining, housekeeping requests, and hotel services.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyUrl}
            className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied" : "Copy Link"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Card</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
