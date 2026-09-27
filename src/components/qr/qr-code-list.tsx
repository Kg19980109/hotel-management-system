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
  Loader2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { GuestQrCode } from "@/lib/guest-portal/types";
import { rotateGuestQrCodeAction, deactivateGuestQrCodeAction } from "@/lib/guest-portal/actions";
import { PrintQrModal } from "./print-qr-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  
  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = React.useState(false);
  const [selectedQrForPrint, setSelectedQrForPrint] = React.useState<GuestQrCode | null>(null);
  const [freshRawToken, setFreshRawToken] = React.useState<string | null>(null);

  const filteredQrs = qrCodes.filter((qr) => {
    if (filterType !== "ALL" && qr.qr_type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = qr.name.toLowerCase().includes(q);
      const matchRoom = qr.room?.room_number?.toLowerCase().includes(q);
      return matchName || matchRoom;
    }
    return true;
  });

  const roomCount = qrCodes.filter((q) => q.qr_type === "ROOM").length;
  const generalCount = qrCodes.filter((q) => q.qr_type === "HOTEL_GENERAL").length;

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

  const handleCopyLink = (qr: GuestQrCode) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const portalUrl = qr.room_id
      ? `${origin}/guest/home?property=${propertyId}&room=${qr.room_id}`
      : `${origin}/guest/home?property=${propertyId}`;

    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopiedId(qr.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <Card className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by room or access name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary/50 hover:bg-secondary/80 focus:bg-background border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/60">
            {[
              { key: "ALL", label: "All Points", count: qrCodes.length },
              { key: "ROOM", label: "In-Room", count: roomCount },
              { key: "HOTEL_GENERAL", label: "General", count: generalCount },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterType === tab.key
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    filterType === tab.key
                      ? "bg-primary/10 text-primary font-black"
                      : "bg-black/5 dark:bg-white/10 text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <Button
          onClick={onOpenCreate}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs h-9.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
          <span>New QR Access Point</span>
        </Button>
      </Card>

      {/* QR Codes Grid */}
      {filteredQrs.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/60 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20 shadow-xs">
            <QrCode className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-foreground">No QR access points found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Generate digital QR access points for your guest rooms and public hotel directory to enable instant mobile room service and requests.
          </p>
          <Button
            onClick={onOpenCreate}
            size="sm"
            className="bg-primary hover:bg-primary-hover text-white text-xs rounded-xl"
          >
            Create First QR Point
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQrs.map((qr) => {
            const isRoom = qr.qr_type === "ROOM";

            return (
              <Card
                key={qr.id}
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card hover:border-amber-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                {/* Top luxury highlight border */}
                <div
                  className={`h-1.5 w-full ${
                    isRoom
                      ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500"
                      : "bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"
                  }`}
                />

                <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                          isRoom
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {isRoom ? <BedDouble className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {qr.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isRoom ? (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              Room {qr.room?.room_number || "Assigned"}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              Public Directory
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold flex items-center gap-1 shrink-0 border ${
                        qr.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {qr.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {qr.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Visual QR Simulation Badge */}
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-border flex items-center justify-center shrink-0 shadow-2xs">
                        <QrCode className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          HASH: {qr.token_hash.slice(0, 14)}...
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span>SHA-256 HMAC Protected</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(qr)}
                      className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-secondary border border-border text-[11px] font-semibold text-foreground flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                      title="Copy guest portal URL"
                    >
                      {copiedId === qr.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-muted-foreground" />
                          <span>URL</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(qr)}
                      className="text-xs font-bold text-foreground hover:text-primary hover:border-primary/40 rounded-xl h-8.5 px-3 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-500" />
                      <span>Print Card</span>
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRotate(qr)}
                        disabled={rotatingId === qr.id}
                        className="p-2 rounded-xl border border-border text-muted-foreground hover:text-amber-500 hover:border-amber-500/30 hover:bg-secondary/80 transition-colors shadow-2xs"
                        title="Rotate Security Token (generates new token)"
                      >
                        {rotatingId === qr.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                        ) : (
                          <RotateCw className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {qr.is_active && (
                        <button
                          onClick={() => handleDeactivate(qr)}
                          disabled={deactivatingId === qr.id}
                          className="p-2 rounded-xl border border-border text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 hover:bg-secondary/80 transition-colors shadow-2xs"
                          title="Deactivate QR Code"
                        >
                          {deactivatingId === qr.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                          ) : (
                            <PowerOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
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
