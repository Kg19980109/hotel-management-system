import * as React from "react";
import Link from "next/link";
import { Utensils, ChevronRight, Clock, CheckCircle, ChefHat, ArrowLeft, PackageCheck, Sparkles, Bell } from "lucide-react";
import { cookies } from "next/headers";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestFoodOrders } from "@/lib/guest-ordering/queries";
import { GuestLiveRefresher } from "@/components/guest/guest-live-refresher";

export const metadata = {
  title: "StayHub — Your Food Orders",
  description: "Track the real-time status of your in-room dining orders.",
};

export default async function GuestOrdersPage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("stayhub_guest_session");
  const orders = isVerifiedStay && sessionCookie?.value ? await getGuestFoodOrders(sessionCookie.value) : [];

  const activeOrders = orders.filter((o) => !["COMPLETED", "SERVED", "CANCELLED"].includes(o.status));
  const pastOrders = orders.filter((o) => ["COMPLETED", "SERVED", "CANCELLED"].includes(o.status));

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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm shadow-amber-500/10">
            <ChefHat className="w-3 h-3" />
            Kitchen Preparing
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
    <div className="p-4 space-y-6 pb-28 max-w-lg mx-auto">
      {/* Live kitchen-status updates (secure RPC refresh; anon realtime is RLS-blocked) */}
      <GuestLiveRefresher />
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/dining"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-300 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dining & Menus</span>
        </Link>
        <Link
          href="/guest/dining"
          className="text-xs text-amber-400 hover:text-amber-300 font-bold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 transition flex items-center gap-1"
        >
          <span>+ Order Food</span>
        </Link>
      </div>

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08111F] via-[#0E1B2E] to-[#08111F] border border-amber-500/20 p-5 shadow-xl">
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Room Service Tracking</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            In-Room Dining Orders
          </h2>
          <p className="text-xs text-slate-300/80">
            {isVerifiedStay && session?.room_number ? (
              <>Delivering directly to <span className="text-amber-400 font-semibold">Room {session.room_number}</span></>
            ) : (
              "Track real-time culinary preparation and delivery status."
            )}
          </p>
        </div>
      </div>

      {/* Orders List Content */}
      {orders.length === 0 ? (
        <div className="p-8 rounded-3xl bg-gradient-to-b from-[#0E1B2E]/90 to-[#08111F]/90 border border-slate-800 text-center space-y-5 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
            <Utensils className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">No Orders Placed Yet</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Your next gourmet culinary experience is just a few taps away. Explore our chef-crafted menus.
            </p>
          </div>
          <Link
            href="/guest/dining"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-[0.98]"
          >
            <Utensils className="w-4 h-4" />
            <span>Explore Dining & Menus</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active / In-Progress Orders */}
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest">
                    Active Orders ({activeOrders.length})
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Live Kitchen Tracking</span>
              </div>

              <div className="space-y-3">
                {activeOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/guest/orders/${order.id}`}
                    className="block p-4 rounded-2xl bg-gradient-to-br from-[#0E1B2E] to-[#08111F] hover:from-[#132238] hover:to-[#0B1526] border border-amber-500/30 transition-all duration-200 active:scale-[0.99] group shadow-xl relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            #{order.order_number}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                          {order.restaurant_name}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {order.item_count} {order.item_count === 1 ? "dish" : "dishes"} • Total:{" "}
                          <span className="text-amber-300 font-bold font-mono">
                            {order.currency || "INR"} {Number(order.total_amount).toFixed(2)}
                          </span>
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-amber-400 font-bold group-hover:underline flex items-center gap-1">
                        <Bell className="w-3 h-3 text-amber-400 animate-bounce" />
                        <span>Track Live Progress →</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Past / Completed Orders */}
          {pastOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Past Orders ({pastOrders.length})
                </h3>
              </div>

              <div className="space-y-2.5">
                {pastOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/guest/orders/${order.id}`}
                    className="block p-4 rounded-2xl bg-[#0E1B2E]/60 hover:bg-[#0E1B2E] border border-slate-800 transition active:scale-[0.99] group shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{order.order_number}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-200 group-hover:text-amber-300 transition">
                          {order.restaurant_name}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {order.item_count} items • {order.currency || "INR"}{" "}
                          {Number(order.total_amount).toFixed(2)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition shrink-0 ml-2" />
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(order.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-slate-400 group-hover:text-amber-400 font-medium">
                        View Receipt →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
