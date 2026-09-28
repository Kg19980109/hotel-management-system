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
  UtensilsCrossed,
  Sparkles,
  Shirt,
  Flower2,
  Wrench,
  Receipt,
  Wifi,
  ChevronRight,
  CheckCircle2,
  ChefHat,
  BellRing,
  Compass,
  Building2,
  ArrowRight,
} from "lucide-react";
import { cookies } from "next/headers";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestFoodOrders } from "@/lib/guest-ordering/queries";
import { getGuestServiceRequests } from "@/lib/guest-services/queries";
import { GuestLiveRefresher } from "@/components/guest/guest-live-refresher";
import { WifiCopyButton } from "@/components/guest/wifi-copy-button";

export const metadata = {
  title: "StayHub — My Stay",
  description: "Your luxury stay overview, room details, live itinerary, orders, and services.",
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
        <div className="w-16 h-16 rounded-3xl bg-[#FAF4E6] border border-[#D4AF37]/30 text-[#A67C1E] mx-auto flex items-center justify-center shadow-sm">
          <KeyRound className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-serif font-semibold text-slate-900">No Active Verified Stay</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Please scan your in-room QR code to access your private stay itinerary, live orders, service requests, and digital folio.
          </p>
        </div>
        <Link
          href="/guest/home"
          className="inline-flex items-center justify-center py-3 px-6 rounded-2xl bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 font-semibold text-xs shadow-md transition active:scale-[0.98]"
        >
          Return to Guest Home
        </Link>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => !["COMPLETED", "SERVED", "CANCELLED"].includes(o.status));
  const activeRequests = requests.filter((r) => !["COMPLETED", "CANCELLED", "RESOLVED"].includes(r.status));

  const totalFoodSpent = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return (
    <div className="space-y-5 pb-28">
      {/* Live Refresher for stay updates */}
      <GuestLiveRefresher />

      {/* ── 1. EDITORIAL HEADER BANNER ── */}
      <div className="relative overflow-hidden bg-[#0B1526] text-white">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0B1526] via-[#111D31] to-[#0B1526]">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-[#D4AF37]/35 text-[#E4C980] text-[10.5px] font-medium tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Verified In-House Stay</span>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#FAF4E6]/15 text-[#E4C980] font-semibold border border-[#D4AF37]/30 backdrop-blur-xs">
              Room {session.room_number}
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-white tracking-tight leading-tight">
              My Stay
            </h1>
            <p className="text-xs text-slate-300/80 leading-relaxed max-w-md">
              Welcome, <span className="text-white font-semibold">{session.guest_first_name} {session.guest_last_name}</span>. Everything about your stay, in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5 max-w-lg mx-auto">
        {/* ── 2. STAY OVERVIEW & PROGRESS CARD ── */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border border-amber-200/90 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

          <div className="flex items-center justify-between pb-3 border-b border-amber-200/70 pt-0.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/25 flex items-center justify-center">
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-amber-800 uppercase font-bold block font-serif">
                  {session.property_name || "Hotel Accommodation"}
                </span>
                <h2 className="text-sm font-serif font-bold text-slate-900">Room {session.room_number}</h2>
              </div>
            </div>

            <span className="text-xs px-3 py-1 rounded-full bg-amber-100/90 border border-amber-300/80 text-amber-900 font-bold">
              {session.room_type || "Deluxe Room"}
            </span>
          </div>

          {/* Stay Timeline Progress */}
          <div className="p-3.5 rounded-2xl bg-white/90 border border-amber-200/70 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-800 uppercase tracking-wider font-serif text-[10px]">
                Stay Status
              </span>
              <span className="text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                In-House Guest
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1">
              <div className="text-center space-y-1">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                <span className="text-[9.5px] font-bold text-slate-800 block">Check-In</span>
                <span className="text-[9px] text-slate-500 block">{session.check_in_time || "14:00"}</span>
              </div>
              <div className="text-center space-y-1">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600" />
                <span className="text-[9.5px] font-bold text-amber-900 block">Your Stay</span>
                <span className="text-[9px] text-amber-700 font-bold block">Active</span>
              </div>
              <div className="text-center space-y-1">
                <div className="h-1.5 rounded-full bg-slate-200" />
                <span className="text-[9.5px] font-semibold text-slate-500 block">Check-Out</span>
                <span className="text-[9px] text-slate-500 block">{session.expected_check_out_date || "11:00 AM"}</span>
              </div>
            </div>
          </div>

          {/* Guest & Party Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200/80 space-y-1 shadow-2xs">
              <span className="text-[10px] text-amber-800 uppercase font-bold flex items-center gap-1.5 font-serif">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                Primary Guest
              </span>
              <span className="text-slate-900 font-bold block truncate text-xs">
                {session.guest_first_name} {session.guest_last_name}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border border-indigo-200/80 space-y-1 shadow-2xs">
              <span className="text-[10px] text-indigo-800 uppercase font-bold flex items-center gap-1.5 font-serif">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Party Size
              </span>
              <span className="text-slate-900 font-bold block text-xs">
                {session.adults || 1} Adult{session.adults && session.adults > 1 ? "s" : ""}
                {session.children && session.children > 0 ? `, ${session.children} Child` : ""}
              </span>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border border-emerald-200/80 space-y-1 shadow-2xs">
              <span className="text-[10px] text-emerald-800 uppercase font-bold flex items-center gap-1.5 font-serif">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                Check-In Date
              </span>
              <span className="text-slate-900 font-bold block text-xs">
                {session.check_in_time || "Standard 14:00"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50/80 via-white to-sky-50/30 border border-sky-200/80 space-y-1 shadow-2xs">
              <span className="text-[10px] text-sky-800 uppercase font-bold flex items-center gap-1.5 font-serif">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                Expected Check-Out
              </span>
              <span className="text-slate-900 font-bold block text-xs">
                {session.expected_check_out_date || "11:00 AM"}
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. QUICK CONCIERGE ACTIONS ── */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider px-1 font-serif">
            Hotel Stay Services
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            <Link
              href="/guest/dining"
              className="p-3 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200/90 hover:border-amber-300 text-center space-y-1.5 transition active:scale-95 duration-75 tap-active group shadow-2xs relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600" />
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/25 mx-auto flex items-center justify-center group-hover:scale-105 transition">
                <UtensilsCrossed className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-slate-900 block">In-Room Dining</span>
            </Link>

            <Link
              href="/guest/services?category=HOUSEKEEPING"
              className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border border-emerald-200/90 hover:border-emerald-300 text-center space-y-1.5 transition active:scale-95 duration-75 tap-active group shadow-2xs relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-600" />
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/25 mx-auto flex items-center justify-center group-hover:scale-105 transition">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-slate-900 block">Housekeeping</span>
            </Link>

            <Link
              href="/guest/hotel"
              className="p-3 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 border border-purple-200/90 hover:border-purple-300 text-center space-y-1.5 transition active:scale-95 duration-75 tap-active group shadow-2xs relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-600" />
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md shadow-purple-500/25 mx-auto flex items-center justify-center group-hover:scale-105 transition">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-slate-900 block">Hotel Guide</span>
            </Link>
          </div>
        </div>

        {/* ── 4. IN-ROOM WI-FI CONNECTION CARD ── */}
        {session.wifi_ssid && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/80 via-white to-sky-50/30 border border-sky-200/90 space-y-2.5 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600" />
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/25 flex items-center justify-center">
                  <Wifi className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-serif font-bold text-slate-900">Complimentary Room Wi-Fi</h3>
                  <p className="text-[10px] text-slate-500">Network: <span className="text-slate-800 font-mono font-bold">{session.wifi_ssid}</span></p>
                </div>
              </div>
              {session.wifi_password && (
                <WifiCopyButton password={session.wifi_password} />
              )}
            </div>
          </div>
        )}

        {/* ── 5. ACTIVE ORDERS & SERVICE REQUESTS ── */}
        <div className="space-y-4">
          {/* Active Dining Orders */}
          {activeOrders.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-sm shadow-amber-500/50" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
                    Live Dining Orders ({activeOrders.length})
                  </h2>
                </div>
                <Link href="/guest/orders" className="text-[10.5px] text-amber-700 hover:underline font-bold">
                  View Orders →
                </Link>
              </div>

              <div className="space-y-2">
                {activeOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/guest/orders/${order.id}`}
                    className="block p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200/90 hover:border-amber-300 transition active:scale-95 duration-75 tap-active shadow-2xs relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600" />
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300/80">
                            #{order.order_number}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <ChefHat className="w-3 h-3 text-amber-700" />
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {order.item_count} items • {order.currency || "INR"} <span className="font-mono font-bold text-slate-800">{Number(order.total_amount).toFixed(2)}</span>
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
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
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-sm shadow-indigo-500/50" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
                    Active Concierge Requests ({activeRequests.length})
                  </h2>
                </div>
                <Link href="/guest/requests" className="text-[10.5px] text-indigo-700 hover:underline font-bold">
                  View Requests →
                </Link>
              </div>

              <div className="space-y-2">
                {activeRequests.map((req) => (
                  <Link
                    key={req.id}
                    href={`/guest/requests/${req.id}`}
                    className="block p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border border-indigo-200/90 hover:border-indigo-300 transition active:scale-95 duration-75 tap-active shadow-2xs relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-violet-600" />
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {req.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                            {req.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {req.category} • Requested at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 6. BILL & FOLIO PREVIEW ── */}
        <Link
          href="/guest/folio"
          className="w-full p-4 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 hover:from-amber-100/80 hover:via-white hover:to-amber-50/50 border border-amber-200/90 hover:border-amber-300 flex items-center justify-between group transition active:scale-95 duration-75 tap-active shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
          <div className="flex items-center gap-3.5 pt-0.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/25 flex items-center justify-center font-bold text-base">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-sm font-serif font-bold text-slate-900 group-hover:text-amber-800 transition">
                Stay Folio &amp; Digital Statement
              </h2>
              <p className="text-[11px] text-slate-600">
                {orders.length} dining orders • Total Food: <span className="font-mono font-bold text-slate-900">₹{totalFoodSpent.toFixed(2)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-amber-700 font-bold text-xs group-hover:translate-x-0.5 transition">
            <span>View Folio</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {/* ── 7. FRONT DESK ASSISTANCE BUTTON ── */}
        {session.front_desk_phone && (
          <a
            href={`tel:${session.front_desk_phone}`}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0B1526] via-[#111D31] to-[#0B1526] hover:brightness-110 border border-[#D4AF37]/35 text-[#E4C980] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 duration-75 tap-active"
          >
            <PhoneCall className="w-4 h-4 text-[#D4AF37]" />
            <span>Call Front Desk ({session.front_desk_phone})</span>
          </a>
        )}
      </div>
    </div>
  );
}
