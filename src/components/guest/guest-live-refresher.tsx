"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * GuestLiveRefresher — instantaneous live updates for guest portal pages.
 * Subscribes directly to Supabase Realtime postgres_changes on restaurant_orders
 * and guest_service_requests, and triggers immediate router.refresh() on any update.
 * Also maintains a smart 4s active tab interval as fallback.
 */
export function GuestLiveRefresher({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();

    // Instant Realtime Channel for guest order & request events
    const channel = supabase
      .channel(`stayhub:guest-live-portal:${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_orders",
        },
        () => {
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_tickets",
        },
        () => {
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guest_service_requests",
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    const refreshIfVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      router.refresh();
    };

    // Relaxed fallback timer (30s default) to avoid main-thread lockups during user interactions
    const timer = setInterval(refreshIfVisible, intervalMs);
    window.addEventListener("online", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      void supabase.removeChannel(channel);
      if (timer) clearInterval(timer);
      window.removeEventListener("online", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router, intervalMs]);

  return null;
}

