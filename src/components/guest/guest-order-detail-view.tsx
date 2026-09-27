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
  Receipt,
  Sparkles,
  Utensils,
  Radio,
  Share2,
  Check
} from "lucide-react";
import { GuestOrderDetail, GuestOrderItemSummary } from "@/lib/guest-ordering/types";
import { createClient } from "@/lib/supabase/client";

interface GuestOrderDetailViewProps {
  initialOrder: GuestOrderDetail;
  roomNumber?: string;
}

export function GuestOrderDetailView({ initialOrder, roomNumber }: GuestOrderDetailViewProps) {
  const router = useRouter();
  const [order, setOrder] = React.useState<GuestOrderDetail>(initialOrder);
  const [lastUpdateNotice, setLastUpdateNotice] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Real-time subscription to restaurant_orders & kitchen_tickets for instant stage updates
  React.useEffect(() => {
    const supabase = createClient();
    const orderId = initialOrder.id;
    const channel = supabase
      .channel(`stayhub:guest-order:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "restaurant_orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updated = payload.new as { status?: string };
          if (updated?.status) {
            setOrder((prev: GuestOrderDetail) => ({ ...prev, status: updated.status || prev.status }));
            setLastUpdateNotice(`Order status updated to ${updated.status}`);
            setTimeout(() => setLastUpdateNotice(null), 4000);
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
          filter: `restaurant_order_id=eq.${orderId}`,
        },
        (payload) => {
          const updated = payload.new as { status?: string };
          if (updated?.status) {
            setOrder((prev: GuestOrderDetail) => ({ ...prev, kds_status: updated.status }));
            setLastUpdateNotice(`Kitchen update: Ticket is ${updated.status}`);
            setTimeout(() => setLastUpdateNotice(null), 4000);
          }
          router.refresh();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          router.refresh();
        }
      });

    // Reconnection recovery on network recovery or window focus/visibility
    const handleReconnectSync = () => {
      router.refresh();
    };

    window.addEventListener("online", handleReconnectSync);
    document.addEventListener("visibilitychange", handleReconnectSync);

    // Fast active polling fallback (every 3s while cooking/preparing) for instant feedback
    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    }, 3000);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("online", handleReconnectSync);
      document.removeEventListener("visibilitychange", handleReconnectSync);
      clearInterval(heartbeatTimer);
    };
  }, [initialOrder.id, router]);

  // Determine stage progression: 1 = Placed, 2 = Preparing, 3 = Ready, 4 = Delivered
  let stage = 1;
  const currentOrderStatus = order.status?.toUpperCase() || "";
  const currentKdsStatus = order.kds_status?.toUpperCase() || "";

  if (
    currentOrderStatus === "PREPARING" ||
    currentOrderStatus === "IN_PROGRESS" ||
    currentKdsStatus === "IN_PROGRESS"
  ) {
    stage = 2;
  } else if (
    currentOrderStatus === "READY" ||
    currentKdsStatus === "READY"
  ) {
    stage = 3;
  } else if (
    currentOrderStatus === "COMPLETED" ||
    currentOrderStatus === "SERVED" ||
    currentKdsStatus === "COMPLETED"
  ) {
    stage = 4;
  }

  const isCancelled = order.status === "CANCELLED";

  const stages = [
    { 
      label: "Order Placed", 
      desc: "Ticket sent to kitchen", 
      icon: Clock, 
      completed: stage >= 1 
    },
    { 
      label: "Preparing", 
      desc: "Culinary team cooking", 
      icon: ChefHat, 
      completed: stage >= 2 
    },
    { 
      label: "Ready for Delivery", 
      desc: "Plated & dispatched", 
      icon: CheckCircle2, 
      completed: stage >= 3 
    },
    { 
      label: "Delivered", 
      desc: "Enjoy your dining experience", 
      icon: PackageCheck, 
      completed: stage >= 4 
    },
  ];

  const handleCopyOrderNumber = () => {
    navigator.clipboard?.writeText(order.order_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-6 pb-28 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/orders"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-300 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Orders</span>
        </Link>
        <button
          onClick={handleCopyOrderNumber}
          className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 transition flex items-center gap-1.5"
          title="Copy Order Number"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3 text-amber-400" />}
          <span>#{order.order_number}</span>
        </button>
      </div>

      {/* Real-time Status Alert Notice */}
      {lastUpdateNotice && (
        <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg">
          <Radio className="w-4 h-4 text-amber-400 animate-ping" />
          <span>{lastUpdateNotice}</span>
        </div>
      )}

      {/* Hero Status Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08111F] via-[#0E1B2E] to-[#08111F] border border-amber-500/30 p-6 shadow-2xl space-y-5">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-500/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/90 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                {order.restaurant_name}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Tracking
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight pt-1">
              {isCancelled ? "Order Cancelled" : stage === 4 ? "Order Delivered!" : stage === 3 ? "Departing Kitchen" : stage === 2 ? "Currently Cooking" : "Order Received"}
            </h2>
            <p className="text-xs text-slate-300/80">
              Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* 4-Stage Connected Stepper */}
        {!isCancelled && (
          <div className="relative pt-4 border-t border-slate-800/80">
            {/* Horizontal connecting background track */}
            <div className="absolute top-[38px] left-[12%] right-[12%] h-[3px] bg-slate-800 -z-0" />
            {/* Active filled track */}
            <div 
              className="absolute top-[38px] left-[12%] h-[3px] bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 -z-0"
              style={{
                width: stage === 1 ? "0%" : stage === 2 ? "33%" : stage === 3 ? "66%" : "76%"
              }}
            />

            <div className="grid grid-cols-4 gap-1 relative z-10">
              {stages.map((st, idx) => {
                const Icon = st.icon;
                const isCurrent = stage === idx + 1;
                return (
                  <div key={st.label} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        st.completed
                          ? "bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30 scale-105"
                          : "bg-[#0E1B2E] text-slate-500 border border-slate-700/80"
                      } ${isCurrent ? "ring-4 ring-amber-400/40 animate-pulse" : ""}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span
                        className={`text-[10px] font-bold block leading-tight ${
                          st.completed ? "text-amber-300" : "text-slate-500"
                        }`}
                      >
                        {st.label}
                      </span>
                      <span className="text-[8px] text-slate-400/70 hidden sm:block">
                        {st.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Destination Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0E1B2E] to-[#08111F] border border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Delivery Destination
            </span>
            <p className="text-xs font-bold text-white">
              {roomNumber ? `In-Room Dining • Room ${roomNumber}` : "In-Room Dining • Verified Guest Room"}
            </p>
          </div>
        </div>
        <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
          Direct to Door
        </span>
      </div>

      {/* Items Summary & Digital Receipt */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-[#0E1B2E] to-[#08111F] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Order Receipt ({order.items.length} {order.items.length === 1 ? "dish" : "dishes"})
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date(order.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
        </div>

        <div className="space-y-3">
          {order.items.map((item: GuestOrderItemSummary) => (
            <div key={item.id} className="flex items-start justify-between text-xs py-1 border-b border-slate-800/40 last:border-b-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-400 font-bold text-[10px] flex items-center justify-center">
                    {item.quantity}×
                  </span>
                  <span className="font-bold text-white">
                    {item.item_name}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-[10px] text-amber-300/80 italic pl-7">
                    &ldquo;{item.notes}&rdquo;
                  </p>
                )}
              </div>
              <span className="font-mono font-bold text-slate-200">
                {order.currency || "INR"} {Number(item.subtotal_price).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Bill Breakdown */}
        <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono text-slate-300">
              {order.currency || "INR"} {Number(order.subtotal).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Taxes & Kitchen Service</span>
            <span className="font-mono text-slate-300">
              {order.currency || "INR"} {Number(order.tax_amount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t border-slate-700/80 font-black text-white text-base">
            <span className="text-amber-400">Total Paid / Billed</span>
            <span className="font-mono text-amber-400">
              {order.currency || "INR"} {Number(order.total_amount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/guest/dining"
          className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
        >
          <Utensils className="w-4 h-4" />
          <span>Order More Dishes</span>
        </Link>
        <Link
          href="/guest/services"
          className="py-3 px-4 rounded-2xl bg-[#0E1B2E] hover:bg-[#132238] border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Services</span>
        </Link>
      </div>
    </div>
  );
}
