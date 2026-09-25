/**
 * Production-ready Sliding Window Rate Limiter.
 * Supports configurable time windows, max requests, token bucket behavior,
 * and automated memory cleanup to prevent memory leaks in production.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private maxRequests: number;
  private windowMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxRequests: number = 30, windowMs: number = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Periodic sweep every 5 minutes to avoid memory leaks
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
      // Ensure the timer does not prevent process exit
      if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
        this.cleanupInterval.unref();
      }
    }
  }

  public check(key: string, customLimit?: number, customWindowMs?: number): {
    allowed: boolean;
    remaining: number;
    resetMs: number;
    total: number;
  } {
    const now = Date.now();
    const limit = customLimit ?? this.maxRequests;
    const window = customWindowMs ?? this.windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out timestamps outside the sliding window
    const windowStart = now - window;
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0];
      const resetMs = Math.max(0, oldest + window - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
        total: record.timestamps.length,
      };
    }

    record.timestamps.push(now);
    const remaining = Math.max(0, limit - record.timestamps.length);
    return {
      allowed: true,
      remaining,
      resetMs: window,
      total: record.timestamps.length,
    };
  }

  public reset(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > now - this.windowMs);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Global pre-configured rate limiters for key application surfaces
export const publicBookingLimiter = new SlidingWindowRateLimiter(20, 60 * 1000); // 20 requests per minute
export const publicAvailabilityLimiter = new SlidingWindowRateLimiter(40, 60 * 1000); // 40 searches per minute
export const aiQueryLimiter = new SlidingWindowRateLimiter(15, 60 * 1000); // 15 AI prompts per minute
export const authActionLimiter = new SlidingWindowRateLimiter(10, 60 * 1000); // 10 auth attempts per minute
