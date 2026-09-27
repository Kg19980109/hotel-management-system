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
  private dismissedOrAckedIds: Set<string> = new Set();
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
   * Synthesizes warm, soothing luxury hotel concierge chimes using pure sine waves
   * with soft exponential decay and harmonic overtones (Rhodes / Bell chime timbre).
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
        // Distinct 4-note ascending luxury crystal chime: E5 -> G#5 -> B5 -> E6
        this.playSoothingChimeNotes(ctx, [
          { freq: 659.25, start: now + 0.00, duration: 0.55, vol: 0.28 },
          { freq: 830.61, start: now + 0.14, duration: 0.55, vol: 0.28 },
          { freq: 987.77, start: now + 0.28, duration: 0.65, vol: 0.30 },
          { freq: 1318.51, start: now + 0.42, duration: 1.10, vol: 0.32 },
        ]);
      } else if (priority === "HIGH") {
        // Elegant 3-note ascending hospitality chime: E5 -> G#5 -> B5
        this.playSoothingChimeNotes(ctx, [
          { freq: 659.25, start: now + 0.00, duration: 0.60, vol: 0.25 },
          { freq: 830.61, start: now + 0.16, duration: 0.65, vol: 0.26 },
          { freq: 987.77, start: now + 0.32, duration: 0.95, vol: 0.28 },
        ]);
      } else {
        // Standard gentle 2-note concierge bell: E5 -> B5
        this.playSoothingChimeNotes(ctx, [
          { freq: 659.25, start: now + 0.00, duration: 0.70, vol: 0.24 },
          { freq: 987.77, start: now + 0.20, duration: 1.00, vol: 0.26 },
        ]);
      }
    } catch (err) {
      console.warn("Failed to play audio alert tone:", err);
    }
  }

  /**
   * Generates a warm, harmonic acoustic chime with natural acoustic decay.
   */
  private playSoothingChimeNotes(
    ctx: AudioContext,
    notes: Array<{ freq: number; start: number; duration: number; vol: number }>
  ): void {
    for (const note of notes) {
      // Fundamental pure sine tone
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, note.start);

      // Subtle warm second harmonic (octave) for rich bell warmth (15% mix)
      const harmonicOsc = ctx.createOscillator();
      harmonicOsc.type = "sine";
      harmonicOsc.frequency.setValueAtTime(note.freq * 2, note.start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, note.start);
      // Gentle, pleasant attack (20ms) - avoids clicking/startling
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, note.vol), note.start + 0.025);
      // Warm, natural exponential decay (reverberant acoustic chime)
      gain.gain.exponentialRampToValueAtTime(0.0001, note.start + note.duration);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.0001, note.start);
      harmonicGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, note.vol * 0.15), note.start + 0.02);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, note.start + note.duration * 0.7);

      osc.connect(gain);
      harmonicOsc.connect(harmonicGain);
      gain.connect(ctx.destination);
      harmonicGain.connect(ctx.destination);

      osc.start(note.start);
      osc.stop(note.start + note.duration);
      harmonicOsc.start(note.start);
      harmonicOsc.stop(note.start + note.duration);
    }
  }

  public playTestSound(): void {
    void this.unlockAudio().then(() => {
      this.playTone("NORMAL");
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
    // If user already acknowledged or dismissed this request in this session, skip re-adding
    if (this.dismissedOrAckedIds.has(alert.id)) {
      return;
    }

    const existing = this.alerts.get(alert.id);
    if (existing) {
      // If status changed to ACKNOWLEDGED, COMPLETED, or CANCELLED, remove from unacknowledged alert queue
      if (
        alert.status === "PREPARING" ||
        alert.status === "IN_PROGRESS" ||
        alert.status === "READY" ||
        alert.status === "SERVED" ||
        alert.status === "COMPLETED" ||
        alert.status === "CANCELLED" ||
        alert.status === "REJECTED" ||
        alert.status === "ACKNOWLEDGED" ||
        alert.status === "ASSIGNED"
      ) {
        this.removeAlert(alert.id, true);
        return;
      }
      // Otherwise update fields
      this.alerts.set(alert.id, { ...existing, ...alert });
    } else {
      // Only unacknowledged/new requests enter the buzzer alert queue
      if (
        alert.status === "SUBMITTED" ||
        alert.status === "CONFIRMED" ||
        alert.status === "OPEN" ||
        alert.status === "PENDING" ||
        alert.status === "NEW"
      ) {
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
  public removeAlert(id: string, isDismissedOrAcked = true): void {
    if (isDismissedOrAcked) {
      this.dismissedOrAckedIds.add(id);
    }
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
    this.dismissedOrAckedIds.clear();
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
    let intervalMs = 12000; // Normal repeat: gentle chime every 12s
    if (priority === "URGENT") intervalMs = 6000; // Urgent repeat: 6s
    else if (priority === "HIGH") intervalMs = 8500; // High repeat: 8.5s

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
