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

  const handleAcknowledge = async () => {
    if (!currentAlert) return;
    setIsSubmitting(true);
    try {
      await acknowledgeAlert(currentAlert.id);
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
    if (c === "ROOM_SERVICE" || c === "FOOD") return <Utensils className="w-5 h-5 text-amber-400" />;
    return <BedDouble className="w-5 h-5 text-amber-400" />;
  };

  // 1. MINIMIZED FLOATING CORNER BADGE
  if (isModalMinimized) {
    return (
      <aside aria-label="Operational Alert Badge" className="fixed bottom-6 right-6 z-50 animate-bounce">
        <button
          onClick={() => setIsModalMinimized(false)}
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border transition-all ${
            isUrgent
              ? "bg-rose-950 text-white border-rose-500 animate-pulse ring-4 ring-rose-500/30"
              : isHigh
              ? "bg-amber-950 text-white border-amber-500 ring-4 ring-amber-500/30"
              : "bg-slate-900 text-white border-slate-700"
          }`}
        >
          <div className="relative">
            <BellRing className={`w-5 h-5 ${isBuzzing ? "text-amber-400 animate-spin" : "text-slate-300"}`} />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          </div>
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-wider">
              {alerts.length} New Request{alerts.length > 1 ? "s" : ""}
            </p>
            <p className="text-[10px] text-slate-300 font-mono">
              Room {currentAlert.roomNumber} • Click to open
            </p>
          </div>
          <Maximize2 className="w-4 h-4 text-slate-400 ml-1" />
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-lg rounded-3xl overflow-hidden border shadow-2xl transition-all ${
          isUrgent
            ? "border-rose-500/60 bg-gradient-to-b from-rose-950/90 via-slate-900 to-slate-950 ring-4 ring-rose-500/30"
            : isHigh
            ? "border-amber-500/50 bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 ring-2 ring-amber-500/20"
            : "border-slate-700/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950"
        }`}
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isUrgent
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : isHigh
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-primary/20 text-primary"
              }`}
            >
              <BellRing className={`w-5 h-5 ${isBuzzing ? "animate-wiggle" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white" id="operational-alert-title">
                  New Operational Alert
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                    isUrgent
                      ? "bg-rose-500 text-white animate-pulse"
                      : isHigh
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {currentAlert.priority}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
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
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Minimize */}
            <button
              onClick={() => setIsModalMinimized(true)}
              title="Minimize alert"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <Minimize2 className="w-4 h-4" />
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
            className="w-full px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border-b border-rose-500/30 text-rose-300 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition animate-pulse"
          >
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>⚠️ BROWSER AUDIO MUTED — CLICK HERE TO ACTIVATE LOUD EMERGENCY BUZZER</span>
          </button>
        )}

        {/* Multi-Request Queue Pagination */}
        {alerts.length > 1 && (
          <div className="px-6 py-2 bg-black/30 border-b border-white/5 flex items-center justify-between text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              {alerts.length} UNACKNOWLEDGED REQUESTS IN QUEUE
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentIndex === 0}
                onClick={() => setRawIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-400 px-1">
                {currentIndex + 1} / {alerts.length}
              </span>
              <button
                disabled={currentIndex === alerts.length - 1}
                onClick={() => setRawIndex((prev) => Math.min(alerts.length - 1, prev + 1))}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Alert Body */}
        <div className="p-6 space-y-5">
          {/* Room Number Hero Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                {getCategoryIcon(currentAlert.category)}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Guest Destination
                </p>
                <p className="text-xl font-black text-white tracking-tight">
                  ROOM {currentAlert.roomNumber}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Guest Name
              </p>
              <p className="text-sm font-bold text-amber-400">
                {currentAlert.guestName}
              </p>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                Request Details
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {currentAlert.category}
              </span>
            </div>
            <h3 className="text-lg font-black text-white leading-snug">
              {currentAlert.title}
            </h3>
            {currentAlert.description && (
              <p className="text-xs text-slate-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                {currentAlert.description}
              </p>
            )}
          </div>

          {/* Browser Audio Warning if Audio Context is Locked */}
          {!audioUnlocked && soundEnabled && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
              <span>🔔 Click to unlock audible buzzer tones for this device</span>
              <button
                onClick={() => void unlockAudio()}
                className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
              >
                Enable Sound
              </button>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-6 pt-0 flex items-center gap-3">
          <button
            disabled={isSubmitting}
            onClick={handleAcknowledge}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>Acknowledge Request</span>
          </button>

          <button
            onClick={handleView}
            className="py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center gap-1.5"
          >
            <span>View Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
