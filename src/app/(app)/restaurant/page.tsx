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
  Sparkles,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
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
        <LoadingState message="Loading restaurant operations console..." />
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

  const selectedOutlet = restaurants.find((r) => r.id === selectedRestaurantId);

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
              <span>Dining Operations & POS Command</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              Restaurant & Dining Outlets
            </h1>
            <p className="text-sm text-slate-300/80 mt-1 max-w-2xl leading-relaxed">
              Manage hotel dining outlets, floor occupancy, menu catalogs, guest room dining orders, and POS cashier terminals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {restaurants.length > 0 && (
              <select
                value={selectedRestaurantId}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
                className="text-xs h-9 rounded-lg border border-white/20 bg-slate-900/80 backdrop-blur-md px-3 py-1 font-semibold text-white shadow-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold)]"
              >
                <option value="ALL">All Outlets ({restaurants.length})</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs h-9 border-white/20 text-slate-200 hover:text-white hover:bg-white/10 bg-slate-900/60"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddOutletOpen(true)}
              className="text-xs h-9 font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-md"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Outlet
            </Button>

            <Link href="/restaurant/pos">
              <Button
                size="sm"
                className="text-xs h-9 font-bold bg-[var(--brand-gold)] hover:brightness-110 text-slate-950 shadow-md flex items-center gap-1.5"
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                POS Terminal
              </Button>
            </Link>
          </div>
        </div>

        {/* Selected Outlet Quick Bar */}
        {selectedOutlet && (
          <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="font-semibold text-white">Active Outlet: {selectedOutlet.name}</span>
            <span className="text-slate-400">• Code: <code className="font-mono text-[11px] text-[var(--brand-gold)]">{selectedOutlet.code}</code></span>
            <span className="text-slate-400">• Currency: {selectedOutlet.currency || "INR"}</span>
            <span className="text-slate-400">• Timezone: {selectedOutlet.timezone || "Asia/Kolkata"}</span>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <RestaurantKpiGrid kpis={kpis} currency={selectedOutlet?.currency === "USD" ? "$" : "₹"} />

      {/* No Outlets State */}
      {restaurants.length === 0 ? (
        <div className="py-16 text-center stayhub-card border-dashed flex flex-col items-center justify-center p-8">
          <Store className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">
            No Restaurant Outlets Configured
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Create your hotel&apos;s first restaurant outlet (e.g. Main Restaurant, Rooftop Bar, Poolside Lounge) to set up tables, menus, and POS cashiers.
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
              <div className="stayhub-card p-5 hover:border-[var(--primary)]/60 hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full group">
                <div>
                  <div className="p-2.5 w-fit rounded-xl bg-[var(--primary-light)] text-[var(--primary)] mb-3 group-hover:scale-105 transition-transform">
                    <UtensilsCrossed className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    POS Cashier Terminal
                  </h4>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1.5 leading-relaxed">
                    Fast order entry, table assignment, split billing, and instant kitchen ticketing.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-[var(--primary)] pt-3 border-t border-[var(--border)]">
                  <span>Launch POS</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            <Link href="/restaurant/tables" className="group">
              <div className="stayhub-card p-5 hover:border-indigo-500/60 hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full group">
                <div>
                  <div className="p-2.5 w-fit rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[var(--foreground)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Dining Tables Map
                  </h4>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1.5 leading-relaxed">
                    Manage dining floor plans, table seating capacity, and real-time occupancy states.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 pt-3 border-t border-[var(--border)]">
                  <span>Manage Tables</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            <Link href="/restaurant/menu" className="group">
              <div className="stayhub-card p-5 hover:border-[var(--brand-gold)]/60 hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full group">
                <div>
                  <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3 group-hover:scale-105 transition-transform">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[var(--foreground)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Menu & Item Pricing
                  </h4>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1.5 leading-relaxed">
                    Configure categories, dishes, numeric pricing, KDS kitchen station routing, and stock availability.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-amber-600 dark:text-amber-400 pt-3 border-t border-[var(--border)]">
                  <span>Configure Menu</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            <Link href="/restaurant/orders" className="group">
              <div className="stayhub-card p-5 hover:border-emerald-500/60 hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full group">
                <div>
                  <div className="p-2.5 w-fit rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[var(--foreground)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Orders Ledger
                  </h4>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1.5 leading-relaxed">
                    Audit trail for POS receipts, room service requests, kitchen tickets, and payment folios.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-3 border-t border-[var(--border)]">
                  <span>View All Orders</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Orders Section */}
          <div className="stayhub-card overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--foreground)]">Recent Orders</h3>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    Latest dining and room service transactions across your outlets
                  </p>
                </div>
              </div>
              <Link href="/restaurant/orders">
                <Button variant="ghost" size="sm" className="text-xs h-8 text-[var(--primary)] font-semibold hover:bg-[var(--primary-light)]">
                  View Full Ledger
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
                  <thead className="bg-[var(--secondary)]/50 border-b border-[var(--border)] text-[var(--foreground-subtle)] font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Order Number</th>
                      <th className="px-4 py-3">Outlet</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Table / Room</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {recentOrders.map((ord) => (
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
                        <td className="px-4 py-3.5 text-[var(--foreground-muted)] font-medium">
                          {ord.table_number ? `Table ${ord.table_number}` : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <OrderStatusBadge status={ord.status} />
                        </td>
                        <td className="px-4 py-3.5 font-bold text-[var(--foreground)]">
                          ₹{ord.total_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--foreground-muted)] flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>
                            {new Date(ord.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link href={`/restaurant/orders/${ord.id}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-semibold">
                              Details
                              <ChevronRight className="h-3 w-3 ml-0.5" />
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
