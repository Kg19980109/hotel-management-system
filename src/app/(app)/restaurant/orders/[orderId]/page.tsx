"use client";

import * as React from "react";
import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  Check,
  ChefHat,
  Receipt,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { RestaurantOrder } from "@/lib/restaurant/types";
import { getRestaurantOrderById } from "@/lib/restaurant/queries";
import { KitchenTicket } from "@/lib/kds/types";
import { getKitchenTicketByOrderId } from "@/lib/kds/queries";
import {
  confirmOrderAction,
  completeOrderAction,
  cancelOrderAction,
} from "@/lib/restaurant/actions";
import {
  OrderStatusBadge,
  OrderTypeBadge,
} from "@/components/restaurant";

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;

  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<RestaurantOrder | null>(null);
  const [kitchenTicket, setKitchenTicket] = useState<KitchenTicket | null>(null);

  // Cancel Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const [data, kTicket] = await Promise.all([
        getRestaurantOrderById(orderId),
        getKitchenTicketByOrderId(orderId),
      ]);
      if (!data) {
        setError("Order not found or has been deleted.");
      } else {
        setOrder(data);
        setKitchenTicket(kTicket);
      }
    } catch (err: unknown) {
      console.error("Failed to load order detail:", err);
      setError(err instanceof Error ? err.message : "Failed to load order detail");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!authLoading) {
      void Promise.resolve().then(() => loadData());
    }
  }, [authLoading, loadData]);

  const handleConfirmOrder = async () => {
    if (!propertyId || !order) return;
    setIsSubmitting(true);
    try {
      const res = await confirmOrderAction(propertyId, order.id);
      if (!res.success) {
        toastError("Error", res.error || "Failed to confirm order.");
        return;
      }
      success("Order Confirmed", `Order ${order.order_number} is now confirmed.`);
      loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to confirm order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!propertyId || !order) return;
    setIsSubmitting(true);
    try {
      const res = await completeOrderAction(propertyId, order.id);
      if (!res.success) {
        toastError("Error", res.error || "Failed to complete order.");
        return;
      }
      success("Order Completed", `Order ${order.order_number} has been completed.`);
      loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to complete order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !order) return;
    if (!cancelReason.trim()) {
      toastError("Validation Error", "Please provide a cancellation reason.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await cancelOrderAction(propertyId, order.id, cancelReason.trim());
      if (!res.success) {
        toastError("Cancellation Failed", res.error || "Could not cancel order.");
        return;
      }
      success("Order Cancelled", `Order ${order.order_number} cancelled.`);
      setIsCancelModalOpen(false);
      setCancelReason("");
      loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (loading && !order)) {
    return (
      <div className="p-6">
        <LoadingState message="Loading order details & kitchen routing..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <ErrorState description={error || "Order not found"} onRetry={() => { void loadData(); }} />
      </div>
    );
  }

  const canConfirm = order.status === "OPEN";
  const canComplete = ["OPEN", "CONFIRMED", "PREPARING", "READY", "SERVED"].includes(order.status);
  const canCancel = !["COMPLETED", "CANCELLED"].includes(order.status);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/restaurant/orders"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Orders Ledger
        </Link>
      </div>

      {/* ── LUXURY ORDER DOSSIER HERO ── */}
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
              <span>Dining Order Dossier</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
                {order.order_number}
              </h1>
              <OrderStatusBadge status={order.status} size="md" />
            </div>
            <p className="text-sm text-slate-300/80 mt-1.5">
              {order.restaurant_name || "Restaurant"} • Ordered at {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {canConfirm && (
              <Button
                size="sm"
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="text-xs h-9 font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-md"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Confirm Order
              </Button>
            )}

            {canComplete && (
              <Button
                size="sm"
                onClick={handleCompleteOrder}
                disabled={isSubmitting}
                className="text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Complete Order
              </Button>
            )}

            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                disabled={isSubmitting}
                className="text-xs h-9 border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-semibold"
              >
                <Ban className="h-3.5 w-3.5 mr-1.5" />
                Cancel Order
              </Button>
            )}
          </div>
        </div>

        {/* Hero Meta Bar */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Type:</span>
            <OrderTypeBadge type={order.order_type} />
          </div>
          <div className="text-slate-400">• Table / Location: <strong className="text-white">{order.table_number ? `Table ${order.table_number}` : "Room Service / Takeaway"}</strong></div>
          <div className="text-slate-400">• Total Amount: <strong className="text-[var(--brand-gold)] font-mono text-sm">₹{order.total_amount.toFixed(2)}</strong></div>
          <div className="text-slate-400">• Cashier: <strong className="text-white">{order.creator_name || "Staff"}</strong></div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT 2 COLS: LINE ITEMS & NOTES */}
        <div className="lg:col-span-2 space-y-5">
          {/* Cancellation Notice */}
          {order.status === "CANCELLED" && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Order Voided / Cancelled</span>
              </div>
              <p className="text-rose-700 dark:text-rose-300">
                Reason: {order.cancellation_reason || "No reason recorded"}
              </p>
            </div>
          )}

          {/* Kitchen Production Ticket Card (Phase 13 KDS) */}
          {kitchenTicket && (
            <div className="stayhub-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--foreground)]">
                      Kitchen Ticket #{kitchenTicket.ticket_number}
                    </h3>
                    <p className="text-[11px] text-[var(--foreground-muted)]">
                      Live connection to Kitchen Display System (KDS)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
                      kitchenTicket.status === "READY"
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : kitchenTicket.status === "IN_PROGRESS"
                        ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                        : kitchenTicket.status === "COMPLETED"
                        ? "bg-slate-500/20 text-slate-700 dark:text-slate-300"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    KDS: {kitchenTicket.status}
                  </span>
                  <Link href="/restaurant/kds">
                    <Button variant="outline" size="sm" className="h-7 text-xs font-semibold">
                      Open KDS
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {(kitchenTicket.items || []).map((kItem) => (
                  <div
                    key={kItem.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--secondary)]/40 border border-[var(--border)]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-[var(--primary)]">{kItem.quantity}×</span>
                      <span className="font-bold text-[var(--foreground)]">{kItem.item_name}</span>
                      {kItem.station_name && (
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-[var(--secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
                          {kItem.station_name}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        kItem.status === "READY"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : kItem.status === "IN_PROGRESS"
                          ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                          : kItem.status === "COMPLETED"
                          ? "bg-slate-500/20 text-slate-400"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {kItem.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Line Items Card */}
          <div className="stayhub-card overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[var(--brand-gold)]" />
                <h3 className="font-bold text-sm text-[var(--foreground)]">
                  Order Items ({order.items?.length || 0})
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--secondary)]/50 border-b border-[var(--border)] text-[var(--foreground-subtle)] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Dish / Item</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(order.items || []).map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--secondary)]/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[var(--foreground)]">
                          {item.item_name}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-[var(--foreground-muted)] italic mt-0.5">
                            Special Instructions: {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-extrabold text-[var(--foreground)]">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[var(--foreground-muted)]">
                        ₹{item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-[var(--foreground)]">
                        ₹{item.line_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.notes && (
              <div className="p-4 bg-[var(--secondary)]/20 border-t border-[var(--border)] text-xs">
                <span className="font-bold text-[var(--foreground-muted)] block mb-1">
                  Kitchen / Delivery Notes:
                </span>
                <p className="text-[var(--foreground)] bg-[var(--card)] p-2.5 rounded-lg border border-[var(--border)]">
                  {order.notes}
                </p>
              </div>
            )}
          </div>

          {/* Audit Timeline Card */}
          {order.events && order.events.length > 0 && (
            <div className="stayhub-card p-5 space-y-4">
              <h3 className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2 pb-3 border-b border-[var(--border)]">
                <Clock className="h-4 w-4 text-slate-400" />
                Operational History & Audit Trail
              </h3>
              <div className="space-y-3">
                {order.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="text-xs flex items-start gap-3 pb-3 border-b border-[var(--border)]/50 last:border-0 last:pb-0"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)] mt-1 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--foreground)]">
                          {ev.event_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10.5px] text-[var(--foreground-muted)]">
                          {new Date(ev.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[var(--foreground-muted)] text-[11px] mt-0.5">
                        {ev.notes || `Order status transitioned to ${ev.to_status}`}
                        {ev.performer_name && ` by ${ev.performer_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 1 COL: FINANCIAL SUMMARY & ACTIONS */}
        <div className="space-y-5">
          <div className="stayhub-card p-5 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[var(--foreground)] pb-3 border-b border-[var(--border)]">
              Payment & Bill Summary
            </h3>

            <div className="space-y-2.5">
              <div className="flex justify-between text-[var(--foreground-muted)]">
                <span>Subtotal</span>
                <span className="font-bold text-[var(--foreground)]">
                  ₹{order.subtotal.toFixed(2)}
                </span>
              </div>

              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Discount</span>
                  <span>-₹{order.discount_amount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-[var(--foreground-muted)]">
                <span>Tax Amount (GST/VAT)</span>
                <span>₹{order.tax_amount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-[var(--foreground-muted)]">
                <span>Service Charge</span>
                <span>₹{order.service_charge_amount.toFixed(2)}</span>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex justify-between items-center text-sm font-black text-[var(--foreground)]">
                <span>Total Amount</span>
                <span className="text-xl text-[var(--primary)] font-mono">
                  ₹{order.total_amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] text-[11px] text-[var(--foreground-muted)] space-y-1">
              <div>Recorded By: <strong className="text-[var(--foreground)]">{order.creator_name || "POS Staff"}</strong></div>
              <div>Billing Currency: <strong className="text-[var(--foreground)]">{order.currency}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* CANCEL ORDER MODAL */}
      <Modal
        open={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Restaurant Order"
        description={`Void order ${order.order_number}. This will release any occupied table.`}
      >
        <form onSubmit={handleCancelOrder} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-foreground mb-1">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Guest changed mind, duplicate order, kitchen out of items..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs h-8"
              required
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
