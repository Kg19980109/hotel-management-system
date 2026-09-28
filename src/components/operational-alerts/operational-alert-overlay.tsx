"use client";

// ============================================================
// STAYHUB OPERATIONAL ALERT OVERLAY
// High-priority modal & floating queue for incoming guest requests
// ============================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Volume2,
  VolumeX,
  ArrowRight,
  Sparkles,
  Wrench,
  Utensils,
  BedDouble,
  ChevronRight,
  ChevronLeft,
  Minimize2,
  Maximize2,
  X,
  CheckCircle2,
} from "lucide-react";
import { useOperationalAlerts } from "./operational-alert-provider";
import { getDepartmentQueueHref } from "@/lib/alerts/routing";

export function OperationalAlertOverlay() {
  const router = useRouter();
  const {
    alerts,
    isBuzzing,
    soundEnabled,
    audioUnlocked,
    setSoundEnabled,
    unlockAudio,
    acknowledgeAlert,
    isModalMinimized,
    setIsModalMinimized,
  } = useOperationalAlerts();

  const [rawIndex, setRawIndex] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(0);

  // Keep index safely within bounds
  const currentIndex = Math.min(rawIndex, Math.max(0, alerts.length - 1));
  const currentAlert = alerts[currentIndex] || null;

  // Live timer tick for elapsed seconds
  React.useEffect(() => {
    if (!currentAlert) return;
    const updateElapsed = () => {
      const sec = Math.floor((Date.now() - currentAlert.receivedAt) / 1000);
      setElapsedSeconds(Math.max(0, sec));
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [currentAlert]);

  if (!alerts.length || !currentAlert) {
    return null;
  }

  const isFoodOrder =
    currentAlert.type === "FOOD_ORDER" ||
    currentAlert.category === "ROOM_SERVICE" ||
    currentAlert.category === "FOOD" ||
    currentAlert.category === "DINING";

  const handleAccept = async (andNavigate = false) => {
    if (!currentAlert) return;
    const targetAlert = currentAlert;
    setIsSubmitting(true);
    try {
      setIsModalMinimized(true);
      await acknowledgeAlert(targetAlert.id);
      if (andNavigate) {
        const href = getDepartmentQueueHref(targetAlert.category, targetAlert.id);
        router.push(href);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleView = () => {
    if (!currentAlert) return;
    const href = getDepartmentQueueHref(currentAlert.category, currentAlert.id);
    setIsModalMinimized(true);
    router.push(href);
  };

  const formatElapsed = (sec: number) => {
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${min}m ${rem}s ago`;
  };

  const isUrgent = currentAlert.priority === "URGENT";
  const isHigh = currentAlert.priority === "HIGH";

  // Category Icon
  const getCategoryIcon = (cat: string) => {
    const c = cat.toUpperCase();
    if (c === "HOUSEKEEPING" || c === "LAUNDRY") return <Sparkles className="w-5 h-5 text-emerald-400" />;
    if (c === "MAINTENANCE") return <Wrench className="w-5 h-5 text-blue-400" />;
    if (c === "ROOM_SERVICE" || c === "FOOD" || c === "DINING") return <Utensils className="w-5 h-5 text-amber-400" />;
    return <BedDouble className="w-5 h-5 text-amber-400" />;
  };

  // 1. MINIMIZED FLOATING CORNER BADGE
  if (isModalMinimized) {
    return (
      <aside aria-label="Operational Alert Badge" className="fixed bottom-6 right-6 z-50 animate-bounce">
        <button
          onClick={() => setIsModalMinimized(false)}
          className={`flex items-center gap-3.5 px-5 py-3.5 rounded-2xl shadow-2xl border transition-all ${
            isUrgent
              ? "bg-[#1A0A0E] text-white border-rose-500/80 ring-4 ring-rose-500/20 shadow-rose-950/60"
              : isHigh
              ? "bg-[#181206] text-white border-[#D4AF37]/80 ring-4 ring-[#D4AF37]/20 shadow-amber-950/60"
              : "bg-[#08111F] text-white border-white/20 shadow-black/60"
          }`}
        >
          <div className="relative">
            <div className={`p-2 rounded-xl ${isUrgent ? "bg-rose-500/20" : isHigh ? "bg-[#D4AF37]/20" : "bg-primary/20"}`}>
              <BellRing className={`w-5 h-5 ${isBuzzing ? "text-[#E5C158] animate-spin" : isUrgent ? "text-rose-400" : "text-[#E5C158]"}`} />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 ring-2 ring-black"></span>
            </span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-wider text-white">
                {alerts.length} New {isFoodOrder ? "Food Order" : "Request"}{alerts.length > 1 ? "s" : ""}
              </p>
            </div>
            <p className="text-[11px] text-slate-300 font-mono mt-0.5">
              {currentAlert.roomNumber.startsWith("Table") ? currentAlert.roomNumber : `Room ${currentAlert.roomNumber}`} • Expand Alert
            </p>
          </div>
          <Maximize2 className="w-4 h-4 text-slate-400 ml-1.5" />
        </button>
      </aside>
    );
  }

  // 2. FULL PROMINENT ALERT MODAL / OVERLAY
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="operational-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-lg rounded-3xl overflow-hidden border shadow-2xl transition-all relative ${
          isUrgent
            ? "border-rose-500/60 bg-gradient-to-b from-[#1C0B12] via-[#0A101D] to-[#050B14] ring-2 ring-rose-500/30 shadow-rose-950/50"
            : isHigh
            ? "border-[#D4AF37]/60 bg-gradient-to-b from-[#1C1608] via-[#0A101D] to-[#050B14] ring-2 ring-[#D4AF37]/30 shadow-amber-950/50"
            : "border-white/20 bg-gradient-to-b from-[#08111F] via-[#0D172E] to-[#050B14] shadow-black/80"
        }`}
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="relative px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isUrgent
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                  : isHigh
                  ? "bg-[#D4AF37]/20 text-[#E5C158] border-[#D4AF37]/40"
                  : "bg-primary/20 text-primary border-primary/30"
              }`}
            >
              <BellRing className={`w-5 h-5 ${isBuzzing ? "animate-bounce" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white" id="operational-alert-title">
                  {isFoodOrder ? "New In-Room Food Order" : "Operational Command Alert"}
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isUrgent
                      ? "bg-rose-600 text-white animate-pulse shadow-sm shadow-rose-900"
                      : isHigh
                      ? "bg-[#D4AF37] text-slate-950 font-bold shadow-sm shadow-amber-900"
                      : "bg-slate-800 text-slate-200 border border-white/10"
                  }`}
                >
                  {isFoodOrder ? "FOOD LIVE" : currentAlert.priority}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                {currentAlert.department} • Received {formatElapsed(elapsedSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                if (!audioUnlocked) void unlockAudio();
                setSoundEnabled(!soundEnabled);
              }}
              title={soundEnabled ? "Mute buzzer" : "Unmute buzzer"}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Close / Dismiss Alert */}
            <button
              onClick={() => {
                if (currentAlert) {
                  void acknowledgeAlert(currentAlert.id);
                }
                setIsModalMinimized(true);
              }}
              title="Acknowledge & Close"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Emergency Audio Activation Banner */}
        {(!audioUnlocked || !soundEnabled) && (
          <button
            onClick={() => {
              void unlockAudio();
              if (!soundEnabled) setSoundEnabled(true);
            }}
            className="w-full px-4 py-2.5 bg-rose-500/25 hover:bg-rose-500/35 border-b border-rose-500/40 text-rose-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition animate-pulse"
          >
            <Volume2 className="w-4 h-4" />
            <span>⚠️ BROWSER AUDIO MUTED — CLICK TO ACTIVATE EMERGENCY BUZZER</span>
          </button>
        )}

        {/* Multi-Request Queue Pagination */}
        {alerts.length > 1 && (
          <div className="px-6 py-2.5 bg-black/40 border-b border-white/10 flex items-center justify-between text-xs">
            <span className="font-bold text-[#E5C158] flex items-center gap-2 text-[11px] tracking-wide">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              {alerts.length} UNACCEPTED INCOMING QUEUE
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentIndex === 0}
                onClick={() => setRawIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-300 px-1.5">
                {currentIndex + 1} / {alerts.length}
              </span>
              <button
                disabled={currentIndex === alerts.length - 1}
                onClick={() => setRawIndex((prev) => Math.min(alerts.length - 1, prev + 1))}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Alert Body */}
        <div className="p-6 space-y-5 relative">
          {/* Room Number Hero Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-between backdrop-blur-sm shadow-inner">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shadow-md">
                {getCategoryIcon(currentAlert.category)}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {currentAlert.roomNumber.startsWith("Table") ? "Dining Table" : "Guest Room"}
                </p>
                <p className="text-2xl font-black text-white tracking-tight">
                  {currentAlert.roomNumber.startsWith("Table") ? currentAlert.roomNumber.toUpperCase() : `ROOM ${currentAlert.roomNumber}`}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Registered Guest
              </p>
              <p className="text-sm font-bold text-[#E5C158]">
                {currentAlert.guestName}
              </p>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                {isFoodOrder ? "Food Order Items" : "Request Summary"}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10">
                {currentAlert.category}
              </span>
            </div>
            <h3 className="text-xl font-black text-white leading-snug">
              {currentAlert.title}
            </h3>
            {currentAlert.description && (
              <p className="text-xs text-slate-200 leading-relaxed bg-black/40 p-3.5 rounded-xl border border-white/10 font-medium">
                {currentAlert.description}
              </p>
            )}
          </div>

          {/* Browser Audio Warning if Audio Context is Locked */}
          {!audioUnlocked && soundEnabled && (
            <div className="p-3 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-between text-xs text-[#E5C158]">
              <span>🔔 Click to unlock audible buzzer tones for this device</span>
              <button
                onClick={() => void unlockAudio()}
                className="px-3 py-1 rounded-lg bg-[#D4AF37] text-slate-950 font-bold hover:bg-[#E5C158] transition"
              >
                Enable Sound
              </button>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-6 pt-0 flex items-center gap-3 relative">
          <button
            disabled={isSubmitting}
            onClick={() => handleAccept(false)}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:from-[#E5C158] hover:to-[#F3D77B] text-[#08111F] font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#D4AF37]/25 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isFoodOrder ? "Acknowledge & Fire to KDS" : "Acknowledge Request"}</span>
          </button>

          <button
            disabled={isSubmitting}
            onClick={() => handleAccept(true)}
            className="py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/15 flex items-center gap-1.5"
          >
            <span>{isFoodOrder ? "View in KDS" : "View in Queue"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
