"use client";

// ============================================================
// STAYHUB KITCHEN DISPLAY SYSTEM (KDS) — COMMAND CENTER
// Real-time synchronization for QR In-Room Dining & POS Orders
// ============================================================

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChefHat,
  UtensilsCrossed,
  History,
  Layers,
  Store,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Bell,
  Clock,
  Flame,
  CheckCircle2,
  Play,
  Check,
  RotateCcw,
  Sparkles,
  BedDouble,
  ShoppingBag,
  Utensils,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { Restaurant } from "@/lib/restaurant/types";
import {
  KitchenTicket,
  KitchenStation,
  KitchenTicketItem,
  KitchenPriority,
  KitchenTicketStatus,
  KdsKpiSummary,
} from "@/lib/kds/types";
import { getRestaurants } from "@/lib/restaurant/queries";
import {
  getActiveKitchenTickets,
  getKitchenStations,
  getKdsKpis,
  getKitchenTicketHistory,
} from "@/lib/kds/queries";
import {
  startTicketItemAction,
  readyTicketItemAction,
  completeTicketItemAction,
  requeueTicketItemAction,
  remakeTicketItemAction,
  updateTicketPriorityAction,
} from "@/lib/kds/actions";
import { KdsTicketCard } from "@/components/kds/kds-ticket-card";
import { KdsKpiGrid } from "@/components/kds/kds-kpi-grid";
import { RemakeModal } from "@/components/kds/remake-modal";

