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

  // Use rawToken if provided, then persistent raw_token, fallback to token_hash
  const tokenString = rawToken || qrCode.raw_token || qrCode.token_hash;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-gradient-to-r from-amber-500/10 via-card to-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <QrCode className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Printable Luxury Guest QR Stand
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Bedside card & table-tent guest directory
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

        {/* Printable Card Area */}
        <div className="p-6 bg-secondary/30 flex flex-col items-center justify-center">
          <div
            id="printable-card"
            className="w-full max-w-xs bg-gradient-to-b from-[#0B132B] via-[#091024] to-[#050B18] text-white rounded-3xl border-2 border-amber-500/40 p-6 text-center space-y-4 shadow-2xl relative overflow-hidden ring-1 ring-amber-400/20"
          >
            {/* Top luxury badge */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest text-amber-300">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{propertyName}</span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight mt-1">
                {qrCode.qr_type === "ROOM" ? `Room ${qrCode.room?.room_number || ""}` : qrCode.name}
              </h4>
            </div>

            {/* Visual QR Representation */}
            <div className="p-3.5 bg-white rounded-2xl mx-auto w-48 h-48 flex flex-col items-center justify-center shadow-lg relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  portalUrl
                )}`}
                alt="Guest Portal QR Code"
                className="w-40 h-40 object-contain"
              />
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-bold text-amber-300">
                Point Camera To Scan
              </p>
              <p className="text-[10px] text-slate-400">
                Unlock instant digital room dining, housekeeping requests, and hotel services.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-card border-t border-border/80 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyUrl}
            className="py-2.5 px-3.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary transition flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            <span>{copied ? "Copied Link" : "Copy URL"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/20 transition"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Print Luxury Card</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
