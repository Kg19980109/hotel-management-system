// ============================================================
// STAYHUB OPERATIONAL ALERT & BUZZER MANAGER
// Single-instance browser audio synthesizer & alert queue manager
// ============================================================

export type AlertPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface OperationalAlert {
  id: string; // request_id or order_id
  type: "SERVICE_REQUEST" | "FOOD_ORDER";
  category: string;
  department: string;
  roomNumber: string;
  guestName: string;
  title: string;
  description?: string | null;
  priority: AlertPriority;
  receivedAt: number; // timestamp in ms
  propertyId: string;
  status: string;
}

export type AlertStateListener = (alerts: OperationalAlert[], isBuzzing: boolean) => void;

class OperationalAlertManager {
  private alerts: Map<string, OperationalAlert> = new Map();
  private audioCtx: AudioContext | null = null;
  private isBuzzing = false;
  private buzzerTimer: NodeJS.Timeout | null = null;
  private soundEnabled = false;
  private listeners: Set<AlertStateListener> = new Set();
  private isBrowser = typeof window !== "undefined";

  constructor() {
    if (this.isBrowser) {
      const stored = localStorage.getItem("stayhub_sound_alerts_enabled");
      // Default to enabled on staff devices, will unlock on first user gesture
      this.soundEnabled = stored !== null ? stored === "true" : true;
    }
  }

  // --- AUDIO SYNTHESIS & PERMISSION CONTROLS ---

  private getAudioContext(): AudioContext | null {
    if (!this.isBrowser) return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public isAudioUnlocked(): boolean {
    if (!this.isBrowser) return false;
    return !!this.audioCtx && this.audioCtx.state === "running";
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (this.isBrowser) {
      localStorage.setItem("stayhub_sound_alerts_enabled", enabled ? "true" : "false");
    }
    if (enabled) {
      void this.unlockAudio();
    } else {
      this.stopBuzzer();
    }
    this.notifyListeners();
  }

  public async unlockAudio(): Promise<boolean> {
    if (!this.isBrowser) return false;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return false;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      return ctx.state === "running";
    } catch (e) {
      console.warn("Could not unlock audio context:", e);
      return false;
    }
  }

