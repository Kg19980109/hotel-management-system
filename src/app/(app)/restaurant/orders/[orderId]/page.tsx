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
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
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
import { ChefHat } from "lucide-react";

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
        <LoadingState message="Loading order details..." />
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
      {/* Back button & Page Header */}
      <div>
        <Link href="/restaurant/orders" className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Orders Ledger
        </Link>
        <PageHeader
          title={`Order ${order.order_number}`}
          description={`Created at ${new Date(order.created_at).toLocaleString()}`}
          actions={
            <div className="flex items-center gap-2">
              {canConfirm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConfirmOrder}
                  disabled={isSubmitting}
                  className="text-xs h-9"
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
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
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
                  className="text-xs h-9 text-rose-600 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Ban className="h-3.5 w-3.5 mr-1.5" />
                  Cancel Order
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT 2 COLS: LINE ITEMS & NOTES */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order Metadata Card */}
          <Card className="p-4 border-border bg-card">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                  Outlet
                </span>
                <span className="font-bold text-foreground mt-0.5 block">
                  {order.restaurant_name || "Restaurant"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                  Order Type
                </span>
                <div className="mt-1">
                  <OrderTypeBadge type={order.order_type} />
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                  Dining Table
                </span>
                <span className="font-bold text-foreground mt-0.5 block">
                  {order.table_number ? `Table ${order.table_number}` : "N/A (Takeaway)"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                  Status
                </span>
                <div className="mt-1">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            </div>

            {order.status === "CANCELLED" && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-xs">
                <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Order Cancelled</span>
                </div>
                <p className="text-rose-600 dark:text-rose-300 mt-1">
                  Reason: {order.cancellation_reason || "No reason recorded"}
                </p>
              </div>
            )}
          </Card>

          {/* Live Kitchen Production Ticket Card (Phase 13 KDS) */}
          {kitchenTicket && (
            <Card className="p-4 border-border bg-card">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">
                    Kitchen Ticket ({kitchenTicket.ticket_number})
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      kitchenTicket.status === "READY"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : kitchenTicket.status === "IN_PROGRESS"
                        ? "bg-indigo-500/10 text-indigo-600"
                        : kitchenTicket.status === "COMPLETED"
                        ? "bg-slate-500/10 text-slate-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    KDS: {kitchenTicket.status}
                  </span>
                </div>

                <Link href="/restaurant/kds">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Open KDS
                  </Button>
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                {(kitchenTicket.items || []).map((kItem) => (
                  <div
                    key={kItem.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{kItem.quantity}×</span>
                      <span className="font-semibold text-foreground">{kItem.item_name}</span>
                      {kItem.station_name && (
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
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
                          ? "bg-muted text-muted-foreground"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {kItem.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Line Items Card */}
          <Card className="p-4 border-border bg-card">
            <h3 className="font-bold text-sm text-foreground mb-3">
              Order Items ({order.items?.length || 0})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(order.items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-foreground">
                          {item.item_name}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-muted-foreground italic mt-0.5">
                            Note: {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-foreground">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        ${item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-foreground">
                        ${item.line_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.notes && (
              <div className="mt-4 pt-3 border-t border-border text-xs">
                <span className="font-semibold text-muted-foreground">
                  Order Instructions:
                </span>
                <p className="text-foreground mt-0.5 bg-muted/40 p-2 rounded">
                  {order.notes}
                </p>
              </div>
            )}
          </Card>

          {/* Audit Timeline Card */}
          {order.events && order.events.length > 0 && (
            <Card className="p-4 border-border bg-card">
              <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Operational History & Audit
              </h3>
              <div className="space-y-3">
                {order.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="text-xs flex items-start gap-3 pb-2.5 border-b border-border/50 last:border-0 last:pb-0"
                  >
                    <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {ev.event_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ev.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {ev.notes || `Order status transition to ${ev.to_status}`}
                        {ev.performer_name && ` by ${ev.performer_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT 1 COL: FINANCIAL SUMMARY & ACTIONS */}
        <div className="space-y-5">
          <Card className="p-4 border-border bg-card space-y-3 text-xs">
            <h3 className="font-bold text-sm text-foreground pb-2 border-b border-border">
              Bill Summary
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">
                  ${order.subtotal.toFixed(2)}
                </span>
              </div>

              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span>-${order.discount_amount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Tax Amount</span>
                <span>${order.tax_amount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Service Charge</span>
                <span>${order.service_charge_amount.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-bold text-foreground">
                <span>Total Amount</span>
                <span className="text-base text-primary">
                  ${order.total_amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border text-[11px] text-muted-foreground space-y-1">
              <div>Created by: {order.creator_name || "POS Staff"}</div>
              <div>Currency: {order.currency}</div>
            </div>
          </Card>
        </div>
      </div>

      {/* CANCEL ORDER MODAL */}
      <Modal
        open={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Restaurant Order"
        description={`Void order ${order.order_number}. This will release any occupied table.`}
      >
        <form onSubmit={handleCancelOrder} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">
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
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
