import * as React from "react";
import Link from "next/link";
import { 
  UtensilsCrossed, 
  ChevronRight, 
  Clock, 
  ChefHat, 
  ArrowLeft, 
  PackageCheck, 
  Sparkles, 
  Bell,
  CheckCircle2,
  Receipt,
  BedDouble,
} from "lucide-react";
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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <PackageCheck className="w-3 h-3 text-emerald-600" />
            Delivered
          </span>
        );
      case "READY":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
            Ready for Delivery
          </span>
        );
      case "PREPARING":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Kitchen Preparing
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF4E6] text-[#A67C1E] border border-[#D4AF37]/30 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#A67C1E]" />
            Order Received
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Live kitchen-status updates (secure realtime & relaxed fallback) */}
      <GuestLiveRefresher />

      {/* ── 1. EDITORIAL HEADER BANNER ── */}
      <div className="relative overflow-hidden bg-[#0B1526] text-white">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0B1526] via-[#111D31] to-[#0B1526]">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6 space-y-3.5">
          {/* Top Quick Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/dining"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
              aria-label="Back to Dining"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dining &amp; Menus</span>
            </Link>
            <Link
              href="/guest/dining"
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-[#E4C980] border border-[#D4AF37]/35 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>+ Order Food</span>
            </Link>
          </div>

          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-[#D4AF37]/35 text-[#E4C980] text-[10px] font-medium tracking-wide">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>Room Service Concierge</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-white tracking-tight leading-tight">
              My Orders
            </h2>
            <p className="text-xs text-slate-300/80 leading-relaxed max-w-sm">
              {isVerifiedStay && session?.room_number ? (
                <>Track live food preparation &amp; delivery history for <span className="text-[#E4C980] font-semibold">Room {session.room_number}</span>.</>
              ) : (
                "Review your active room service orders and past digital receipts."
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Orders Content */}
        {orders.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white border border-[#EAE3D2] text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF4E6] border border-[#D4AF37]/30 text-[#A67C1E] mx-auto flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-serif font-semibold text-slate-900">No Orders Placed Yet</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Your next gourmet culinary experience is just a few taps away. Explore our chef-crafted in-room dining menus.
              </p>
            </div>
            <Link
              href="/guest/dining"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 font-semibold text-xs shadow-md transition active:scale-[0.98]"
            >
              <UtensilsCrossed className="w-4 h-4 text-[#D4AF37]" />
              <span>Explore Dining &amp; Menus</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── ACTIVE / IN-PROGRESS ORDERS ── */}
            {activeOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
                      Active Orders ({activeOrders.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#A67C1E] font-semibold">Live Kitchen Tracking</span>
                </div>

                <div className="space-y-3">
                  {activeOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/guest/orders/${order.id}`}
                      className="block p-4 rounded-2xl bg-white hover:bg-slate-50 border border-[#EAE3D2] transition-all duration-200 active:scale-[0.99] group shadow-sm hover:shadow-md relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-900 bg-[#FAF4E6] border border-[#D4AF37]/30 px-2 py-0.5 rounded-md">
                              #{order.order_number}
                            </span>
                            {getStatusBadge(order.status)}
                          </div>

                          <h4 className="text-sm font-serif font-semibold text-slate-900 group-hover:text-[#A67C1E] transition truncate">
                            {order.restaurant_name}
                          </h4>

                          <p className="text-xs text-slate-600">
                            {order.item_count} {order.item_count === 1 ? "dish" : "dishes"} · Total:{" "}
                            <span className="text-slate-900 font-bold font-mono">
                              ₹{Number(order.total_amount).toFixed(2)}
                            </span>
                          </p>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-[#FAF4E6] border border-[#D4AF37]/30 flex items-center justify-center text-[#A67C1E] group-hover:bg-[#0B1526] group-hover:text-[#E4C980] transition shrink-0">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#EAE3D2] flex items-center justify-between text-[11px] text-slate-500">
                        <span>Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="text-[#A67C1E] font-semibold group-hover:underline flex items-center gap-1">
                          <Bell className="w-3 h-3 text-[#A67C1E]" />
                          <span>Track Live Progress →</span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── PAST / COMPLETED ORDERS ── */}
            {pastOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-serif">
                    Past Orders ({pastOrders.length})
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {pastOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/guest/orders/${order.id}`}
                      className="block p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-[#EAE3D2] transition active:scale-[0.99] group shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-slate-500">
                              #{order.order_number}
                            </span>
                            {getStatusBadge(order.status)}
                          </div>

                          <h4 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#A67C1E] transition truncate">
                            {order.restaurant_name}
                          </h4>

                          <p className="text-[11px] text-slate-500">
                            {order.item_count} items · ₹{Number(order.total_amount).toFixed(2)}
                          </p>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#A67C1E] group-hover:translate-x-0.5 transition shrink-0 mt-1" />
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#EAE3D2]/70 flex items-center justify-between text-[10.5px] text-slate-400">
                        <span>
                          {new Date(order.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-slate-600 group-hover:text-[#A67C1E] font-medium">
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
    </div>
  );
}