  /**
   * Synthesizes loud, unmistakable emergency buzzer and alert tones using
   * multi-harmonic dual oscillators (sawtooth + square) with high gain.
   */
  public playTone(priority: AlertPriority = "NORMAL"): void {
    if (!this.soundEnabled || !this.isBrowser) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      if (ctx.state !== "running") return;

      const now = ctx.currentTime;

      if (priority === "URGENT") {
        // High-urgency piercing siren buzzer: 4 rapid alternating bursts
        this.playEmergencyBuzzerPulses(ctx, [
          { freq1: 950, freq2: 1350, start: now, duration: 0.16, vol: 0.95 },
          { freq1: 1350, freq2: 950, start: now + 0.20, duration: 0.16, vol: 0.95 },
          { freq1: 950, freq2: 1350, start: now + 0.40, duration: 0.16, vol: 0.95 },
          { freq1: 1400, freq2: 1000, start: now + 0.60, duration: 0.30, vol: 1.0 },
        ]);
      } else if (priority === "HIGH") {
        // High alert: 3 loud industrial buzzer bursts
        this.playEmergencyBuzzerPulses(ctx, [
          { freq1: 880, freq2: 1180, start: now, duration: 0.18, vol: 0.9 },
          { freq1: 880, freq2: 1180, start: now + 0.24, duration: 0.18, vol: 0.9 },
          { freq1: 880, freq2: 1250, start: now + 0.48, duration: 0.28, vol: 0.95 },
        ]);
      } else {
        // Normal / Standard: 2 solid emergency buzzer pulses (commands immediate attention)
        this.playEmergencyBuzzerPulses(ctx, [
          { freq1: 820, freq2: 1100, start: now, duration: 0.22, vol: 0.85 },
          { freq1: 820, freq2: 1100, start: now + 0.30, duration: 0.32, vol: 0.9 },
        ]);
      }
    } catch (err) {
      console.warn("Failed to play audio alert tone:", err);
    }
  }

  /**
   * Plays dual-oscillator piercing acoustic pulses (sawtooth + square) that cut through ambient noise.
   */
  private playEmergencyBuzzerPulses(
    ctx: AudioContext,
    pulses: Array<{ freq1: number; freq2: number; start: number; duration: number; vol: number }>
  ): void {
    for (const pulse of pulses) {
      // Primary cutting tone (sawtooth)
      const osc1 = ctx.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(pulse.freq1, pulse.start);

      // Discordant overtone (square) for alarm annunciator timbre
      const osc2 = ctx.createOscillator();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(pulse.freq2, pulse.start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, pulse.start);
      // Punchy attack
      gain.gain.linearRampToValueAtTime(pulse.vol, pulse.start + 0.015);
      // Sustained plateau for volume presence
      gain.gain.setValueAtTime(pulse.vol, pulse.start + pulse.duration - 0.03);
      // Clean cutoff
      gain.gain.linearRampToValueAtTime(0.001, pulse.start + pulse.duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(pulse.start);
      osc1.stop(pulse.start + pulse.duration);
      osc2.start(pulse.start);
      osc2.stop(pulse.start + pulse.duration);
    }
  }

  public playTestSound(): void {
    void this.unlockAudio().then(() => {
      this.playTone("URGENT");
    });
  }

  // --- ALERT QUEUE & BUZZER LOOP ---

  public getActiveAlerts(): OperationalAlert[] {
    return Array.from(this.alerts.values()).sort((a, b) => b.receivedAt - a.receivedAt);
  }

  public getUnacknowledgedCount(): number {
    return this.alerts.size;
  }

  public getHighestPriority(): AlertPriority {
    const list = this.getActiveAlerts();
    if (list.some((a) => a.priority === "URGENT")) return "URGENT";
    if (list.some((a) => a.priority === "HIGH")) return "HIGH";
    if (list.some((a) => a.priority === "NORMAL")) return "NORMAL";
    return "LOW";
  }

  /**
   * Registers a new operational request alert or updates an existing one.
   * Deduplicates by alert.id (request_id / order_id).
   */
  public addOrUpdateAlert(alert: OperationalAlert): void {
    const existing = this.alerts.get(alert.id);
    if (existing) {
      // If status changed to ACKNOWLEDGED, COMPLETED, or CANCELLED, remove from unacknowledged alert queue
      if (
        alert.status === "ACKNOWLEDGED" ||
        alert.status === "ASSIGNED" ||
        alert.status === "IN_PROGRESS" ||
        alert.status === "COMPLETED" ||
        alert.status === "CANCELLED" ||
        alert.status === "REJECTED"
      ) {
        this.removeAlert(alert.id);
        return;
      }
      // Otherwise update fields
      this.alerts.set(alert.id, { ...existing, ...alert });
    } else {
      // Only unacknowledged/new requests enter the buzzer alert queue
      if (alert.status === "SUBMITTED" || alert.status === "CONFIRMED" || alert.status === "NEW") {
        this.alerts.set(alert.id, alert);
        this.startBuzzerLoop();
      }
    }
    this.notifyListeners();
  }

  /**
   * Removes an alert by request_id (e.g. When acknowledged or completed).
   * If no unacknowledged alerts remain, stops the buzzer immediately.
   */
  public removeAlert(id: string): void {
    if (this.alerts.has(id)) {
      this.alerts.delete(id);
      if (this.alerts.size === 0) {
        this.stopBuzzer();
      }
      this.notifyListeners();
    }
  }

  /**
   * Clears all alerts for property/logout.
   */
  public clearAll(): void {
    this.alerts.clear();
    this.stopBuzzer();
    this.notifyListeners();
  }

  private startBuzzerLoop(): void {
    if (this.isBuzzing) return;
    this.isBuzzing = true;

    // Play immediately
    const priority = this.getHighestPriority();
    this.playTone(priority);

    // Schedule repeating buzzer based on priority
    this.scheduleNextBuzzer();
  }

  private scheduleNextBuzzer(): void {
    if (!this.isBuzzing || this.alerts.size === 0) {
      this.stopBuzzer();
      return;
    }

    const priority = this.getHighestPriority();
    let intervalMs = 3200; // Normal repeat: 3.2s
    if (priority === "URGENT") intervalMs = 1800; // Urgent repeat: 1.8s
    else if (priority === "HIGH") intervalMs = 2400; // High repeat: 2.4s

    this.buzzerTimer = setTimeout(() => {
      if (this.isBuzzing && this.alerts.size > 0) {
        this.playTone(this.getHighestPriority());
        this.scheduleNextBuzzer();
      } else {
        this.stopBuzzer();
      }
    }, intervalMs);
  }

  public stopBuzzer(): void {
    this.isBuzzing = false;
    if (this.buzzerTimer) {
      clearTimeout(this.buzzerTimer);
      this.buzzerTimer = null;
    }
    this.notifyListeners();
  }

  // --- SUBSCRIBER NOTIFICATIONS ---

  public subscribe(listener: AlertStateListener): () => void {
    this.listeners.add(listener);
    // Immediate callback with current state
    listener(this.getActiveAlerts(), this.isBuzzing);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const list = this.getActiveAlerts();
    for (const listener of this.listeners) {
      try {
        listener(list, this.isBuzzing);
      } catch (e) {
        console.error("Alert state listener error:", e);
      }
    }
  }
}

// Global Singleton Export
export const operationalAlertManager = new OperationalAlertManager();