export default function KitchenKdsPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>("ALL");
  const [statusTab, setStatusTab] = useState<"ALL" | "QUEUED" | "IN_PROGRESS" | "READY" | "HISTORY">("ALL");

  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [historyTickets, setHistoryTickets] = useState<KitchenTicket[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<"ALL" | "COMPLETED" | "CANCELLED">("ALL");
  const [historyDate, setHistoryDate] = useState<string>("");

  const [kpis, setKpis] = useState<KdsKpiSummary>({
    queuedTickets: 0,
    inProgressTickets: 0,
    readyTickets: 0,
    completedTodayTickets: 0,
    delayedTickets: 0,
    unroutedItemsCount: 0,
    remakeCount: 0,
    avgPrepMinutes: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [remakeTargetItem, setRemakeTargetItem] = useState<KitchenTicketItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sound chime helper
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext might be blocked until user gesture
    }
  }, [soundEnabled]);

  // Load Outlets and Initial Data
  const loadInitialOutlets = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const rests = await getRestaurants(propertyId, true);
      setRestaurants(rests);

      if (rests.length > 0) {
        const activeRest = rests[0];
        setSelectedRestaurant(activeRest);
        const [stns, tix, kp] = await Promise.all([
          getKitchenStations(activeRest.id, false),
          getActiveKitchenTickets(propertyId, activeRest.id),
          getKdsKpis(propertyId, activeRest.id),
        ]);
        setStations(stns);
        setTickets(tix);
        setKpis(kp);
      } else {
        setSelectedRestaurant(null);
      }
    } catch (err: unknown) {
      console.error("Failed to load KDS data:", err);
      setError(err instanceof Error ? err.message : "Failed to load kitchen display");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  // Refresh Tickets
  const refreshTickets = useCallback(async (notify = false) => {
    if (!propertyId || !selectedRestaurant) return;
    try {
      const [tix, kp] = await Promise.all([
        getActiveKitchenTickets(
          propertyId,
          selectedRestaurant.id,
          selectedStationId !== "ALL" ? selectedStationId : undefined
        ),
        getKdsKpis(propertyId, selectedRestaurant.id),
      ]);
      setTickets(tix);
      setKpis(kp);
      if (notify) {
        playAlertSound();
      }
    } catch (err) {
      console.error("Error fetching live tickets:", err);
    }
  }, [propertyId, selectedRestaurant, selectedStationId, playAlertSound]);

  // Load Kitchen History Tickets
  const loadHistoryData = useCallback(async () => {
    if (!propertyId || !selectedRestaurant) return;
    try {
      setHistoryLoading(true);
      const res = await getKitchenTicketHistory(propertyId, {
        restaurantId: selectedRestaurant.id,
        status: historyStatus !== "ALL" ? (historyStatus as KitchenTicketStatus) : undefined,
        date: historyDate || undefined,
        search: searchQuery.trim() || undefined,
        limit: 100,
      });
      setHistoryTickets(res.tickets);
    } catch (err) {
      console.error("Failed to load history tickets:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [propertyId, selectedRestaurant, historyStatus, historyDate, searchQuery]);

  useEffect(() => {
    if (statusTab === "HISTORY") {
      void loadHistoryData();
    }
  }, [statusTab, loadHistoryData]);

  useEffect(() => {
    if (!authLoading && propertyId) {
      void loadInitialOutlets();
    }
  }, [authLoading, propertyId, loadInitialOutlets]);

  // Real-time Supabase subscription
  useEffect(() => {
    if (!propertyId || !selectedRestaurant) return;

    const supabase = createClient();

    // Authenticate Realtime WebSocket connection
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    const channelName = `stayhub:kds-live:${propertyId}:${selectedRestaurant.id}:${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_tickets",
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            playAlertSound();
          }
          void refreshTickets();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_ticket_items",
        },
        () => {
          void refreshTickets();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_orders",
          filter: `property_id=eq.${propertyId}`,
        },
        () => {
          void refreshTickets();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshTickets();
    }, 2000);

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [propertyId, selectedRestaurant, refreshTickets, playAlertSound]);

  const handleSelectOutlet = async (restaurantId: string) => {
    const target = restaurants.find((r) => r.id === restaurantId);
    if (!target) return;
    setSelectedRestaurant(target);
    try {
      setLoading(true);
      const [stns, tix, kp] = await Promise.all([
        getKitchenStations(target.id, false),
        getActiveKitchenTickets(propertyId!, target.id),
        getKdsKpis(propertyId!, target.id),
      ]);
      setStations(stns);
      setTickets(tix);
      setKpis(kp);
    } catch (err: unknown) {
      console.error("Failed to change outlet:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Ticket Item Status Handlers with Instant Optimistic UI Reflection
  const handleStartItem = async (itemId: string) => {
    if (!propertyId) return;

    // 1. Optimistic Update (0ms instant UI reflection)
    setTickets((prev) =>
      prev.map((ticket) => {
        const hasItem = ticket.items?.some((i) => i.id === itemId);
        if (!hasItem) return ticket;
        const updatedItems = ticket.items?.map((i) =>
          i.id === itemId ? { ...i, status: "IN_PROGRESS" as const, started_at: new Date().toISOString() } : i
        );
        return {
          ...ticket,
          status: ticket.status === "QUEUED" ? ("IN_PROGRESS" as const) : ticket.status,
          items: updatedItems,
        };
      })
    );

    setIsSubmitting(true);
    try {
      const res = await startTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to start preparation");
        await refreshTickets();
        return;
      }
      void refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
      await refreshTickets();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReadyItem = async (itemId: string) => {
    if (!propertyId) return;

    // 1. Optimistic Update (0ms instant UI reflection)
    setTickets((prev) =>
      prev.map((ticket) => {
        const hasItem = ticket.items?.some((i) => i.id === itemId);
        if (!hasItem) return ticket;
        const updatedItems = ticket.items?.map((i) =>
          i.id === itemId ? { ...i, status: "READY" as const, ready_at: new Date().toISOString() } : i
        );
        const allReadyOrCompleted = updatedItems?.every(
          (i) => i.status === "READY" || i.status === "COMPLETED" || i.status === "CANCELLED"
        );
        return {
          ...ticket,
          status: allReadyOrCompleted ? ("READY" as const) : ticket.status,
          items: updatedItems,
        };
      })
    );

    setIsSubmitting(true);
    try {
      const res = await readyTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to mark item ready");
        await refreshTickets();
        return;
      }
      void refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
      await refreshTickets();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    if (!propertyId) return;

    // 1. Optimistic Update (0ms instant UI reflection)
    setTickets((prev) =>
      prev.map((ticket) => {
        const hasItem = ticket.items?.some((i) => i.id === itemId);
        if (!hasItem) return ticket;
        const updatedItems = ticket.items?.map((i) =>
          i.id === itemId ? { ...i, status: "COMPLETED" as const, completed_at: new Date().toISOString() } : i
        );
        const allCompleted = updatedItems?.every(
          (i) => i.status === "COMPLETED" || i.status === "CANCELLED"
        );
        return {
          ...ticket,
          status: allCompleted ? ("COMPLETED" as const) : ticket.status,
          items: updatedItems,
        };
      })
    );

    setIsSubmitting(true);
    try {
      const res = await completeTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to complete item");
        await refreshTickets();
        return;
      }
      void refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
      await refreshTickets();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequeueItem = async (itemId: string) => {
    if (!propertyId) return;

    // 1. Optimistic Update
    setTickets((prev) =>
      prev.map((ticket) => {
        const hasItem = ticket.items?.some((i) => i.id === itemId);
        if (!hasItem) return ticket;
        return {
          ...ticket,
          items: ticket.items?.map((i) => (i.id === itemId ? { ...i, status: "QUEUED" as const } : i)),
        };
      })
    );

    setIsSubmitting(true);
    try {
      const res = await requeueTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to requeue item");
        await refreshTickets();
        return;
      }
      void refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
      await refreshTickets();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRemake = async (itemId: string, reason: string) => {
    if (!propertyId) return;
    try {
      const res = await remakeTicketItemAction(propertyId, itemId, reason);
      if (!res.success) {
        toastError("Remake Failed", res.error || "Could not re-fire item.");
        return;
      }
      success("Item Re-Fired", "Dispatched to kitchen queue with urgent priority.");
      void refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to re-fire item.");
    }
  };

  const handleChangePriority = async (ticketId: string, priority: KitchenPriority) => {
    if (!propertyId) return;

    // 1. Optimistic Update
    setTickets((prev) =>
      prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, priority } : ticket))
    );

    try {
      const res = await updateTicketPriorityAction(propertyId, ticketId, priority);
      if (!res.success) {
        toastError("Error", res.error || "Failed to update priority");
        await refreshTickets();
        return;
      }
      void refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to change priority");
      await refreshTickets();
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    if (statusTab !== "ALL" && t.status !== statusTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchNum = t.ticket_number?.toLowerCase().includes(q);
    const matchOrder = t.order_number?.toLowerCase().includes(q);
    const matchTable = t.table_number?.toLowerCase().includes(q);
    const matchItems = t.items?.some((i) => i.item_name.toLowerCase().includes(q));
    return matchNum || matchOrder || matchTable || matchItems;
  });

  if (authLoading || (loading && !selectedRestaurant)) {
    return (
      <div className="p-6">
        <LoadingState message="Connecting to Kitchen Display System (KDS)..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState description={error} onRetry={() => { void loadInitialOutlets(); }} />
      </div>
    );
  }

  if (!selectedRestaurant) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border p-8">
          <Store className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            No Restaurant Outlets Configured
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Please configure at least one active restaurant outlet in Menu Configuration to view live KDS tickets.
          </p>
          <Link href="/menu-configuration" className="inline-block mt-4">
            <Button size="sm" className="text-xs font-semibold">
              Go to Menu Configuration
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* ── LUXURY HERO BANNER ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10 shadow-2xl"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Ambient radial glows */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.10) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            {/* Pill Badge */}
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.30)",
                background: "rgba(214,168,90,0.10)",
              }}
            >
              <ChefHat className="h-3.5 w-3.5" />
              KITCHEN DISPLAY SYSTEM & DISPATCH
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight flex items-center gap-3 flex-wrap">
              <span>Kitchen Display (KDS)</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                ● Live Sync
              </span>
              <span className="block w-full text-white/60 text-sm font-normal mt-1">
                Real-time kitchen ticket queue & meal expedition for QR In-Room Dining & POS Orders
              </span>
            </h1>

            {/* Quick stats & outlet indicator in banner */}
            <div className="flex items-center gap-3 mt-4 flex-wrap text-xs text-white/80">
              <span className="inline-flex items-center gap-1.5 font-semibold bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-white">
                <Store className="h-3.5 w-3.5 text-amber-400" />
                {selectedRestaurant.name}
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-mono text-white/90 bg-white/5 px-2 py-1 rounded border border-white/10">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <span className="font-bold text-amber-300">{kpis.queuedTickets + kpis.inProgressTickets}</span> active orders
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Sound Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playAlertSound();
              }}
              className={`h-10 px-3 text-xs border-white/20 bg-white/5 backdrop-blur-xs font-semibold ${
                soundEnabled ? "text-emerald-400 border-emerald-400/40 bg-emerald-500/10" : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              title={soundEnabled ? "Alert chimes enabled (click to mute)" : "Alert chimes muted (click to unmute)"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 mr-1.5 text-emerald-400" /> : <VolumeX className="h-4 w-4 mr-1.5 text-white/50" />}
              {soundEnabled ? "Audio On" : "Muted"}
            </Button>

            {/* Fullscreen */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="h-10 px-3 text-xs border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white backdrop-blur-xs hidden md:inline-flex"
              title="Toggle full-screen kitchen monitor"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 mr-1" /> : <Maximize2 className="h-3.5 w-3.5 mr-1" />}
              {isFullscreen ? "Exit Full" : "Full Screen"}
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshTickets(false)}
              disabled={loading}
              className="h-10 px-3.5 text-xs font-semibold border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white backdrop-blur-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-amber-300" : ""}`} />
              Refresh
            </Button>

            {/* POS Shortcut */}
            <Link href="/pos">
              <Button
                size="sm"
                className="h-10 px-4 text-xs font-bold shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #F59E0B 100%)",
                  color: "#08111F",
                }}
              >
                <UtensilsCrossed className="h-3.5 w-3.5 mr-1.5" />
                Open POS
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI METRICS BAR ── */}
      <KdsKpiGrid kpis={kpis} />

      {/* ── STATUS TABS & STATION FILTERS ── */}
      <div className="bg-card p-3 rounded-xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Status Stage Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusTab === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All Active ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("QUEUED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusTab === "QUEUED"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Queued ({kpis.queuedTickets})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("IN_PROGRESS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusTab === "IN_PROGRESS"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Cooking ({kpis.inProgressTickets})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("READY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusTab === "READY"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Ready / Plated ({kpis.readyTickets})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("HISTORY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              statusTab === "HISTORY"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Order History ({kpis.completedTodayTickets})</span>
          </button>
        </div>

        {/* Station Filters & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {stations.length > 0 && statusTab !== "HISTORY" && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Station:</span>
              <button
                type="button"
                onClick={() => setSelectedStationId("ALL")}
                className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                  selectedStationId === "ALL" ? "bg-slate-800 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                All
              </button>
              {stations.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStationId(st.id)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    selectedStationId === st.id ? "bg-slate-800 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {st.name}
                </button>
              ))}
            </div>
          )}

          <div className="relative w-44 sm:w-56">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ticket / room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* ── MAIN VIEW: ACTIVE TICKETS OR ORDER HISTORY ── */}
      {statusTab === "HISTORY" ? (
        <div className="space-y-4">
          {/* History Sub-filter Bar */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-muted-foreground text-[11px]">Filter History:</span>
              <select
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value as "ALL" | "COMPLETED" | "CANCELLED")}
                className="text-xs h-8 rounded-lg border border-input bg-background px-3 py-1 font-semibold text-foreground cursor-pointer"
              >
                <option value="ALL">All Completed / Cancelled</option>
                <option value="COMPLETED">Completed Only</option>
                <option value="CANCELLED">Cancelled Only</option>
              </select>

              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="text-xs h-8 rounded-lg border border-input bg-background px-3 py-1 font-medium text-foreground cursor-pointer"
              />

              {(historyStatus !== "ALL" || historyDate || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHistoryStatus("ALL");
                    setHistoryDate("");
                    setSearchQuery("");
                  }}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadHistoryData}
              disabled={historyLoading}
              className="text-xs h-8 font-semibold"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${historyLoading ? "animate-spin text-amber-500" : ""}`} />
              Refresh History
            </Button>
          </div>

          {historyLoading ? (
            <div className="py-16 text-center bg-card rounded-2xl border border-border p-8 shadow-xs">
              <LoadingState message="Loading completed order history..." />
            </div>
          ) : historyTickets.length === 0 ? (
            <div className="py-16 text-center bg-card rounded-2xl border border-dashed border-border p-8 shadow-xs">
              <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-base font-bold text-foreground">
                No Order History Records Found
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Fulfilled or cancelled kitchen tickets for {selectedRestaurant?.name} will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {historyTickets.map((t) => {
                const isCompleted = t.status === "COMPLETED";
                const isCancelled = t.status === "CANCELLED";
                const firedDate = new Date(t.fired_at);
                const completedDate = t.completed_at ? new Date(t.completed_at) : null;
                const prepMinutes = completedDate
                  ? Math.max(1, Math.round((completedDate.getTime() - firedDate.getTime()) / 60000))
                  : null;

                return (
                  <div
                    key={t.id}
                    className="bg-card rounded-xl border border-border p-4 shadow-xs hover:border-border-hover transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-foreground bg-muted px-2 py-0.5 rounded-md">
                            {t.ticket_number}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {t.order_number || "Order"}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : isCancelled
                              ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>

                      {/* Destination / Table / Room Info */}
                      <div className="mt-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          {t.order_type === "ROOM_SERVICE" ? (
                            <>
                              <BedDouble className="h-3.5 w-3.5 text-amber-500" />
                              <span>Room {t.table_number || "Guest Room"} (QR Order)</span>
                            </>
                          ) : t.order_type === "DINE_IN" ? (
                            <>
                              <Utensils className="h-3.5 w-3.5 text-blue-500" />
                              <span>Table {t.table_number || "Dine In"}</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Takeaway / Pickup</span>
                            </>
                          )}
                        </div>
                        {prepMinutes !== null && (
                          <span className="text-[11px] font-mono font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            ⚡ {prepMinutes}m prep
                          </span>
                        )}
                      </div>

                      {/* Items List */}
                      <div className="mt-3 space-y-1.5 bg-muted/40 rounded-lg p-2.5 border border-border/40">
                        {t.items && t.items.length > 0 ? (
                          t.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start justify-between gap-2 text-xs"
                            >
                              <div className="flex items-start gap-1.5">
                                <span className="font-mono font-bold text-amber-500">
                                  {item.quantity}x
                                </span>
                                <div>
                                  <span className="font-semibold text-foreground">
                                    {item.item_name}
                                  </span>
                                  {item.notes && (
                                    <p className="text-[10px] text-muted-foreground italic">
                                      &ldquo;{item.notes}&rdquo;
                                    </p>
                                  )}
                                </div>
                              </div>
                              {item.status === "COMPLETED" && (
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Order items fulfilled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Timestamps */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        Fired: {firedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {completedDate && (
                        <span>
                          Completed: {completedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="py-20 text-center bg-card rounded-2xl border border-dashed border-border p-8 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto flex items-center justify-center mb-3">
            <ChefHat className="h-7 w-7" />
          </div>
          <h3 className="text-base font-black text-foreground">
            Kitchen Queue is Clear
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `No active tickets matching "${searchQuery}".`
              : "All food orders from QR guest ordering and POS billing are currently served and complete."}
          </p>
          <div className="pt-4 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusTab("HISTORY")}
              className="text-xs font-semibold gap-1.5"
            >
              <History className="h-3.5 w-3.5" />
              <span>View Order History</span>
            </Button>
            <Link href="/pos">
              <Button size="sm" variant="outline" className="text-xs font-semibold">
                Go to POS Billing
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {filteredTickets.map((ticket) => (
            <KdsTicketCard
              key={ticket.id}
              ticket={ticket}
              onStartItem={handleStartItem}
              onReadyItem={handleReadyItem}
              onCompleteItem={handleCompleteItem}
              onRequeueItem={handleRequeueItem}
              onRemakeItem={(item) => setRemakeTargetItem(item)}
              onChangePriority={handleChangePriority}
              disabled={isSubmitting}
            />
          ))}
        </div>
      )}

      {/* Remake Modal */}
      <RemakeModal
        open={remakeTargetItem !== null}
        onClose={() => setRemakeTargetItem(null)}
        item={remakeTargetItem}
        onConfirmRemake={handleConfirmRemake}
      />
    </div>
  );
}
