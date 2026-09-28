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
  ]);  if (!session || !isVerifiedStay) {
    return (
      <div className="p-6 text-center space-y-4 my-auto min-h-[60vh] flex flex-col justify-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-violet-950/60 border border-violet-500/30 text-violet-300 mx-auto flex items-center justify-center shadow-lg shadow-violet-950/30">
          <KeyRound className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-serif font-bold text-white">No Active Verified Stay</h1>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Please scan your in-room QR code to access your private stay itinerary, live orders, service requests, and digital folio.
          </p>
        </div>
        <Link
          href="/guest/home"
          className="inline-flex items-center justify-center py-3 px-6 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-950/40 transition active:scale-[0.98]"
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

      {/* ── 1. LUXURY VIOLET HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B132B] border border-violet-500/30 text-white shadow-xl shadow-violet-950/40">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-violet-900/30 via-[#0B132B] to-indigo-950/40 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-600/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-200 text-[10.5px] font-semibold tracking-wide backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>Verified In-House Stay</span>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-violet-950/70 text-violet-300 font-bold border border-violet-500/30 backdrop-blur-xs">
              Room {session.room_number}
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
              My Stay
            </h1>
            <p className="text-xs text-slate-300/85 leading-relaxed max-w-md font-sans">
              Welcome, <span className="text-white font-bold">{session.guest_first_name} {session.guest_last_name}</span>. Everything about your stay, in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 max-w-lg mx-auto">
        {/* ── 2. STAY OVERVIEW & PROGRESS CARD ── */}
        <div className="p-5 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 space-y-4 shadow-lg shadow-violet-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-violet-950/60 border border-violet-500/30 text-violet-300 flex items-center justify-center shadow-xs">
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-violet-400 uppercase font-bold block font-sans">
                  {session.property_name || "Hotel Accommodation"}
                </span>
                <h2 className="text-sm font-serif font-bold text-white">Room {session.room_number}</h2>
              </div>
            </div>

            <span className="text-xs px-3 py-1 rounded-full bg-violet-950/70 border border-violet-500/30 text-violet-200 font-semibold">
              {session.room_type || "Deluxe Room"}
            </span>
          </div>

          {/* Stay Timeline Progress */}
          <div className="p-3.5 rounded-2xl bg-[#0B132B]/80 border border-violet-500/20 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-violet-300 uppercase tracking-wider font-sans text-[10px]">
                Stay Status
              </span>
              <span className="text-emerald-300 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                In-House Guest
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1">
              <div className="text-center space-y-1">
                <div className="h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9.5px] font-semibold text-slate-300 block">Check-In</span>
                <span className="text-[9px] text-slate-400 block">{session.check_in_time || "14:00"}</span>
              </div>
              <div className="text-center space-y-1">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
                <span className="text-[9.5px] font-bold text-white block">Your Stay</span>
                <span className="text-[9px] text-violet-300 font-medium block">Active</span>
              </div>
              <div className="text-center space-y-1">
                <div className="h-1.5 rounded-full bg-slate-700" />
                <span className="text-[9.5px] font-semibold text-slate-400 block">Check-Out</span>
                <span className="text-[9px] text-slate-400 block">{session.expected_check_out_date || "11:00 AM"}</span>
              </div>
            </div>
          </div>

          {/* Guest & Party Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#0B132B]/70 border border-violet-500/20 space-y-1">
              <span className="text-[10px] text-violet-400 uppercase font-bold flex items-center gap-1.5 font-sans">
                <Users className="w-3 h-3 text-violet-400" />
                Primary Guest
              </span>
              <span className="text-white font-semibold block truncate text-xs">
                {session.guest_first_name} {session.guest_last_name}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0B132B]/70 border border-violet-500/20 space-y-1">
              <span className="text-[10px] text-violet-400 uppercase font-bold flex items-center gap-1.5 font-sans">
                <Users className="w-3 h-3 text-indigo-400" />
                Party Size
              </span>
              <span className="text-white font-semibold block text-xs">
                {session.adults || 1} Adult{session.adults && session.adults > 1 ? "s" : ""}
                {session.children && session.children > 0 ? `, ${session.children} Child` : ""}
              </span>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#0B132B]/70 border border-violet-500/20 space-y-1">
              <span className="text-[10px] text-violet-400 uppercase font-bold flex items-center gap-1.5 font-sans">
                <CalendarDays className="w-3 h-3 text-emerald-400" />
                Check-In Date
              </span>
              <span className="text-white font-semibold block text-xs">
                {session.check_in_time || "Standard 14:00"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0B132B]/70 border border-violet-500/20 space-y-1">
              <span className="text-[10px] text-violet-400 uppercase font-bold flex items-center gap-1.5 font-sans">
                <Clock className="w-3 h-3 text-violet-400" />
                Expected Check-Out
              </span>
              <span className="text-white font-semibold block text-xs">
                {session.expected_check_out_date || "11:00 AM"}
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. QUICK CONCIERGE ACTIONS ── */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider px-1 font-sans">
            Hotel Stay Services
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            <Link
              href="/guest/dining"
              className="p-3 rounded-2xl bg-[#111C38]/90 hover:bg-[#152347] border border-violet-500/25 hover:border-violet-400/50 text-center space-y-1.5 transition active:scale-[0.98] group shadow-md shadow-violet-950/20 backdrop-blur-md"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-950/60 text-violet-300 border border-violet-500/30 mx-auto flex items-center justify-center group-hover:scale-105 transition">
                <UtensilsCrossed className="w-4 h-4 text-violet-300" />
              </div>
              <span className="text-[11px] font-semibold text-white block">In-Room Dining</span>
            </Link>

            <Link
              href="/guest/services?category=HOUSEKEEPING"
              className="p-3 rounded-2xl bg-[#111C38]/90 hover:bg-[#152347] border border-violet-500/25 hover:border-violet-400/50 text-center space-y-1.5 transition active:scale-[0.98] group shadow-md shadow-violet-950/20 backdrop-blur-md"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 mx-auto flex items-center justify-center group-hover:scale-105 transition">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[11px] font-semibold text-white block">Housekeeping</span>
            </Link>

            <Link
              href="/guest/hotel"
              className="p-3 rounded-2xl bg-[#111C38]/90 hover:bg-[#152347] border border-violet-500/25 hover:border-violet-400/50 text-center space-y-1.5 transition active:scale-[0.98] group shadow-md shadow-violet-950/20 backdrop-blur-md"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-950/60 text-purple-300 border border-purple-500/30 mx-auto flex items-center justify-center group-hover:scale-105 transition">
                <Building2 className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-[11px] font-semibold text-white block">Hotel Guide</span>
            </Link>
          </div>
        </div>

        {/* ── 4. IN-ROOM WI-FI CONNECTION CARD ── */}
        {session.wifi_ssid && (
          <div className="p-4 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 space-y-2.5 shadow-md shadow-violet-950/15 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-950/60 text-sky-300 border border-sky-500/30 flex items-center justify-center">
                  <Wifi className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-xs font-serif font-bold text-white">Complimentary Room Wi-Fi</h3>
                  <p className="text-[10px] text-slate-300">Network: <span className="text-violet-300 font-mono font-bold">{session.wifi_ssid}</span></p>
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
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans">
                    Live Dining Orders ({activeOrders.length})
                  </h2>
                </div>
                <Link href="/guest/orders" className="text-[10.5px] text-violet-300 hover:underline font-semibold">
                  View Orders →
                </Link>
              </div>

              <div className="space-y-2">
                {activeOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/guest/orders/${order.id}`}
                    className="block p-3.5 rounded-2xl bg-[#111C38]/90 hover:bg-[#152347] border border-violet-500/25 hover:border-violet-400/50 transition shadow-md shadow-violet-950/20 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white bg-violet-950/70 px-2 py-0.5 rounded-md border border-violet-500/30">
                            #{order.order_number}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <ChefHat className="w-3 h-3" />
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {order.item_count} items • {order.currency || "INR"} {Number(order.total_amount).toFixed(2)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-violet-400" />
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
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans">
                    Active Concierge Requests ({activeRequests.length})
                  </h2>
                </div>
                <Link href="/guest/requests" className="text-[10.5px] text-violet-300 hover:underline font-semibold">
                  View Requests →
                </Link>
              </div>

              <div className="space-y-2">
                {activeRequests.map((req) => (
                  <Link
                    key={req.id}
                    href={`/guest/requests/${req.id}`}
                    className="block p-3.5 rounded-2xl bg-[#111C38]/90 hover:bg-[#152347] border border-violet-500/25 hover:border-violet-400/50 transition shadow-md shadow-violet-950/20 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            {req.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            {req.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {req.category} • Requested at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-violet-400" />
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
          className="w-full p-4 rounded-3xl bg-[#111C38]/90 hover:bg-[#152347] border border-violet-500/25 hover:border-violet-400/50 flex items-center justify-between group transition shadow-lg shadow-violet-950/20 backdrop-blur-md"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-violet-900/30">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-sm font-serif font-bold text-white group-hover:text-violet-300 transition">
                Stay Folio &amp; Digital Statement
              </h2>
              <p className="text-[11px] text-slate-300">
                {orders.length} dining orders • Total Food: ₹{totalFoodSpent.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-violet-300 font-semibold text-xs group-hover:translate-x-0.5 transition">
            <span>View Folio</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {session.front_desk_phone && (
          <a
            href={`tel:${session.front_desk_phone}`}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-950/40 transition active:scale-[0.99]"
          >
            <PhoneCall className="w-4 h-4 text-violet-200" />
            <span>Call Front Desk ({session.front_desk_phone})</span>
          </a>
        )}
      </div>
    </div>
  );
}
