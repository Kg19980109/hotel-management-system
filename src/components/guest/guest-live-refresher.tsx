"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * GuestLiveRefresher — secure live updates for guest list pages.
 * Guest session cookie is httpOnly, and RLS blocks anon realtime on
 * guest_service_requests / restaurant_orders, so direct realtime subscriptions
 * silently never fire for guests. Re-running the server component via
 * router.refresh() re-validates the session cookie + RPC server-side.
 * Polls every 12s only when tab is visible to save mobile battery.
 */
export function GuestLiveRefresher({ intervalMs = 12000 }: { intervalMs?: number }) {
  const router = useRouter();

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    };

    timer = setInterval(refreshIfVisible, intervalMs);
    window.addEventListener("online", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener("online", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router, intervalMs]);

  return null;
}
