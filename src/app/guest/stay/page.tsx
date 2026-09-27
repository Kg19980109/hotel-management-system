import * as React from "react";
import Link from "next/link";
import { 
  BedDouble, 
  CalendarDays, 
  Users, 
  ShieldCheck, 
  Clock, 
  PhoneCall, 
  KeyRound,
  Utensils,
  Sparkles,
  Shirt,
  Flower2,
  Wrench,
  Receipt,
  Wifi,
  ChevronRight,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  AlertCircle,
  Copy
} from "lucide-react";
import { cookies } from "next/headers";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestFoodOrders } from "@/lib/guest-ordering/queries";
import { getGuestServiceRequests } from "@/lib/guest-services/queries";
import { GuestLiveRefresher } from "@/components/guest/guest-live-refresher";
import { WifiCopyButton } from "@/components/guest/wifi-copy-button";

export const metadata = {
  title: "StayHub — Room Stay & Tracking",
  description: "Track your room stay timeline, orders, services, and live folio balance.",
};

export default async function GuestStayPage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("stayhub_guest_session");

  const [orders, requests] = await Promise.all([
    isVerifiedStay && sessionCookie?.value ? getGuestFoodOrders(sessionCookie.value) : Promise.resolve([]),
    isVerifiedStay && sessionCookie?.value ? getGuestServiceRequests(sessionCookie.value) : Promise.resolve([]),
  ]);

  if (!session || !isVerifiedStay) {
    return (
      <div className="p-6 text-center space-y-4 my-auto min-h-[60vh] flex flex-col justify-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
          <KeyRound className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-white">No Active Verified Stay</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Please scan your in-room QR code and verify your room to unlock your stay itinerary, live orders, service requests, and folio balance.
          </p>
        </div>
        <Link
          href="/guest/home"
          className="inline-flex items-center justify-center py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-[0.98]"
        >
          Return to Guest Home
        </Link>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => !["COMPLETED", "SERVED", "CANCELLED"].includes(o.status));
  const activeRequests = requests.filter((r) => !["COMPLETED", "CANCELLED", "RESOLVED"].includes(r.status));

  // Compute total spent on food orders
  const totalFoodSpent = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return (
    <div className="p-4 space-y-6 pb-28 max-w-lg mx-auto">
      {/* Live Refresher */}
      <GuestLiveRefresher />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08111F] via-[#0E1B2E] to-[#08111F] border border-amber-500/20 p-5 shadow-xl">
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified In-House Stay</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              Room {session.room_number}
            </span>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            Room Stay & Live Tracker
          </h2>
          <p className="text-xs text-slate-300/80 leading-relaxed">
            Welcome, <span className="text-white font-bold">{session.guest_first_name} {session.guest_last_name}</span>. Track your schedule, orders, and room services.
          </p>
        </div>
      </div>

      {/* Primary Stay Itinerary Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-b from-[#0E1B2E] to-[#08111F] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Assigned Accommodation</span>
              <h3 className="text-sm font-extrabold text-white">Room {session.room_number}</h3>
            </div>
          </div>

          <span className="text-xs px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-semibold">
            {session.room_type || "Deluxe Room"}
          </span>
        </div>

        {/* Guest & Party Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <Users className="w-3 h-3 text-amber-400" />
              Primary Guest
            </span>
            <span className="text-slate-200 font-bold block truncate text-xs">
              {session.guest_first_name} {session.guest_last_name}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <Users className="w-3 h-3 text-indigo-400" />
              Party Size
            </span>
            <span className="text-slate-200 font-bold block text-xs">
              {session.adults || 1} Adult{session.adults && session.adults > 1 ? "s" : ""}
              {session.children && session.children > 0 ? `, ${session.children} Child` : ""}
            </span>
          </div>
        </div>

        {/* Stay Schedule Timeline */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <CalendarDays className="w-3 h-3 text-emerald-400" />
              Check-In Schedule
            </span>
            <span className="text-slate-200 font-bold block text-xs">
              {session.check_in_time || "Today, 14:00"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-400" />
              Expected Check-Out
            </span>
            <span className="text-amber-300 font-bold block text-xs">
              {session.expected_check_out_date || "11:00 AM"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick 1-Tap Fast Actions */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
          Quick In-Room Services
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          <Link
            href="/guest/dining"
            className="p-3 rounded-2xl bg-[#0E1B2E] hover:bg-[#132238] border border-slate-800 hover:border-amber-500/30 text-center space-y-1.5 transition active:scale-[0.98] group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center group-hover:scale-110 transition">
              <Utensils className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-white block">Order Dining</span>
          </Link>

          <Link
            href="/guest/services?category=LAUNDRY"
            className="p-3 rounded-2xl bg-[#0E1B2E] hover:bg-[#132238] border border-slate-800 hover:border-indigo-500/30 text-center space-y-1.5 transition active:scale-[0.98] group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center group-hover:scale-110 transition">
              <Shirt className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-white block">Laundry Pickup</span>
          </Link>

          <Link
            href="/guest/services?category=SPA"
            className="p-3 rounded-2xl bg-[#0E1B2E] hover:bg-[#132238] border border-slate-800 hover:border-pink-500/30 text-center space-y-1.5 transition active:scale-[0.98] group"
          >
            <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/20 text-pink-400 mx-auto flex items-center justify-center group-hover:scale-110 transition">
              <Flower2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-white block">Spa Booking</span>
          </Link>
        </div>
      </div>

      {/* In-Room Wi-Fi Connection Card */}
      {session.wifi_ssid && (
        <div className="p-4 rounded-2xl bg-[#0E1B2E] border border-slate-800 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Complimentary Room Wi-Fi</h4>
                <p className="text-[10px] text-slate-400">Network: <span className="text-slate-200 font-mono font-bold">{session.wifi_ssid}</span></p>
              </div>
            </div>
            {session.wifi_password && (
              <WifiCopyButton password={session.wifi_password} />
            )}
          </div>
        </div>
      )}

      {/* Active Orders & Requests Section */}
      <div className="space-y-4">
        {/* Active Dining Orders */}
        {activeOrders.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest">
                  Live Dining Orders ({activeOrders.length})
                </h3>
              </div>
              <Link href="/guest/orders" className="text-[10px] text-amber-400 hover:underline font-semibold">
                View All →
              </Link>
            </div>

            <div className="space-y-2">
              {activeOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/guest/orders/${order.id}`}
                  className="block p-3.5 rounded-2xl bg-[#0E1B2E] hover:bg-[#132238] border border-amber-500/30 transition shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400">
                          #{order.order_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <ChefHat className="w-3 h-3" />
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium">
                        {order.item_count} items • {order.currency || "INR"} {Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Active Service Requests */}
        {activeRequests.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                  Active Service Requests ({activeRequests.length})
                </h3>
              </div>
              <Link href="/guest/requests" className="text-[10px] text-indigo-400 hover:underline font-semibold">
                View All →
              </Link>
            </div>

            <div className="space-y-2">
              {activeRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/guest/requests/${req.id}`}
                  className="block p-3.5 rounded-2xl bg-[#0E1B2E] hover:bg-[#132238] border border-indigo-500/30 transition shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {req.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {req.category} • Requested at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-indigo-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bill & Folio Preview */}
      <Link
        href="/guest/folio"
        className="w-full p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#0E1B2E] to-[#08111F] border border-amber-500/30 flex items-center justify-between group hover:border-amber-500/50 transition shadow-xl"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
            ₹
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-extrabold text-white group-hover:text-amber-300 transition">
              View Stay Folio & Itemized Bill
            </h4>
            <p className="text-[11px] text-slate-300">
              {orders.length} in-room dining orders • Total Food: ₹{totalFoodSpent.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-amber-400 font-bold text-xs group-hover:translate-x-0.5 transition">
          <span>Folio</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </Link>

      {/* Front Desk Assistance Contact */}
      {session.front_desk_phone && (
        <a
          href={`tel:${session.front_desk_phone}`}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#0E1B2E] hover:bg-[#132238] border border-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.99]"
        >
          <PhoneCall className="w-4 h-4 text-amber-400" />
          <span>Call Front Desk ({session.front_desk_phone})</span>
        </a>
      )}
    </div>
  );
}
