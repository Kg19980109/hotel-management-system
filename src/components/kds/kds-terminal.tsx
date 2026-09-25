"use client";

// ============================================================
// STAYHUB KDS MASTER TERMINAL COMPONENT (Phase 13)
// ============================================================

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  ChefHat,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  KitchenTicket,
  KitchenStation,
  KitchenTicketItem,
  KitchenPriority,
  KdsKpiSummary,
} from "@/lib/kds/types";
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
import { KdsTicketCard } from "./kds-ticket-card";
import { KdsKpiGrid } from "./kds-kpi-grid";
import { RemakeModal } from "./remake-modal";

interface KdsTerminalProps {
  propertyId: string;
  restaurantId: string;
  initialStations: KitchenStation[];
}

export function KdsTerminal({
  propertyId,
  restaurantId,
  initialStations,
}: KdsTerminalProps) {
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<KitchenStation[]>(initialStations);
  const [selectedStationId, setSelectedStationId] = useState<string>("ALL");
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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [remakeTargetItem, setRemakeTargetItem] = useState<KitchenTicketItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data Loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketsData, stationsData, kpisData] = await Promise.all([
        getActiveKitchenTickets(
          propertyId,
          restaurantId,
          selectedStationId !== "ALL" ? selectedStationId : undefined
        ),
        getKitchenStations(restaurantId, false),
        getKdsKpis(propertyId, restaurantId),
      ]);

      setTickets(ticketsData);
      setStations(stationsData);
      setKpis(kpisData);
    } catch (err: unknown) {
      console.error("Failed to load KDS data:", err);
    } finally {
      setLoading(false);
    }
  }, [propertyId, restaurantId, selectedStationId]);

  // Polling auto-refresh every 10 seconds for live kitchen updates
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    const timer = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Handle Item Actions
  const handleStartItem = async (itemId: string) => {
    setIsSubmitting(true);
    try {
      const res = await startTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to start preparation");
        return;
      }
      loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReadyItem = async (itemId: string) => {
    setIsSubmitting(true);
    try {
      const res = await readyTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to mark item ready");
        return;
      }
      loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    setIsSubmitting(true);
    try {
      const res = await completeTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to complete item");
        return;
      }
      loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequeueItem = async (itemId: string) => {
    setIsSubmitting(true);
    try {
      const res = await requeueTicketItemAction(propertyId, itemId);
      if (!res.success) {
        toastError("Error", res.error || "Failed to requeue item");
        return;
      }
      loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRemake = async (itemId: string, reason: string) => {
    try {
      const res = await remakeTicketItemAction(propertyId, itemId, reason);
      if (!res.success) {
        toastError("Remake Failed", res.error || "Could not re-fire item.");
        return;
      }
      success("Item Re-Fired", "Sent back to kitchen preparation queue.");
      loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to re-fire item.");
    }
  };

  const handleChangePriority = async (ticketId: string, priority: KitchenPriority) => {
    try {
      const res = await updateTicketPriorityAction(propertyId, ticketId, priority);
      if (!res.success) {
        toastError("Error", res.error || "Failed to update priority");
        return;
      }
      loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to change priority");
    }
  };

  // Filter tickets by search query
  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchNum = t.ticket_number.toLowerCase().includes(q);
    const matchOrder = t.order_number?.toLowerCase().includes(q);
    const matchTable = t.table_number?.toLowerCase().includes(q);
    const matchItems = t.items?.some((i) => i.item_name.toLowerCase().includes(q));
    return matchNum || matchOrder || matchTable || matchItems;
  });

  return (
    <div className="space-y-4">
      {/* KPI GRID */}
      <KdsKpiGrid kpis={kpis} />

      {/* FILTER & TOOLBAR */}
      <div className="bg-card p-3 rounded-xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Station Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedStationId("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              selectedStationId === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All Stations ({tickets.length})
          </button>

          {stations.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStationId(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                selectedStationId === st.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.name}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSelectedStationId("UNROUTED")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              selectedStationId === "UNROUTED"
                ? "bg-rose-600 text-white"
                : "bg-muted text-rose-600 hover:bg-rose-50"
            }`}
          >
            Unrouted
          </button>
        </div>

        {/* Right: Search, Sound, Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-60">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ticket / table / item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 px-2.5 text-xs text-muted-foreground"
            title={soundEnabled ? "Mute alert chimes" : "Enable alert chimes"}
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 px-2.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* TICKET CARDS GRID */}
      {filteredTickets.length === 0 ? (
        <div className="py-20 text-center bg-card rounded-xl border border-dashed border-border p-8">
          <ChefHat className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            Kitchen Queue is Clear
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No active tickets matching "${searchQuery}".`
              : "No orders currently waiting or in preparation."}
          </p>
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

      {/* REMAKE MODAL */}
      <RemakeModal
        open={remakeTargetItem !== null}
        onClose={() => setRemakeTargetItem(null)}
        item={remakeTargetItem}
        onConfirmRemake={handleConfirmRemake}
      />
    </div>
  );
}
