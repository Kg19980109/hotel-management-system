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
   * Synthesizes pure harmonic hotel alert tones using Web Audio API oscillators.
   * Completely self-contained, zero external asset downloads, zero network latency.
   */
  public playTone(priority: AlertPriority = "NORMAL"): void {
    if (!this.soundEnabled || !this.isBrowser) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx || ctx.state !== "running") return;

      const now = ctx.currentTime;

      if (priority === "URGENT") {
        // Urgent 3-tone repeating high alarm: 880Hz -> 1174Hz -> 880Hz
        this.playChimeSequence(ctx, [
          { freq: 880, start: now, duration: 0.15, vol: 0.4 },
          { freq: 1174.66, start: now + 0.18, duration: 0.2, vol: 0.5 },
          { freq: 880, start: now + 0.42, duration: 0.25, vol: 0.4 },
        ]);
      } else if (priority === "HIGH") {
        // High alert: 2-tone warning chime: 880Hz -> 659Hz
        this.playChimeSequence(ctx, [
          { freq: 880, start: now, duration: 0.2, vol: 0.35 },
          { freq: 659.25, start: now + 0.25, duration: 0.35, vol: 0.35 },
        ]);
      } else {
        // Normal / Low: Soft attention chime (D5 -> A5): 587Hz -> 880Hz
        this.playChimeSequence(ctx, [
          { freq: 587.33, start: now, duration: 0.22, vol: 0.25 },
          { freq: 880, start: now + 0.25, duration: 0.4, vol: 0.25 },
        ]);
      }
    } catch (err) {
      console.warn("Failed to play audio alert tone:", err);
    }
  }

  private playChimeSequence(
    ctx: AudioContext,
    notes: Array<{ freq: number; start: number; duration: number; vol: number }>
  ): void {
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, note.start);

      // Smooth attack and natural exponential decay
      gain.gain.setValueAtTime(0.0001, note.start);
      gain.gain.linearRampToValueAtTime(note.vol, note.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(note.start);
      osc.stop(note.start + note.duration);
    }
  }

  public playTestSound(): void {
    void this.unlockAudio().then(() => {
      this.playTone("HIGH");
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
    let intervalMs = 7000; // Normal repeat: 7s
    if (priority === "URGENT") intervalMs = 3500; // Urgent repeat: 3.5s
    else if (priority === "HIGH") intervalMs = 5000; // High repeat: 5s

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
