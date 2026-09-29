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
  others: number;
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
  const tax = Number((subtotal * 0.05).toFixed(2)); // 5% GST (2.5% CGST + 2.5% SGST)
  const others = items.length > 0 ? 2 : 0; // ₹2.00 Others (Packaging & Eco Cess)
  const total = Number((subtotal + tax + others).toFixed(2));

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
    const othersSnapshot = others;
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
        const alertChannel = supabase.channel(`stayhub:operational-alerts:${targetPropId}`, {
          config: { broadcast: { ack: false, self: false } },
        });
        const itemsSummary = orderItemsSnapshot.map((i) => `${i.quantity}x ${i.name}`).join(", ");
        const payloadData = {
          id: res.orderId,
          type: "FOOD_ORDER" as const,
          category: "ROOM_SERVICE",
          department: "RESTAURANT",
          roomNumber: res.roomNumber || session?.room_number || "—",
          guestName: res.guestName || (session?.guest_first_name ? `${session.guest_first_name} ${session.guest_last_name || ""}`.trim() : "Guest"),
          title: `Food Order #${res.orderNumber || "RS-ORDER"}`,
          description: itemsSummary ? `${itemsSummary} • ₹${res.totalAmount || totalSnapshot}` : `Total: ₹${res.totalAmount || totalSnapshot}`,
          priority: "HIGH" as const,
          receivedAt: Date.now(),
          propertyId: targetPropId,
          status: "CONFIRMED",
        };

        alertChannel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void alertChannel.send({
              type: "broadcast",
              event: "OPERATIONAL_ALERT",
              payload: payloadData,
            }).finally(() => {
              setTimeout(() => {
                void supabase.removeChannel(alertChannel);
              }, 2000);
            });
          }
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
      others: othersSnapshot,
      total: totalSnapshot,
      placedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  // ── 1. SUCCESS ALERT / CONFIRMATION SCREEN ──
  if (successOrder) {
    return (
      <div className="p-4 sm:p-5 space-y-5 max-w-lg mx-auto pb-24 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Status Hero Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0B1526] via-[#111D31] to-[#0B1526] border border-[#D4AF37]/35 text-center space-y-4 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#D4AF37]/10 blur-2xl rounded-full pointer-events-none" />

          {/* Success Badge */}
          <div className="relative mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-9 h-9 animate-pulse" />
          </div>

          <div className="space-y-1 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-[#D4AF37]/35 text-[#E4C980] text-[10.5px] font-medium tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Order Confirmed &amp; Sent to Kitchen
            </div>
            <h2 className="text-2xl font-serif font-semibold text-white tracking-tight">
              Order Received
            </h2>
            <p className="text-xs font-mono font-bold text-[#E4C980]">
              Order #{successOrder.orderNumber}
            </p>
          </div>

          {/* Live Kitchen Status Banner */}
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-[#E4C980] flex items-center justify-center shrink-0">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-300">Kitchen KDS Status</span>
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  QUEUED • Culinary Team Preparing
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-300 font-semibold">{successOrder.placedAt}</span>
          </div>

          {/* Delivery Target Destination */}
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 flex items-center gap-3 text-left">
            <BedDouble className="w-5 h-5 text-[#E4C980] shrink-0" />
            <div className="text-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-300">Delivery Destination</span>
              <p className="font-semibold text-white">
                Room {successOrder.roomNumber ? successOrder.roomNumber : "Your Suite"} • Estimated Delivery: 15–25 Mins
              </p>
            </div>
          </div>
        </div>

        {/* Itemized Order Summary */}
        <div className="p-5 rounded-3xl bg-white border border-[#EAE3D2] space-y-3.5 shadow-sm text-xs">
          <div className="flex items-center justify-between border-b border-[#EAE3D2] pb-2.5">
            <span className="font-bold text-slate-900 uppercase text-[10.5px] tracking-wider font-serif flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-[#A67C1E]" />
              Ordered Items Summary
            </span>
            <span className="text-slate-500 text-[11px] font-medium">
              {successOrder.items.length} {successOrder.items.length === 1 ? "Item" : "Items"}
            </span>
          </div>

          <div className="space-y-2.5">
            {successOrder.items.map((item) => (
              <div key={item.menu_item_id} className="flex justify-between items-center text-slate-700">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-[#FAF4E6] text-[#A67C1E] font-bold flex items-center justify-center text-[10px] shrink-0">
                    {item.quantity}×
                  </span>
                  <span className="font-medium text-slate-900 text-xs truncate">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-900 shrink-0">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#EAE3D2] space-y-2 text-slate-600">
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">₹{successOrder.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium text-slate-700">GST (5%)</span>
                <span className="text-[10px] text-slate-400 block">2.5% CGST + 2.5% SGST (Goods &amp; Services Tax)</span>
              </div>
              <span className="font-semibold text-slate-800">₹{successOrder.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium text-slate-700">Others</span>
                <span className="text-[10px] text-slate-400 block">Packaging &amp; Service Cess</span>
              </div>
              <span className="font-semibold text-slate-800">₹{(successOrder.others || 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Room Service Delivery</span>
              <span className="font-bold text-emerald-700 uppercase text-[10.5px]">COMPLIMENTARY</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-[#EAE3D2] text-sm font-bold text-slate-900 items-baseline">
              <span>Total (Charged to Room Folio)</span>
              <span className="text-base text-slate-900 font-mono font-black">
                ₹{successOrder.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5">
          <Link
            href={`/guest/orders/${successOrder.orderId}`}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 font-semibold text-xs text-center shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4 text-[#D4AF37]" />
            <span>Track Food Preparation Live</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/guest/dining"
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-[#EAE3D2] text-slate-700 font-semibold text-xs text-center transition flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#A67C1E]" />
            <span>Order More Food &amp; Beverages</span>
          </Link>

          <Link
            href="/guest/home"
            className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-slate-100 text-slate-500 font-medium text-xs text-center transition"
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
      <div className="p-4 space-y-6">
        <Link
          href="/guest/dining"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dining</span>
        </Link>

        <div className="p-10 rounded-3xl bg-white border border-[#EAE3D2] text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF4E6] border border-[#D4AF37]/30 text-[#A67C1E] mx-auto flex items-center justify-center">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-serif font-semibold text-slate-900">Your Cart is Empty</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Explore our culinary menus and add freshly prepared dishes to your in-room dining order.
            </p>
          </div>
          <Link
            href="/guest/dining"
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 font-semibold text-xs shadow-md active:scale-95 transition"
          >
            <UtensilsCrossed className="w-4 h-4 text-[#D4AF37]" />
            <span>Explore Dining Menus</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── 3. MAIN CART & CHECKOUT VIEW ──
  return (
    <div className="p-4 space-y-5 pb-28">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <Link
          href={restaurantId ? `/guest/dining/${restaurantId}` : "/guest/dining"}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continue Ordering</span>
        </Link>
        <button
          onClick={clearCart}
          className="text-xs text-rose-600 hover:text-rose-700 font-semibold transition"
        >
          Clear Cart
        </button>
      </div>

      {/* Restaurant & Delivery Destination Card (COLORFUL) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200/90 shadow-2xs space-y-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Room Service Order
          </span>
          <span className="text-[11px] font-bold text-slate-700">
            {restaurantName || "Restaurant"}
          </span>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-amber-200/70">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-amber-900/70">Delivery Target</span>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              {isVerifiedStay ? `Delivering to Room ${session?.room_number}` : "Room Service Delivery"}
            </h4>
          </div>
        </div>
      </div>

      {/* Unverified Stay Warning */}
      {!isVerifiedStay && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-900 font-serif">Room Verification Required</p>
            <p className="text-amber-700 text-[11px] leading-relaxed">
              Please scan your in-room QR code to link your stay so our culinary team can dispatch food to your suite.
            </p>
          </div>
        </div>
      )}

      {/* Selected Items List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider px-0.5 font-serif">
          Selected Dishes ({items.length})
        </h3>

        <div className="space-y-2.5">
          {items.map((item) => {
            const thumb = getCartItemThumb(item.name);

            return (
              <div
                key={item.menu_item_id}
                className="p-3 rounded-2xl bg-gradient-to-br from-amber-50/50 via-white to-orange-50/20 border border-amber-200/80 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-amber-200/80">
                    <img
                      src={thumb}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {item.name}
                    </h4>
                    {item.special_instructions && (
                      <p className="text-[10.5px] text-amber-800 font-medium italic line-clamp-1">
                        Note: {item.special_instructions}
                      </p>
                    )}
                    <p className="text-xs font-bold text-slate-900 font-mono">
                      ₹{(item.price * item.quantity).toFixed(2)}{" "}
                      <span className="text-[10px] text-slate-500 font-normal">
                        (₹{item.price.toFixed(2)} each)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Quantity Stepper & Remove */}
                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  <div className="flex items-center gap-2 bg-[#FAF8F5] border border-amber-300/80 rounded-xl p-1 shadow-2xs">
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-[#EAE3D2] text-slate-700 hover:text-slate-950 flex items-center justify-center transition-transform duration-75 active:scale-90"
                      title="Reduce quantity"
                      aria-label="Reduce quantity"
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                    <span className="text-xs font-bold text-amber-800 w-4 text-center font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-center transition-transform duration-75 active:scale-90 font-bold"
                      title="Increase quantity"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.menu_item_id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-transform duration-75 active:scale-90"
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
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider px-0.5 font-serif">
          Delivery Notes &amp; Dietary Requests
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Please knock softly, extra cutlery, dressing on side..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-3 rounded-2xl bg-white border border-[#EAE3D2] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition resize-none shadow-2xs"
        />
      </div>

      {/* Bill & Charge Breakdown (COLORFUL) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 border border-amber-200/90 space-y-2.5 shadow-2xs text-xs">
        <h4 className="font-bold text-slate-900 uppercase text-[10.5px] tracking-wider pb-2 border-b border-amber-200/70 font-serif">
          Payment &amp; Folio Summary
        </h4>

        <div className="flex justify-between items-center text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center text-slate-600">
          <div>
            <span className="font-medium text-slate-700">GST (5%)</span>
            <span className="text-[10px] text-slate-400 block">2.5% CGST + 2.5% SGST (Goods &amp; Services Tax)</span>
          </div>
          <span className="font-semibold text-slate-800">₹{tax.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center text-slate-600">
          <div>
            <span className="font-medium text-slate-700">Others</span>
            <span className="text-[10px] text-slate-400 block">Packaging &amp; Service Cess</span>
          </div>
          <span className="font-semibold text-slate-800">₹{others.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center text-slate-600">
          <span>Room Service Delivery</span>
          <span className="font-bold text-emerald-700 uppercase text-[10.5px]">COMPLIMENTARY</span>
        </div>

        <div className="pt-2 border-t border-amber-200/70 flex justify-between items-center text-sm font-bold text-slate-900">
          <span>Total (Charged to Room Folio)</span>
          <span className="text-base text-slate-900 font-mono font-black">
            ₹{total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Error Message Notice */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Order Submission Button */}
      <div className="pt-1 space-y-2">
        <button
          onClick={handlePlaceOrder}
          disabled={isSubmitting || !isVerifiedStay}
          className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:brightness-105 text-white font-bold text-sm text-center shadow-lg shadow-amber-500/25 transition-transform duration-75 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed select-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Sending Order to Kitchen...</span>
            </>
          ) : (
            <>
              <UtensilsCrossed className="w-4 h-4 text-amber-200" />
              <span>Place Room Service Order · ₹{total.toFixed(2)}</span>
            </>
          )}
        </button>
        <p className="text-[10.5px] text-slate-500 text-center">
          Charges are applied directly to your in-house room folio. Server-authoritative checkout.
        </p>
      </div>
    </div>
  );
}
