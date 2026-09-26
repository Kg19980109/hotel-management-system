"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2, 
  ChefHat, 
  Clock, 
  PackageCheck, 
  BedDouble,
  Receipt
} from "lucide-react";
import { GuestOrderDetail, GuestOrderItemSummary } from "@/lib/guest-ordering/types";
import { createClient } from "@/lib/supabase/client";

interface GuestOrderDetailViewProps {
  initialOrder: GuestOrderDetail;
}

export function GuestOrderDetailView({ initialOrder }: GuestOrderDetailViewProps) {
  const router = useRouter();
  const [order, setOrder] = React.useState<GuestOrderDetail>(initialOrder);

  // Real-time subscription to restaurant_orders & kitchen_tickets for instant stage updates
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`stayhub:guest-order:${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "restaurant_orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const updated = payload.new as { status?: string };
          if (updated.status) {
            setOrder((prev: GuestOrderDetail) => ({ ...prev, status: updated.status || prev.status }));
          }
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_tickets",
          filter: `restaurant_order_id=eq.${order.id}`,
        },
        (payload) => {
          const updated = payload.new as { status?: string };
          if (updated?.status) {
            setOrder((prev: GuestOrderDetail) => ({ ...prev, kds_status: updated.status }));
          }
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [order.id, router]);

  // Determine stage progression: 1 = Placed, 2 = Preparing, 3 = Ready, 4 = Delivered
  let stage = 1;
  if (order.status === "PREPARING" || order.kds_status === "IN_PROGRESS") {
    stage = 2;
  } else if (order.status === "READY" || order.kds_status === "READY") {
    stage = 3;
  } else if (order.status === "COMPLETED" || order.status === "SERVED" || order.kds_status === "COMPLETED") {
    stage = 4;
  }

  const isCancelled = order.status === "CANCELLED";

  const stages = [
    { label: "Order Received", icon: Clock, completed: stage >= 1 },
    { label: "Preparing", icon: ChefHat, completed: stage >= 2 },
    { label: "Ready for Delivery", icon: CheckCircle2, completed: stage >= 3 },
    { label: "Delivered", icon: PackageCheck, completed: stage >= 4 },
  ];

  return (
    <div className="p-4 space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/orders"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Orders</span>
        </Link>
        <span className="text-xs font-mono font-bold text-amber-400">
          #{order.order_number}
        </span>
      </div>

      {/* Hero Status Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {order.restaurant_name}
          </span>
          <h2 className="text-lg font-black text-white">
            {isCancelled ? "Order Cancelled" : stage === 4 ? "Order Delivered!" : "Order in Progress"}
          </h2>
          <p className="text-xs text-slate-400">
            Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Status Stepper */}
        {!isCancelled && (
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800">
            {stages.map((st, idx) => {
              const Icon = st.icon;
              const isCurrent = stage === idx + 1;
              return (
                <div key={st.label} className="flex flex-col items-center text-center space-y-1.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      st.completed
                        ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                        : "bg-slate-800 text-slate-500"
                    } ${isCurrent ? "ring-2 ring-amber-400/50 animate-pulse" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[9px] font-semibold leading-tight ${
                      st.completed ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Destination Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Delivery Destination</span>
            <p className="text-xs font-bold text-white">Your Assigned Hotel Room</p>
          </div>
        </div>
      </div>

      {/* Items Summary */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Receipt className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Items Ordered ({order.items.length})
          </h3>
        </div>

        <div className="space-y-2.5">
          {order.items.map((item: GuestOrderItemSummary) => (
            <div key={item.id} className="flex items-start justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-white">
                  {item.quantity}x {item.item_name}
                </span>
                {item.notes && (
                  <p className="text-[10px] text-slate-400 italic">
                    &quot;{item.notes}&quot;
                  </p>
                )}
              </div>
              <span className="font-mono text-slate-300">
                {order.currency} {Number(item.subtotal_price).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Bill Breakdown */}
        <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono text-slate-300">
              {order.currency} {Number(order.subtotal).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Taxes & Fees</span>
            <span className="font-mono text-slate-300">
              {order.currency} {Number(order.tax_amount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-800/60 font-bold text-white text-sm">
            <span>Total Bill</span>
            <span className="font-mono text-amber-400">
              {order.currency} {Number(order.total_amount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
