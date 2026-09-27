"use client";

// ============================================================
// STAYHUB GUEST CART & ROOM SERVICE CHECKOUT (Phase 6)
// With Rich Live Order Alert Confirmation Screen
// ============================================================

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  ArrowLeft, 
  BedDouble, 
  UtensilsCrossed, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Clock,
  ChefHat,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { useCart } from "./cart-context";
import { placeGuestFoodOrderAction } from "@/lib/guest-ordering/actions";
import { GuestVerifiedSessionContext } from "@/lib/guest-portal/types";
import { createClient } from "@/lib/supabase/client";

interface CartViewProps {
  session?: GuestVerifiedSessionContext | null;
}

interface OrderSuccessData {
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  roomNumber?: string;
  items: {
    menu_item_id: string;
    name: string;
    price: number;
    quantity: number;
    special_instructions?: string;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  placedAt: string;
}

export function CartView({ session }: CartViewProps) {
  const router = useRouter();
  const { restaurantId, restaurantName, items, updateQuantity, clearCart, subtotal } = useCart();
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successOrder, setSuccessOrder] = React.useState<OrderSuccessData | null>(null);

  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";
  const tax = subtotal * 0.05; // 5% GST/VAT
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (!restaurantId || items.length === 0) return;
    if (!isVerifiedStay) {
      setErrorMsg("You must be an active in-house guest with a verified room session to place room service orders. Please scan your room QR code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const idempotencyKey = `idemp-${session?.session_type || "guest"}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const orderItemsSnapshot = [...items];
    const subtotalSnapshot = subtotal;
    const taxSnapshot = tax;
    const totalSnapshot = total;
    const restNameSnapshot = restaurantName || "Restaurant";

    const payload = {
      restaurantId,
      items: items.map((i) => ({
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
        special_instructions: i.special_instructions,
      })),
      notes: notes.trim() || undefined,
      idempotencyKey,
      orderType: "ROOM_SERVICE" as const,
    };

    const res = await placeGuestFoodOrderAction(payload);
    setIsSubmitting(false);

    if (!res.success || !res.orderId) {
      setErrorMsg(res.error || "Failed to place your order. Please try again.");
      return;
    }

    // Direct sub-50ms Realtime WebSocket Broadcast to staff & KDS screens
    const targetPropId = res.propertyId || session?.property_id;
    if (targetPropId) {
      try {
        const supabase = createClient();
        const alertChannel = supabase.channel(`stayhub:operational-alerts:${targetPropId}`);
        const itemsSummary = orderItemsSnapshot.map((i) => `${i.quantity}x ${i.name}`).join(", ");
        void alertChannel.send({
          type: "broadcast",
          event: "OPERATIONAL_ALERT",
          payload: {
            id: res.orderId,
            type: "FOOD_ORDER",
            category: "ROOM_SERVICE",
            department: "RESTAURANT",
            roomNumber: res.roomNumber || session?.room_number || "—",
            guestName: res.guestName || (session?.guest_first_name ? `${session.guest_first_name} ${session.guest_last_name || ""}`.trim() : "Guest"),
            title: `Food Order #${res.orderNumber || "RS-ORDER"}`,
            description: itemsSummary ? `${itemsSummary} • ₹${res.totalAmount || totalSnapshot}` : `Total: ₹${res.totalAmount || totalSnapshot}`,
            priority: "HIGH",
            receivedAt: Date.now(),
            propertyId: targetPropId,
            status: "CONFIRMED",
          },
        });
      } catch (broadcastErr) {
        console.warn("Realtime broadcast trigger:", broadcastErr);
      }
    }

    clearCart();
    setSuccessOrder({
      orderId: res.orderId,
      orderNumber: res.orderNumber || "RS-ORDER",
      restaurantName: restNameSnapshot,
      roomNumber: res.roomNumber || session?.room_number,
      items: orderItemsSnapshot,
      subtotal: subtotalSnapshot,
      tax: taxSnapshot,
      total: totalSnapshot,
      placedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  // SUCCESS ALERT / CONFIRMATION SCREEN
  if (successOrder) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-lg mx-auto pb-24 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Status Hero Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0F1E3D] via-[#091326] to-[#040914] border border-[var(--brand-gold)]/30 text-center space-y-4 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-[var(--brand-gold)]/10 blur-2xl rounded-full pointer-events-none" />

          {/* Animated Success Badge */}
          <div className="relative mx-auto w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-11 h-11 animate-pulse" />
          </div>

          <div className="space-y-1.5 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand-gold)]/15 border border-[var(--brand-gold)]/30 text-[var(--brand-gold)] text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Order Confirmed & Sent to Kitchen
            </div>
            <h2 className="text-2xl font-black text-white font-heading tracking-tight">
              Food Order Received!
            </h2>
            <p className="text-sm font-mono font-extrabold text-[var(--brand-gold)]">
              Order #{successOrder.orderNumber}
            </p>
          </div>

          {/* Live Kitchen Status Banner */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Kitchen KDS Status</span>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  QUEUED • Culinary Team Preparing
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-bold">{successOrder.placedAt}</span>
          </div>

          {/* Room Service Delivery Destination */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-left">
            <BedDouble className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="text-[10px] uppercase font-bold text-amber-300/80">Delivery Target</span>
              <p className="font-extrabold text-amber-200">
                Room {successOrder.roomNumber ? successOrder.roomNumber : "Your Room"} • Estimated ETA: 15–25 Mins
              </p>
            </div>
          </div>
        </div>

        {/* Itemized Order Summary */}
        <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-3.5 shadow-xl text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <span className="font-extrabold text-white uppercase text-[10.5px] tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
              Ordered Items Summary
            </span>
            <span className="text-slate-400 text-[11px]">
              {successOrder.items.length} {successOrder.items.length === 1 ? "Item" : "Items"}
            </span>
          </div>

          <div className="space-y-2.5">
            {successOrder.items.map((item) => (
              <div key={item.menu_item_id} className="flex justify-between items-center text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-white font-bold flex items-center justify-center text-[10px]">
                    {item.quantity}×
                  </span>
                  <span className="font-semibold text-white text-xs">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-white">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/10 space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-slate-200">₹{successOrder.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST & Taxes (5%)</span>
              <span className="font-bold text-slate-200">₹{successOrder.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-white/10 text-sm font-black text-white">
              <span>Total Charged to Room</span>
              <span className="text-base text-[var(--brand-gold)] font-mono">
                ₹{successOrder.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5">
          <Link
            href={`/guest/orders/${successOrder.orderId}`}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[var(--brand-gold)] via-amber-400 to-[var(--brand-gold)] text-slate-950 font-black text-sm text-center shadow-xl shadow-amber-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Track Food Preparation Live</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/guest/dining"
            className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs text-center transition flex items-center justify-center gap-1.5"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Order More Food & Beverages</span>
          </Link>

          <Link
            href="/guest/home"
            className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 font-semibold text-xs text-center transition"
          >
            Return to Room Portal
          </Link>
        </div>
      </div>
    );
  }

  // EMPTY CART STATE
  if (items.length === 0) {
    return (
      <div className="p-4 space-y-6">
        <Link
          href="/guest/dining"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dining</span>
        </Link>

        <div className="p-12 rounded-3xl bg-white/[0.04] border border-white/10 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-slate-500 mx-auto flex items-center justify-center">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-white">Your Cart is Empty</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Explore our culinary menus and add freshly prepared dishes to your in-room dining order.
            </p>
          </div>
          <Link
            href="/guest/dining"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--brand-gold)] to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Explore Dining Menus</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-28">
      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between">
        <Link
          href={restaurantId ? `/guest/dining/${restaurantId}` : "/guest/dining"}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continue Ordering</span>
        </Link>
        <button
          onClick={clearCart}
          className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition"
        >
          Clear Cart
        </button>
      </div>

      {/* ── RESTAURANT & DELIVERY DESTINATION ── */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#08111F] via-[#0E1A38] to-[#121B3B] border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-gold)]">
            Room Service Order
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {restaurantName || "Restaurant"}
          </span>
        </div>

        <div className="flex items-center gap-3 pt-1 border-t border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 text-[var(--brand-gold)] flex items-center justify-center shrink-0">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Delivery Destination</span>
            <h4 className="text-sm font-extrabold text-white">
              {isVerifiedStay ? `Delivering to Room ${session?.room_number}` : "Room Service Delivery"}
            </h4>
          </div>
        </div>
      </div>

      {/* ── VERIFICATION WARNING IF NOT VERIFIED ── */}
      {!isVerifiedStay && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 shadow-md">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-300">Room Verification Required</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Please scan your in-room QR code to verify your reservation so our kitchen staff can dispatch food to your suite.
            </p>
          </div>
        </div>
      )}

      {/* ── ORDER ITEMS LIST ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Your Selected Dishes ({items.length})
        </h3>

        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.menu_item_id}
              className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-md flex items-center justify-between gap-3"
            >
              <div className="space-y-1 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {item.name}
                </h4>
                {item.special_instructions && (
                  <p className="text-[10.5px] text-amber-300/80 italic line-clamp-1">
                    Note: {item.special_instructions}
                  </p>
                )}
                <p className="text-xs font-black text-[var(--brand-gold)] font-mono">
                  ₹{(item.price * item.quantity).toFixed(2)}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">
                    (₹{item.price.toFixed(2)} each)
                  </span>
                </p>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl p-1 shrink-0">
                <button
                  onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-90 transition"
                  title="Reduce quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-black text-white w-4 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                  className="w-6 h-6 rounded-lg bg-[var(--brand-gold)] text-slate-950 flex items-center justify-center active:scale-90 transition font-bold"
                  title="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SPECIAL INSTRUCTIONS / KITCHEN NOTES ── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
          Delivery Notes & Dietary Requests
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Please knock softly, extra cutlery, dressing on side..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold)] resize-none"
        />
      </div>

      {/* ── BILL BREAKDOWN ── */}
      <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 space-y-2.5 shadow-md text-xs">
        <h4 className="font-extrabold text-white uppercase text-[10.5px] tracking-wider pb-2 border-b border-white/10">
          Payment & Charge Summary
        </h4>

        <div className="flex justify-between text-slate-400">
          <span>Subtotal</span>
          <span className="font-bold text-slate-200">₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-slate-400">
          <span>Taxes & GST (5%)</span>
          <span className="font-bold text-slate-200">₹{tax.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-slate-400">
          <span>Delivery / Room Service Charge</span>
          <span className="font-bold text-emerald-400">FREE</span>
        </div>

        <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm font-black text-white">
          <span>Total (Charged to Room Folio)</span>
          <span className="text-base text-[var(--brand-gold)] font-mono">
            ₹{total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── ERROR NOTICE ── */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── PRIMARY PLACE ORDER BUTTON ── */}
      <div className="pt-2">
        <button
          onClick={handlePlaceOrder}
          disabled={isSubmitting || !isVerifiedStay}
          className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[var(--brand-gold)] via-amber-400 to-[var(--brand-gold)] text-slate-950 font-black text-sm text-center shadow-xl shadow-amber-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending Order to Kitchen...</span>
            </>
          ) : (
            <>
              <UtensilsCrossed className="w-4 h-4" />
              <span>Place Room Service Order • ₹{total.toFixed(2)}</span>
            </>
          )}
        </button>
        <p className="text-[10px] text-slate-500 text-center mt-2">
          Charges are automatically applied to your room folio. Server-authoritative checkout.
        </p>
      </div>
    </div>
  );
}
