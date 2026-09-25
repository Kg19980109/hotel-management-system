"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  UtensilsCrossed,
  Search,
  RefreshCw,
  Eye,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
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

  const clearFilters = () => {
    setSelectedRestaurantId("ALL");
    setSelectedStatus("ALL");
    setSelectedOrderType("ALL");
    setSearchQuery("");
    setFilterDate("");
  };

  if (authLoading || (loading && !orders.length)) {
    return (
      <div className="p-6">
        <LoadingState message="Loading Orders Ledger..." />
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
      {/* Page Header */}
      <PageHeader
        title="Restaurant Orders Ledger"
        description="Comprehensive log of all POS transactions, dining receipts, and operational statuses."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/restaurant/pos">
              <Button size="sm" className="text-xs h-9">
                <UtensilsCrossed className="h-3.5 w-3.5 mr-1.5" />
                Open POS
              </Button>
            </Link>

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

      {/* Filters Bar */}
      <div className="bg-card p-3.5 rounded-xl border border-border shadow-xs space-y-3">
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
            className="text-xs h-8 rounded-md border border-input bg-background px-3 py-1 text-foreground"
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
            className="text-xs h-8 rounded-md border border-input bg-background px-3 py-1 text-foreground"
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
            className="text-xs h-8 rounded-md border border-input bg-background px-3 py-1 text-foreground"
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
            className="text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border flex flex-col items-center justify-center p-6">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h4 className="text-sm font-semibold text-foreground">No orders match your criteria</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Try adjusting your search filters or create a new order in the POS terminal.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Order Number</th>
                  <th className="px-4 py-2.5">Outlet</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Table</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Subtotal</th>
                  <th className="px-4 py-2.5">Discount</th>
                  <th className="px-4 py-2.5">Total</th>
                  <th className="px-4 py-2.5">Created At</th>
                  <th className="px-4 py-2.5">Server / Staff</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((ord) => (
                  <tr
                    key={ord.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      <Link
                        href={`/restaurant/orders/${ord.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {ord.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ord.restaurant_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <OrderTypeBadge type={ord.order_type} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {ord.table_number ? `Table ${ord.table_number}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={ord.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      ${ord.subtotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
                      {ord.discount_amount > 0 ? `-$${ord.discount_amount.toFixed(2)}` : "$0.00"}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      ${ord.total_amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(ord.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ord.creator_name || "Staff"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/restaurant/orders/${ord.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
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
          <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {orders.length} of {totalCount} orders</span>
          </div>
        </div>
      )}
    </div>
  );
}
