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
  UtensilsCrossed,
  Radio,
  Share2,
  Check,
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

    // Smart conditional fallback (25s while active/cooking) for safety, stops on terminal states
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    const isTerminal = ["COMPLETED", "SERVED", "CANCELLED"].includes(initialOrder.status?.toUpperCase() || "");
    if (!isTerminal) {
      heartbeatTimer = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        router.refresh();
      }, 25000);
    }

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("online", handleReconnectSync);
      document.removeEventListener("visibilitychange", handleReconnectSync);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    };
  }, [initialOrder.id, initialOrder.status, router]);

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

  const getStatusMessage = () => {
    if (isCancelled) return "This order was cancelled.";
    if (stage === 4) return "Your order has been delivered to your suite. Enjoy your meal!";
    if (stage === 3) return "Your order is plated, checked, and departing the kitchen.";
    if (stage === 2) return "Our culinary team is currently preparing your dishes.";
    return "Your order has been received and queued with the kitchen team.";
  };

  const stages = [
    { 
      label: "Order Placed", 
      desc: "Received by kitchen", 
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
      label: "Ready", 
      desc: "Plated & dispatched", 
      icon: CheckCircle2, 
      completed: stage >= 3 
    },
    { 
      label: "Delivered", 
      desc: "Delivered to room", 
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
    <div className="space-y-5 pb-28 max-w-lg mx-auto">
      {/* ── 1. TOP HEADER & BREADCRUMB ── */}
      <div className="px-4 pt-3 flex items-center justify-between">
        <Link
          href="/guest/orders"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition"
          aria-label="Back to All Orders"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Orders</span>
        </Link>
        <button
          onClick={handleCopyOrderNumber}
          className="text-xs font-mono font-semibold text-[#A67C1E] hover:text-[#8C6819] px-3 py-1 rounded-full bg-[#FAF4E6] border border-[#D4AF37]/30 transition flex items-center gap-1.5 shadow-2xs active:scale-95"
          title="Copy Order Number"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-[#A67C1E]" />}
          <span>#{order.order_number}</span>
        </button>
      </div>

      {/* ── REALTIME BROADCAST UPDATE NOTICE ── */}
      {lastUpdateNotice && (
        <div className="mx-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
          <Radio className="w-4 h-4 text-amber-600 animate-ping" />
          <span>{lastUpdateNotice}</span>
        </div>
      )}

      {/* ── 2. HERO STATUS & PROGRESS CARD ── */}
      <div className="mx-4 relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0B1526] via-[#111D31] to-[#0B1526] text-white p-5 sm:p-6 shadow-xl border border-[#D4AF37]/35 space-y-5">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[#E4C980] bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15 truncate">
                {order.restaurant_name}
              </span>
              {!isCancelled && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Tracking
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-serif font-semibold text-white tracking-tight pt-0.5">
              {isCancelled ? "Order Cancelled" : stage === 4 ? "Order Delivered" : stage === 3 ? "Ready for Delivery" : stage === 2 ? "Currently Cooking" : "Order Received"}
            </h2>

            <p className="text-xs text-slate-300/80 leading-relaxed max-w-sm">
              {getStatusMessage()}
            </p>
          </div>
        </div>

        {/* 4-Stage Connected Stepper */}
        {!isCancelled && (
          <div className="relative pt-3 border-t border-white/10">
            {/* Horizontal Track (Mobile/Tablet) */}
            <div className="absolute top-[38px] left-[10%] right-[10%] h-[2px] bg-white/15 -z-0" />
            <div 
              className="absolute top-[38px] left-[10%] h-[2px] bg-gradient-to-r from-[#D4AF37] to-[#E4C980] transition-all duration-500 -z-0"
              style={{
                width: stage === 1 ? "0%" : stage === 2 ? "28%" : stage === 3 ? "58%" : "80%"
              }}
            />

            <div className="grid grid-cols-4 gap-1 relative z-10">
              {stages.map((st, idx) => {
                const Icon = st.icon;
                const isCurrent = stage === idx + 1;
                return (
                  <div key={st.label} className="flex flex-col items-center text-center space-y-1.5">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        st.completed
                          ? "bg-gradient-to-br from-[#D4AF37] to-[#E4C980] text-[#0B1526] font-bold shadow-md shadow-amber-500/20"
                          : "bg-white/10 text-slate-400 border border-white/10"
                      } ${isCurrent ? "ring-4 ring-[#D4AF37]/30 animate-pulse" : ""}`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span
                        className={`text-[10px] sm:text-[11px] font-semibold block leading-tight ${
                          st.completed ? "text-[#E4C980]" : "text-slate-400"
                        }`}
                      >
                        {st.label}
                      </span>
                      <span className="text-[8.5px] text-slate-300/70 hidden sm:block">
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

      <div className="px-4 space-y-4">
        {/* ── 3. DELIVERY DESTINATION CARD ── */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/80 via-white to-sky-50/30 border border-sky-200/90 flex items-center justify-between shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600" />
          <div className="flex items-center gap-3.5 min-w-0 pt-0.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/25 flex items-center justify-center shrink-0">
              <BedDouble className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] uppercase font-bold text-sky-700 tracking-wider">
                Delivery Target
              </span>
              <p className="text-xs font-bold text-slate-900 truncate">
                {roomNumber ? `In-Room Dining · Room ${roomNumber}` : "In-Room Dining · Verified Guest Suite"}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-sky-800 font-bold px-2.5 py-1 rounded-full bg-sky-100/90 border border-sky-300/80 shrink-0">
            Direct to Door
          </span>
        </div>

        {/* ── 4. DIGITAL ORDER RECEIPT ── */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border border-amber-200/90 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

          <div className="flex items-center justify-between pb-3 border-b border-amber-200/70 pt-0.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
                Digital Order Receipt ({order.items.length} {order.items.length === 1 ? "dish" : "dishes"})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {new Date(order.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
          </div>

          <div className="space-y-2.5">
            {order.items.map((item: GuestOrderItemSummary) => (
              <div key={item.id} className="flex items-start justify-between text-xs py-1 border-b border-amber-100 last:border-b-0 gap-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0 border border-amber-300/60">
                      {item.quantity}×
                    </span>
                    <span className="font-bold text-slate-900 truncate">
                      {item.item_name}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-[10px] text-amber-800 italic pl-7 line-clamp-2">
                      &ldquo;{item.notes}&rdquo;
                    </p>
                  )}
                </div>
                <span className="font-mono font-bold text-slate-900 shrink-0">
                  ₹{Number(item.subtotal_price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Bill Breakdown */}
          <div className="pt-3 border-t border-amber-200/80 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-slate-800">
                ₹{Number(order.subtotal).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Taxes &amp; GST (5%)</span>
              <span className="font-mono font-semibold text-slate-800">
                ₹{Number(order.tax_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Room Service Delivery</span>
              <span className="font-bold text-emerald-700 uppercase text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">COMPLIMENTARY</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-amber-200/80 font-bold text-slate-900 text-sm">
              <span className="font-serif">Total Charged to Room</span>
              <span className="font-mono text-base text-slate-900 font-bold">
                ₹{Number(order.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── 5. QUICK ACTIONS ── */}
        <div className="space-y-2.5 pt-1">
          <Link
            href="/guest/dining"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs text-center shadow-md shadow-amber-500/20 active:scale-95 duration-75 tap-active transition flex items-center justify-center gap-2"
          >
            <UtensilsCrossed className="w-4 h-4 text-white" />
            <span>Order More Dishes</span>
          </Link>

          <Link
            href="/guest/services"
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-[#EAE3D2] text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 duration-75 tap-active shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Hospitality Services</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
