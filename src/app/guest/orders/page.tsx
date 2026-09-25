import * as React from "react";
import Link from "next/link";
import { Utensils, ChevronRight, Clock, CheckCircle, ChefHat, ArrowLeft, PackageCheck } from "lucide-react";
import { cookies } from "next/headers";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestFoodOrders } from "@/lib/guest-ordering/queries";

export const metadata = {
  title: "StayHub — Your Food Orders",
  description: "Track the status of your in-room dining orders.",
};

export default async function GuestOrdersPage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("stayhub_guest_session");
  const orders = isVerifiedStay && sessionCookie?.value ? await getGuestFoodOrders(sessionCookie.value) : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "SERVED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <PackageCheck className="w-3 h-3" />
            Delivered
          </span>
        );
      case "READY":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1 animate-pulse">
            <CheckCircle className="w-3 h-3" />
            Ready for Delivery
          </span>
        );
      case "PREPARING":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <ChefHat className="w-3 h-3" />
            Preparing
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Order Received
          </span>
        );
    }
  };

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/dining"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dining & Menus</span>
        </Link>
        <Link
          href="/guest/dining"
          className="text-xs text-amber-400 hover:underline font-semibold"
        >
          + New Order
        </Link>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-black text-white">In-Room Dining Orders</h2>
        <p className="text-xs text-slate-400">
          Track the real-time preparation and delivery status of your room service orders.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
            <Utensils className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Orders Placed Yet</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              You haven&apos;t ordered any in-room dining items during this stay yet.
            </p>
          </div>
          <Link
            href="/guest/dining"
            className="inline-block px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition"
          >
            Browse Menus
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/guest/orders/${order.id}`}
              className="block p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 transition active:scale-[0.99] group shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      #{order.order_number}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition">
                    {order.restaurant_name}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {order.item_count} {order.item_count === 1 ? "item" : "items"} • Total:{" "}
                    <span className="text-slate-200 font-bold">
                      {order.currency || "INR"} {Number(order.total_amount).toFixed(2)}
                    </span>
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition shrink-0 ml-2" />
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="text-amber-400 font-semibold group-hover:underline">
                  Track Progress →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
