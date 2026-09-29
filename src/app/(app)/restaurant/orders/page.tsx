"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  UtensilsCrossed,
  Search,
  RefreshCw,
  Eye,
  Sparkles,
  ChevronRight,
  Clock,
  Calendar,
  Filter,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  Restaurant,
  RestaurantOrder,
  OrderStatus,
  OrderType,
} from "@/lib/restaurant/types";
import {
  getRestaurants,
  getRestaurantOrders,
} from "@/lib/restaurant/queries";
import {
  OrderStatusBadge,
  OrderTypeBadge,
} from "@/components/restaurant";

import { createClient } from "@/lib/supabase/client";

export default function RestaurantOrdersPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedOrderType, setSelectedOrderType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!propertyId) return;
    try {
      setLoading(true);
      setError(null);

      const [rests, ordersRes] = await Promise.all([
        getRestaurants(propertyId, true),
        getRestaurantOrders(propertyId, {
          restaurantId: selectedRestaurantId !== "ALL" ? selectedRestaurantId : undefined,
          status: selectedStatus !== "ALL" ? (selectedStatus as OrderStatus) : undefined,
          orderType: selectedOrderType !== "ALL" ? (selectedOrderType as OrderType) : undefined,
          date: filterDate || undefined,
          search: searchQuery.trim() || undefined,
          limit: 100,
        }),
      ]);

      setRestaurants(rests);
      setOrders(ordersRes.orders);
      setTotalCount(ordersRes.count);
    } catch (err: unknown) {
      console.error("Failed to load restaurant orders:", err);
      setError(err instanceof Error ? err.message : "Failed to load orders ledger");
    } finally {
      setLoading(false);
    }
  }, [
    propertyId,
    selectedRestaurantId,
    selectedStatus,
    selectedOrderType,
    searchQuery,
    filterDate,
  ]);

  useEffect(() => {
    if (!authLoading && propertyId) {
      void Promise.resolve().then(() => loadData());
    }
  }, [authLoading, propertyId, loadData]);

  // Real-time Supabase subscription for instant order status reflection
  useEffect(() => {
    if (!propertyId) return;

    const supabase = createClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    const channelName = `stayhub:restaurant-orders-live:${propertyId}:${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_orders",
          filter: `property_id=eq.${propertyId}`,
        },
        () => {
          void loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_tickets",
          filter: `property_id=eq.${propertyId}`,
        },
        () => {
          void loadData();
        }
      )
      .subscribe();

    // CRITICAL FIX: Was polling every 2s — unnecessarily expensive.
    // Realtime subscription above fires instantly on any order/ticket change.
    // 60s is only a safety fallback for missed websocket events.
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadData();
    }, 60000);

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [propertyId, loadData]);

  const clearFilters = () => {
    setSelectedRestaurantId("ALL");
    setSelectedStatus("ALL");
    setSelectedOrderType("ALL");
    setSearchQuery("");
    setFilterDate("");
  };

  const openOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "OPEN" || o.status === "CONFIRMED" || o.status === "PREPARING" || o.status === "READY").length;
  }, [orders]);

  const completedOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "COMPLETED" || o.status === "SERVED").length;
  }, [orders]);

  const totalSalesSum = useMemo(() => {
    return orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [orders]);

  if (authLoading || (loading && !orders.length)) {
    return (
      <div className="p-6">
        <LoadingState message="Loading Orders Ledger & Audit Trail..." />
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── LUXURY MIDNIGHT NAVY HERO ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Ambient radial lighting */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.08) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.25)",
                background: "rgba(214,168,90,0.08)",
              }}
            >
              <Sparkles className="h-3 w-3" />
              <span>Dining Orders & Transactions Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              Restaurant Orders Ledger
            </h1>
            <p className="text-sm text-slate-300/80 mt-1 max-w-2xl leading-relaxed">
              Comprehensive log of all POS transactions, guest room dining orders, itemized receipts, and kitchen fulfillment statuses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <Link href="/restaurant/pos">
              <Button
                size="sm"
                className="text-xs h-9 font-bold bg-[var(--brand-gold)] hover:brightness-110 text-slate-950 shadow-md flex items-center gap-1.5"
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                POS Terminal
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs h-9 border-white/20 text-slate-200 hover:text-white hover:bg-white/10 bg-slate-900/60"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Orders Ledger Metric Bar */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <ShoppingBag className="h-4 w-4 text-[var(--brand-gold)] shrink-0" />
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Total Orders</p>
              <p className="text-sm font-extrabold text-white">{totalCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">In-Progress</p>
              <p className="text-sm font-extrabold text-amber-400">{openOrdersCount} active</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <UtensilsCrossed className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Fulfilled</p>
              <p className="text-sm font-extrabold text-emerald-400">{completedOrdersCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <ShoppingBag className="h-4 w-4 text-indigo-400 shrink-0" />
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Ledger Volume</p>
              <p className="text-sm font-extrabold text-white">₹{totalSalesSum.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="stayhub-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter Transactions</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Search Order Number */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>

          {/* Restaurant Outlet */}
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

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs h-8 rounded-md border border-input bg-background px-3 py-1 font-medium text-foreground"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="SERVED">Served</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Order Type */}
          <select
            value={selectedOrderType}
            onChange={(e) => setSelectedOrderType(e.target.value)}
            className="text-xs h-8 rounded-md border border-input bg-background px-3 py-1 font-medium text-foreground"
          >
            <option value="ALL">All Types</option>
            <option value="DINE_IN">Dine In</option>
            <option value="TAKEAWAY">Takeaway</option>
            <option value="ROOM_SERVICE">Room Service</option>
            <option value="DELIVERY">Delivery</option>
          </select>

          {/* Date Filter */}
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="text-xs h-8"
          />

          {/* Clear Filters Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs h-8 text-muted-foreground hover:text-foreground font-semibold"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="py-20 text-center stayhub-card border-dashed flex flex-col items-center justify-center p-8">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h4 className="text-base font-bold text-[var(--foreground)]">No orders match your criteria</h4>
          <p className="text-xs text-[var(--foreground-muted)] mt-1.5 max-w-sm">
            Try adjusting your search filters or launch the POS terminal to record a transaction.
          </p>
        </div>
      ) : (
        <div className="stayhub-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--secondary)]/50 border-b border-[var(--border)] text-[var(--foreground-subtle)] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Outlet</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Table / Room</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Subtotal</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Created By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((ord) => (
                  <tr
                    key={ord.id}
                    className="hover:bg-[var(--secondary)]/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-[var(--foreground)]">
                      <Link
                        href={`/restaurant/orders/${ord.id}`}
                        className="text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                      >
                        {ord.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)] font-medium">
                      {ord.restaurant_name || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <OrderTypeBadge type={ord.order_type} />
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[var(--foreground)]">
                      {ord.table_number ? `Table ${ord.table_number}` : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <OrderStatusBadge status={ord.status} />
                    </td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)]">
                      ₹{ord.subtotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      {ord.discount_amount > 0 ? `-₹${ord.discount_amount.toFixed(2)}` : "₹0.00"}
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-[var(--foreground)]">
                      ₹{ord.total_amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)]">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>
                          {new Date(ord.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)] font-medium">
                      {ord.creator_name || "Staff"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/restaurant/orders/${ord.id}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-semibold">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 bg-[var(--secondary)]/30 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--foreground-muted)]">
            <span>Showing {orders.length} of {totalCount} transactions</span>
          </div>
        </div>
      )}
    </div>
  );
}
