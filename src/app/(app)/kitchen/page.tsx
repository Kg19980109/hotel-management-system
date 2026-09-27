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
  KdsKpiSummary,
} from "@/lib/kds/types";
import { getRestaurants } from "@/lib/restaurant/queries";
import {
  getActiveKitchenTickets,
  getKitchenStations,
  getKdsKpis,
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
  const [statusTab, setStatusTab] = useState<"ALL" | "QUEUED" | "IN_PROGRESS" | "READY">("ALL");

  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
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

  useEffect(() => {
    if (!authLoading && propertyId) {
      void loadInitialOutlets();
    }
  }, [authLoading, propertyId, loadInitialOutlets]);

  // Real-time Supabase subscription
  useEffect(() => {
    if (!propertyId || !selectedRestaurant) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`stayhub:kds-live:${propertyId}:${selectedRestaurant.id}`)
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
      void refreshTickets();
    }, 10000);

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

  // Ticket Item Status Handlers
  const handleStartItem = async (itemId: string) => {
    if (!propertyId) return;
    setIsSubmitting(true);
    try {
      const res = await startTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to start preparation");
        return;
      }
      await refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReadyItem = async (itemId: string) => {
    if (!propertyId) return;
    setIsSubmitting(true);
    try {
      const res = await readyTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to mark item ready");
        return;
      }
      await refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    if (!propertyId) return;
    setIsSubmitting(true);
    try {
      const res = await completeTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to complete item");
        return;
      }
      await refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequeueItem = async (itemId: string) => {
    if (!propertyId) return;
    setIsSubmitting(true);
    try {
      const res = await requeueTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to requeue item");
        return;
      }
      await refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
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
      await refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to re-fire item.");
    }
  };

  const handleChangePriority = async (ticketId: string, priority: KitchenPriority) => {
    if (!propertyId) return;
    try {
      const res = await updateTicketPriorityAction(propertyId, ticketId, priority);
      if (!res.success) {
        toastError("Error", res.error || "Failed to update priority");
        return;
      }
      await refreshTickets();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to change priority");
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
      {/* ── TOP BAR / HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                Kitchen Display System (KDS)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse">
                ● Live Sync
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time kitchen ticket queue for QR In-Room Dining & POS Orders
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Outlet Selector */}
          {restaurants.length > 1 && (
            <select
              value={selectedRestaurant.id}
              onChange={(e) => void handleSelectOutlet(e.target.value)}
              className="text-xs h-8 rounded-lg border border-input bg-card px-2.5 font-bold text-foreground shadow-xs cursor-pointer"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          {/* Live Digital Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-xs font-mono font-bold text-foreground border border-border">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>

          {/* Sound Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playAlertSound();
            }}
            className={`h-8 px-2.5 text-xs ${soundEnabled ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" : "text-muted-foreground"}`}
            title={soundEnabled ? "Alert chimes enabled (click to mute)" : "Alert chimes muted (click to unmute)"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </Button>

          {/* Fullscreen */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 px-2.5 text-xs text-muted-foreground hidden md:inline-flex"
            title="Toggle full-screen kitchen monitor"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshTickets(false)}
            disabled={loading}
            className="h-8 px-2.5 text-xs font-bold"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
            Refresh
          </Button>

          <Link href="/pos">
            <Button size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-3.5 w-3.5 mr-1.5" />
              Open POS
            </Button>
          </Link>
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
        </div>

        {/* Station Filters & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {stations.length > 0 && (
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

      {/* ── TICKETS GRID ── */}
      {filteredTickets.length === 0 ? (
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
            <Link href="/pos">
              <Button size="sm" variant="outline" className="text-xs font-semibold">
                Go to POS Billing
              </Button>
            </Link>
            <Link href="/qr-services">
              <Button size="sm" variant="outline" className="text-xs font-semibold">
                View QR Guest Portal
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
