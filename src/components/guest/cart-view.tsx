"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowLeft, 
  BedDouble, 
  Utensils, 
  AlertCircle,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { useCart } from "./cart-context";
import { placeGuestFoodOrderAction } from "@/lib/guest-ordering/actions";
import { GuestVerifiedSessionContext } from "@/lib/guest-portal/types";

interface CartViewProps {
  session?: GuestVerifiedSessionContext | null;
}

export function CartView({ session }: CartViewProps) {
  const router = useRouter();
  const { restaurantId, restaurantName, items, updateQuantity, clearCart, subtotal } = useCart();
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successOrder, setSuccessOrder] = React.useState<{ orderId: string; orderNumber: string } | null>(null);

  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (!restaurantId || items.length === 0) return;
    if (!isVerifiedStay) {
      setErrorMsg("You must be an active in-house guest with a verified room session to place room service orders.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      restaurantId,
      items: items.map((i) => ({
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
        special_instructions: i.special_instructions,
      })),
      notes: notes.trim() || undefined,
    };

    const res = await placeGuestFoodOrderAction(payload);
    setIsSubmitting(false);

    if (!res.success || !res.orderId) {
      setErrorMsg(res.error || "Failed to place your order. Please try again.");
      return;
    }

    clearCart();
    setSuccessOrder({
      orderId: res.orderId,
      orderNumber: res.orderNumber || "RS-ORDER",
    });

    // Auto-redirect to order tracking page
    setTimeout(() => {
      router.push(`/guest/orders/${res.orderId}`);
    }, 1200);
  };

  if (successOrder) {
    return (
      <div className="p-6 text-center space-y-4 my-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Order Confirmed!</h2>
          <p className="text-xs text-amber-400 font-mono font-semibold">
            Order #{successOrder.orderNumber}
          </p>
          <p className="text-xs text-slate-400 pt-1">
            Your in-room dining order has been received by the kitchen. Redirecting to live tracking...
          </p>
        </div>
      </div>
    );
  }

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

        <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Your Cart is Empty</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Browse our hotel dining outlets and add delicious food and beverages to your room service cart.
            </p>
          </div>
          <Link
            href="/guest/dining"
            className="inline-block px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition"
          >
            Explore Menus
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={restaurantId ? `/guest/dining/${restaurantId}` : "/guest/dining"}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>

        <button
          onClick={clearCart}
          className="text-xs text-rose-400 hover:text-rose-300 transition flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Cart</span>
        </button>
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-black text-white">Review Room Service Order</h2>
        <p className="text-xs text-slate-400">
          Ordering from <span className="text-amber-400 font-semibold">{restaurantName}</span>
        </p>
      </div>

      {/* Destination Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Delivery Destination</span>
            <p className="text-xs font-bold text-white">
              {isVerifiedStay ? `Room ${session?.room_number} • In-House` : "Unverified Room"}
            </p>
          </div>
        </div>
        {session?.guest_first_name && (
          <span className="text-xs text-slate-300 font-medium">
            {session.guest_first_name} {session.guest_last_name}
          </span>
        )}
      </div>

      {/* Cart Items List */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Order Items ({items.reduce((acc, i) => acc + i.quantity, 0)})
        </h3>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.menu_item_id}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="space-y-0.5 flex-1">
                <h4 className="text-xs font-bold text-white">{item.name}</h4>
                <p className="text-[11px] text-amber-400 font-extrabold">
                  {item.currency || "INR"} {(item.price * item.quantity).toFixed(2)}
                  <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                    ({item.price.toFixed(2)} ea)
                  </span>
                </p>
              </div>

              {/* Quantity Modifier */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1 shrink-0">
                <button
                  onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                  className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition"
                >
                  {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-rose-400" /> : <Minus className="w-3 h-3" />}
                </button>
                <span className="text-xs font-bold text-amber-400 px-1">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                  className="w-6 h-6 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Delivery Instructions / Food Preferences */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Special Kitchen or Delivery Instructions (Optional)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="E.g., No cutlery needed, extra napkins, please ring bell upon arrival."
          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
        />
      </div>

      {/* Price Summary Breakdown */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>Subtotal</span>
          <span>INR {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Estimated Taxes & Dining Levies (5%)</span>
          <span>INR {tax.toFixed(2)}</span>
        </div>
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-black text-sm text-white">
          <span>Estimated Total</span>
          <span className="text-amber-400">INR {total.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-slate-500 italic pt-1">
          * Charges will be settled directly with restaurant service. No online payment required.
        </p>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Checkout Submit CTA */}
      <button
        onClick={handlePlaceOrder}
        disabled={isSubmitting || !isVerifiedStay}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.99]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Sending Order to Kitchen...</span>
          </>
        ) : (
          <>
            <Utensils className="w-4 h-4" />
            <span>Place In-Room Dining Order</span>
          </>
        )}
      </button>
    </div>
  );
}
