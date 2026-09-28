"use client";

// ============================================================
// STAYHUB GUEST CART & ROOM SERVICE CHECKOUT (Phase 4 Luxury Design)
// With Editorial Confirmation Screen & Direct KDS Integration
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
  Trash2,
  ShieldCheck,
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

// Fast cached image fallback for cart items
const cartThumbCache = new Map<string, string>();
function getCartItemThumb(name: string): string {
  if (cartThumbCache.has(name)) return cartThumbCache.get(name)!;
  const text = name.toLowerCase();
  let url = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=75";
  if (text.includes("burger")) {
    url = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=75";
  } else if (text.includes("pizza")) {
    url = "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=75";
  } else if (text.includes("biryani") || text.includes("rice")) {
    url = "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=200&q=75";
  } else if (text.includes("pasta") || text.includes("noodle")) {
    url = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=75";
  } else if (text.includes("coffee") || text.includes("tea")) {
    url = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=75";
  } else if (text.includes("drink") || text.includes("cocktail") || text.includes("juice")) {
    url = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=200&q=75";
  } else if (text.includes("dessert") || text.includes("cake") || text.includes("sweet")) {
    url = "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&q=75";
  }
  cartThumbCache.set(name, url);
  return url;
}

export function CartView({ session }: CartViewProps) {
  const router = useRouter();
  const { restaurantId, restaurantName, items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successOrder, setSuccessOrder] = React.useState<OrderSuccessData | null>(null);

  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";
  const tax = subtotal * 0.05; // 5% GST/VAT
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (!restaurantId || items.length === 0 || isSubmitting) return;
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

  // ── 1. SUCCESS ALERT / CONFIRMATION SCREEN ──
  if (successOrder) {
    return (
      <div className="p-4 sm:p-5 space-y-5 max-w-lg mx-auto pb-24 animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        {/* Top Status Hero Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0B1526] via-[#101A3B] to-[#1E1B4B] border border-violet-500/40 text-center space-y-4 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-violet-600/20 blur-2xl rounded-full pointer-events-none" />

          {/* Success Badge */}
          <div className="relative mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9 animate-pulse" />
          </div>

          <div className="space-y-1 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-[10.5px] font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Order Confirmed &amp; Sent to Kitchen
            </div>
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Order Received
            </h2>
            <p className="text-xs font-mono font-bold text-violet-300">
              Order #{successOrder.orderNumber}
            </p>
          </div>

          {/* Live Kitchen Status Banner */}
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/30 text-violet-300 flex items-center justify-center shrink-0">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-300">Kitchen KDS Status</span>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  QUEUED • Culinary Team Preparing
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-300 font-bold">{successOrder.placedAt}</span>
          </div>

          {/* Delivery Target Destination */}
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 flex items-center gap-3 text-left">
            <BedDouble className="w-5 h-5 text-violet-300 shrink-0" />
            <div className="text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-300">Delivery Destination</span>
              <p className="font-bold text-white">
                Room {successOrder.roomNumber ? successOrder.roomNumber : "Your Suite"} • Estimated Delivery: 15–25 Mins
              </p>
            </div>
          </div>
        </div>

        {/* Itemized Order Summary */}
        <div className="p-5 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 space-y-3.5 shadow-lg shadow-violet-950/30 text-xs">
          <div className="flex items-center justify-between border-b border-violet-500/20 pb-2.5">
            <span className="font-bold text-white uppercase text-[10.5px] tracking-wider font-serif flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-violet-400" />
              Ordered Items Summary
            </span>
            <span className="text-violet-300 text-[11px] font-bold">
              {successOrder.items.length} {successOrder.items.length === 1 ? "Item" : "Items"}
            </span>
          </div>

          <div className="space-y-2.5">
            {successOrder.items.map((item) => (
              <div key={item.menu_item_id} className="flex justify-between items-center text-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-violet-500/20 text-violet-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-violet-500/30">
                    {item.quantity}×
                  </span>
                  <span className="font-semibold text-white text-xs truncate">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-white shrink-0">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-violet-500/20 space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-white">₹{successOrder.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST &amp; Taxes (5%)</span>
              <span className="font-bold text-white">₹{successOrder.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-violet-500/20 text-sm font-bold text-white">
              <span>Total (Charged to Room Folio)</span>
              <span className="text-base text-violet-300 font-mono">
                ₹{successOrder.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5">
          <Link
            href={`/guest/orders/${successOrder.orderId}`}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs text-center shadow-lg shadow-violet-600/30 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4 text-white" />
            <span>Track Food Preparation Live</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/guest/dining"
            className="w-full py-3 px-4 rounded-xl bg-[#111C38]/90 hover:bg-[#162347] border border-violet-500/30 text-white font-bold text-xs text-center transition flex items-center justify-center gap-1.5 shadow-md"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-violet-400" />
            <span>Order More Food &amp; Beverages</span>
          </Link>

          <Link
            href="/guest/home"
            className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-bold text-xs text-center transition"
          >
            Return to Room Portal
          </Link>
        </div>
      </div>
    );
  }

  // ── 2. EMPTY CART STATE ──
  if (items.length === 0) {
    return (
      <div className="p-4 space-y-6 text-slate-100">
        <Link
          href="/guest/dining"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dining</span>
        </Link>

        <div className="p-10 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 text-center space-y-4 shadow-lg shadow-violet-950/30">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 text-violet-300 mx-auto flex items-center justify-center">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-serif font-bold text-white">Your Cart is Empty</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Explore our culinary menus and add freshly prepared dishes to your in-room dining order.
            </p>
          </div>
          <Link
            href="/guest/dining"
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 active:scale-95 transition"
          >
            <UtensilsCrossed className="w-4 h-4 text-white" />
            <span>Explore Dining Menus</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── 3. MAIN CART & CHECKOUT VIEW ──
  return (
    <div className="p-4 space-y-5 pb-28 text-slate-100">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <Link
          href={restaurantId ? `/guest/dining/${restaurantId}` : "/guest/dining"}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continue Ordering</span>
        </Link>
        <button
          onClick={clearCart}
          className="text-xs text-rose-400 hover:text-rose-300 font-bold transition"
        >
          Clear Cart
        </button>
      </div>

      {/* Restaurant & Delivery Destination Card */}
      <div className="p-4 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 shadow-lg shadow-violet-950/30 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
            Room Service Order
          </span>
          <span className="text-[11px] font-bold text-slate-300">
            {restaurantName || "Restaurant"}
          </span>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-violet-500/20">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-500/30 text-violet-300 flex items-center justify-center shrink-0">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Delivery Target</span>
            <h4 className="text-xs sm:text-sm font-bold text-white">
              {isVerifiedStay ? `Delivering to Room ${session?.room_number}` : "Room Service Delivery"}
            </h4>
          </div>
        </div>
      </div>

      {/* Unverified Stay Warning */}
      {!isVerifiedStay && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3 shadow-md">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-white font-serif">Room Verification Required</p>
            <p className="text-amber-200 text-[11px] leading-relaxed">
              Please scan your in-room QR code to link your stay so our culinary team can dispatch food to your suite.
            </p>
          </div>
        </div>
      )}

      {/* Selected Items List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider px-0.5 font-serif">
          Selected Dishes ({items.length})
        </h3>

        <div className="space-y-2.5">
          {items.map((item) => {
            const thumb = getCartItemThumb(item.name);

            return (
              <div
                key={item.menu_item_id}
                className="p-3 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 shadow-md shadow-violet-950/20 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-violet-500/30">
                    <img
                      src={thumb}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                      {item.name}
                    </h4>
                    {item.special_instructions && (
                      <p className="text-[10.5px] text-violet-300 italic line-clamp-1">
                        Note: {item.special_instructions}
                      </p>
                    )}
                    <p className="text-xs font-bold text-white font-mono">
                      ₹{(item.price * item.quantity).toFixed(2)}{" "}
                      <span className="text-[10px] text-slate-400 font-normal">
                        (₹{item.price.toFixed(2)} each)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Quantity Stepper & Remove */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-2 bg-[#0B132B] border border-violet-500/30 rounded-xl p-1 shadow-md">
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-white/10 text-slate-300 hover:text-white flex items-center justify-center active:scale-90 transition font-bold"
                      title="Reduce quantity"
                      aria-label="Reduce quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-white w-4 text-center font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-center active:scale-90 transition font-bold shadow-xs"
                      title="Increase quantity"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.menu_item_id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition"
                    title="Remove item"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Special Delivery Notes / Dietary Requests */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider px-0.5 font-serif">
          Delivery Notes &amp; Dietary Requests
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Please knock softly, extra cutlery, dressing on side..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-3 rounded-2xl bg-[#111C38]/90 border border-violet-500/30 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 transition resize-none shadow-md"
        />
      </div>

      {/* Bill & Charge Breakdown */}
      <div className="p-4 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 space-y-2.5 shadow-lg shadow-violet-950/20 text-xs">
        <h4 className="font-bold text-white uppercase text-[10.5px] tracking-wider pb-2 border-b border-violet-500/20 font-serif">
          Payment &amp; Folio Summary
        </h4>

        <div className="flex justify-between text-slate-300">
          <span>Subtotal</span>
          <span className="font-bold text-white">₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-slate-300">
          <span>Taxes &amp; GST (5%)</span>
          <span className="font-bold text-white">₹{tax.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-slate-300">
          <span>Room Service Delivery</span>
          <span className="font-bold text-emerald-400 uppercase">COMPLIMENTARY</span>
        </div>

        <div className="pt-2 border-t border-violet-500/20 flex justify-between items-center text-sm font-bold text-white">
          <span>Total (Charged to Room Folio)</span>
          <span className="text-base text-violet-300 font-mono font-bold">
            ₹{total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Error Message Notice */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Order Submission Button */}
      <div className="pt-1 space-y-2">
        <button
          onClick={handlePlaceOrder}
          disabled={isSubmitting || !isVerifiedStay}
          className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm text-center shadow-xl shadow-violet-600/40 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Sending Order to Kitchen...</span>
            </>
          ) : (
            <>
              <UtensilsCrossed className="w-4 h-4 text-white" />
              <span>Place Room Service Order · ₹{total.toFixed(2)}</span>
            </>
          )}
        </button>
        <p className="text-[10.5px] text-slate-400 text-center font-medium">
          Charges are applied directly to your in-house room folio. Server-authoritative checkout.
        </p>
      </div>
    </div>
  );
}
