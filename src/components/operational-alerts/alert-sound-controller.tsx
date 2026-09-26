"use client";

// ============================================================
// STAYHUB ALERT SOUND & CONNECTION CONTROLLER
// Compact widget for persistent topbar status & audio controls
// ============================================================

import * as React from "react";
import { Volume2, VolumeX, Bell, RefreshCw } from "lucide-react";
import { useOperationalAlerts } from "./operational-alert-provider";
import { operationalAlertManager } from "@/lib/alerts/operational-alert-manager";

export function AlertSoundController() {
  const {
    alerts,
    isBuzzing,
    connectionStatus,
    soundEnabled,
    audioUnlocked,
    setSoundEnabled,
    unlockAudio,
    setIsModalMinimized,
  } = useOperationalAlerts();

  return (
    <div className="relative flex items-center gap-2">
      {/* 1. Connection Status Dot / Badge */}
      {connectionStatus === "RECONNECTING" && (
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          <span>Syncing...</span>
        </span>
      )}

      {/* 2. Unacknowledged Alerts Count Button */}
      {alerts.length > 0 && (
        <button
          onClick={() => setIsModalMinimized(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            isBuzzing
              ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30"
              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          }`}
          title="Click to view unacknowledged requests"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{alerts.length} Pending</span>
        </button>
      )}

      {/* 3. Audio Mute / Sound Settings Toggle */}
      <button
        onClick={() => {
          if (!audioUnlocked) {
            void unlockAudio();
          }
          setSoundEnabled(!soundEnabled);
        }}
        title={soundEnabled ? "Audible alerts ON (Click to mute)" : "Audible alerts MUTED (Click to enable)"}
        className={`p-2 rounded-xl transition border ${
          soundEnabled
            ? "bg-card text-foreground hover:bg-muted border-border"
            : "bg-muted text-muted-foreground border-transparent"
        }`}
      >
        {soundEnabled ? (
          <Volume2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <VolumeX className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* 4. Test Emergency Buzzer Button */}
      <button
        onClick={() => {
          void unlockAudio();
          operationalAlertManager.playTestSound();
        }}
        title="Test Emergency Siren Buzzer"
        className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
      >
        <span>Test Siren</span>
      </button>
    </div>
  );
}
