"use client";

// ============================================================
// STAYHUB KDS TICKET HISTORY PAGE (Phase 13)
// ============================================================

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  History,
  Search,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { Restaurant } from "@/lib/restaurant/types";
import { KitchenTicket, KitchenTicketStatus } from "@/lib/kds/types";
import { getRestaurants } from "@/lib/restaurant/queries";
import { getKitchenTicketHistory } from "@/lib/kds/queries";

export default function KitchenHistoryPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!propertyId) return;
    try {
      setLoading(true);
      setError(null);

      const [rests, historyRes] = await Promise.all([
        getRestaurants(propertyId, true),
        getKitchenTicketHistory(propertyId, {
          restaurantId: selectedRestaurantId !== "ALL" ? selectedRestaurantId : undefined,
          status: selectedStatus !== "ALL" ? (selectedStatus as KitchenTicketStatus) : undefined,
          search: searchQuery.trim() || undefined,
          date: filterDate || undefined,
          limit: 100,
        }),
      ]);

      setRestaurants(rests);
      setTickets(historyRes.tickets);
      setTotalCount(historyRes.count);
    } catch (err: unknown) {
      console.error("Failed to load kitchen history:", err);
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [propertyId, selectedRestaurantId, selectedStatus, searchQuery, filterDate]);

  useEffect(() => {
    if (!authLoading && propertyId) {
      void Promise.resolve().then(() => loadData());
    }
  }, [authLoading, propertyId, loadData]);

  if (authLoading || (loading && !tickets.length)) {
    return (
      <div className="p-6">
        <LoadingState message="Loading Kitchen History..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState description={error} onRetry={() => { void loadData(); }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <Link href="/restaurant/kds" className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Kitchen Display
        </Link>
        <PageHeader
          title="Kitchen Production History"
          description="Historical ledger of fulfilled food tickets, preparation durations, and cancellation logs."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="text-xs h-9"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>
          }
        />
      </div>

      {/* Filter Controls */}
      <div className="bg-card p-3 rounded-xl border border-border shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ticket number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>

        {restaurants.length > 0 && (
          <select
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
            className="text-xs h-8 rounded-md border border-input bg-background px-3 py-1 font-medium text-foreground"
          >
            <option value="ALL">All Outlets</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs h-8 rounded-md border border-input bg-background px-3 py-1 font-medium text-foreground"
        >
          <option value="ALL">All Completed/Cancelled</option>
          <option value="COMPLETED">Completed Only</option>
          <option value="CANCELLED">Cancelled Only</option>
          <option value="READY">Ready for Pickup</option>
        </select>

        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="text-xs h-8 w-36"
        />

        {(searchQuery || selectedRestaurantId !== "ALL" || selectedStatus !== "ALL" || filterDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedRestaurantId("ALL");
              setSelectedStatus("ALL");
              setFilterDate("");
            }}
            className="text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {/* History Table */}
      {tickets.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border p-8">
          <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            No Production History Records
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Fulfilled or cancelled kitchen tickets will appear here with timestamps and duration analytics.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Order / Table</th>
                  <th className="px-4 py-3">Outlet</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Fired At</th>
                  <th className="px-4 py-3">Completed At</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((t) => {
                  const isCompleted = t.status === "COMPLETED";
                  const isCancelled = t.status === "CANCELLED";

                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {t.ticket_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {t.order_number || "POS Order"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {t.order_type === "DINE_IN"
                            ? t.table_number
                              ? `Table ${t.table_number}`
                              : "Dine In"
                            : "Takeaway"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t.restaurant_name || "Restaurant"}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            t.priority === "URGENT"
                              ? "bg-rose-500/10 text-rose-600"
                              : t.priority === "HIGH"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(t.fired_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t.completed_at
                          ? new Date(t.completed_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-600"
                              : isCancelled
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-indigo-500/10 text-indigo-600"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
            Showing {tickets.length} of {totalCount} total production records
          </div>
        </div>
      )}
    </div>
  );
}
