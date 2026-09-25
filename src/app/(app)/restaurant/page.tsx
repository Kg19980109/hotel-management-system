"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  ShoppingBag,
  Layers,
  BookOpen,
  Plus,
  ArrowRight,
  RefreshCw,
  Store,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  Restaurant,
  RestaurantKPIs,
  RestaurantOrder,
} from "@/lib/restaurant/types";
import {
  getRestaurants,
  getRestaurantKPIs,
  getRestaurantOrders,
} from "@/lib/restaurant/queries";
import { createRestaurantAction } from "@/lib/restaurant/actions";
import {
  RestaurantKpiGrid,
  OrderStatusBadge,
  OrderTypeBadge,
} from "@/components/restaurant";

export default function RestaurantPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("ALL");
  const [kpis, setKpis] = useState<RestaurantKPIs>({
    open_orders_count: 0,
    active_tables_count: 0,
    available_tables_count: 0,
    today_orders_count: 0,
    today_order_sales: 0,
    cancelled_orders_count: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RestaurantOrder[]>([]);

  // Create Restaurant Outlet Modal
  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false);
  const [newOutletName, setNewOutletName] = useState("");
  const [newOutletCode, setNewOutletCode] = useState("");
  const [newOutletDesc, setNewOutletDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [rests, kpisData, ordersData] = await Promise.all([
        getRestaurants(propertyId, true),
        getRestaurantKPIs(
          propertyId,
          selectedRestaurantId !== "ALL" ? selectedRestaurantId : undefined
        ),
        getRestaurantOrders(propertyId, {
          restaurantId: selectedRestaurantId !== "ALL" ? selectedRestaurantId : undefined,
          limit: 10,
        }),
      ]);

      setRestaurants(rests);
      setKpis(kpisData);
      setRecentOrders(ordersData.orders);
    } catch (err: unknown) {
      console.error("Failed to load restaurant data:", err);
      setError(err instanceof Error ? err.message : "Failed to load restaurant data");
    } finally {
      setLoading(false);
    }
  }, [propertyId, selectedRestaurantId]);

  useEffect(() => {
    if (!authLoading) {
      if (propertyId) {
        void Promise.resolve().then(() => loadData());
      } else {
        setLoading(false);
      }
    }
  }, [authLoading, propertyId, selectedRestaurantId, loadData]);

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;
    if (!newOutletName.trim() || !newOutletCode.trim()) {
      toastError("Validation Error", "Outlet name and code are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createRestaurantAction(propertyId, {
        name: newOutletName.trim(),
        code: newOutletCode.trim(),
        description: newOutletDesc.trim() || undefined,
      });

      if (!res.success) {
        toastError("Error", res.error || "Failed to create restaurant outlet.");
        return;
      }

      success("Outlet Created", `Restaurant '${newOutletName}' created successfully.`);
      setIsAddOutletOpen(false);
      setNewOutletName("");
      setNewOutletCode("");
      setNewOutletDesc("");
      loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to create outlet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (loading && !restaurants.length)) {
    return (
      <div className="p-6">
        <LoadingState message="Loading restaurant operations..." />
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
      {/* Page Header */}
      <PageHeader
        title="Restaurant Operations & POS"
        description="Manage dining outlets, table assignments, menus, and POS cashier workflows."
        actions={
          <div className="flex items-center gap-2">
            {restaurants.length > 0 && (
              <select
                value={selectedRestaurantId}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
                className="text-xs h-9 rounded-md border border-input bg-background px-3 py-1 font-medium text-foreground shadow-xs"
              >
                <option value="ALL">All Outlets ({restaurants.length})</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs h-9"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddOutletOpen(true)}
              className="text-xs h-9"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Outlet
            </Button>
          </div>
        }
      />

      {/* KPI Grid */}
      <RestaurantKpiGrid kpis={kpis} />

      {/* No Outlets State */}
      {restaurants.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border flex flex-col items-center justify-center p-8">
          <Store className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">
            No Restaurant Outlets Configured
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Create your hotel&apos;s first restaurant outlet (e.g. Main Restaurant, Rooftop Bar, Cafe) to set up tables, menus, and POS cashiers.
          </p>
          <Button
            onClick={() => setIsAddOutletOpen(true)}
            className="mt-5 text-xs font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Restaurant Outlet
          </Button>
        </div>
      ) : (
        <>
          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/restaurant/pos" className="group">
              <Card className="p-4 border-border hover:border-primary/50 hover:shadow-md transition-all duration-150 flex flex-col justify-between h-full bg-card">
                <div>
                  <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary mb-3">
                    <UtensilsCrossed className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    POS Cashier Terminal
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fast order entry, table assignment, and instant cashier ticketing.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-primary">
                  <span>Open POS</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>

            <Link href="/restaurant/tables" className="group">
              <Card className="p-4 border-border hover:border-primary/50 hover:shadow-md transition-all duration-150 flex flex-col justify-between h-full bg-card">
                <div>
                  <div className="p-2 w-fit rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-3">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-indigo-600 transition-colors">
                    Dining Tables Map
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage dining areas, table capacities, and live table occupancy.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <span>Manage Tables</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>

            <Link href="/restaurant/menu" className="group">
              <Card className="p-4 border-border hover:border-primary/50 hover:shadow-md transition-all duration-150 flex flex-col justify-between h-full bg-card">
                <div>
                  <div className="p-2 w-fit rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-3">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-amber-600 transition-colors">
                    Menu & Pricing
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure categories, dishes, numeric pricing, and real-time stock availability.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <span>Edit Menu</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>

            <Link href="/restaurant/orders" className="group">
              <Card className="p-4 border-border hover:border-primary/50 hover:shadow-md transition-all duration-150 flex flex-col justify-between h-full bg-card">
                <div>
                  <div className="p-2 w-fit rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-3">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">
                    Orders Ledger
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Track active and historical orders, audit events, and line item receipts.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>View All Orders</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          </div>

          {/* Recent Orders Section */}
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground">Recent Orders</h3>
                <p className="text-xs text-muted-foreground">
                  Latest POS transactions across your dining outlets
                </p>
              </div>
              <Link href="/restaurant/orders">
                <Button variant="ghost" size="sm" className="text-xs h-8">
                  View All Orders
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No orders recorded yet. Open the POS terminal to create your first order.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Order Number</th>
                      <th className="px-4 py-2.5">Outlet</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Table</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Total</th>
                      <th className="px-4 py-2.5">Time</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders.map((ord) => (
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
                        <td className="px-4 py-3 text-muted-foreground">
                          {ord.table_number ? `Table ${ord.table_number}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <OrderStatusBadge status={ord.status} />
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          ${ord.total_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(ord.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/restaurant/orders/${ord.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* CREATE OUTLET MODAL */}
      <Modal
        open={isAddOutletOpen}
        onClose={() => setIsAddOutletOpen(false)}
        title="Add Restaurant Outlet"
        description="Register a new restaurant, lounge, or cafe in this property"
      >
        <form onSubmit={handleCreateOutlet} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Outlet Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. The Grand Bistro, Sky Lounge, Pool Cafe"
              value={newOutletName}
              onChange={(e) => setNewOutletName(e.target.value)}
              className="text-xs h-8"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Outlet Code <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. BISTRO, SKYBAR, CAFE"
              value={newOutletCode}
              onChange={(e) => setNewOutletCode(e.target.value)}
              className="text-xs h-8 uppercase"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Description (Optional)
            </label>
            <Input
              placeholder="Brief description of the dining outlet..."
              value={newOutletDesc}
              onChange={(e) => setNewOutletDesc(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddOutletOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Outlet"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
