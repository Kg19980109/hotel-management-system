import * as React from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Sparkles,
  Wifi,
  PhoneCall,
  BedDouble,
  ArrowRight,
  QrCode,
  Clock,
  ChevronRight,
  ShoppingBag,
  BellRing,
  CalendarDays,
  Receipt,
  Shirt,
  Car,
  Wrench,
  Users,
  CheckCircle2,
  ChefHat,
  Star,
  Flower2,
  Compass,
  Crown,
  HelpCircle,
  Coffee,
} from "lucide-react";
import { cookies } from "next/headers";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestRestaurants, getGuestFoodOrders } from "@/lib/guest-ordering/queries";
import { getGuestServiceRequests } from "@/lib/guest-services/queries";
import { WifiCopyButton } from "@/components/guest/wifi-copy-button";

function getDaysUntilCheckout(checkoutDate?: string): number | null {
  if (!checkoutDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkout = new Date(checkoutDate);
  checkout.setHours(0, 0, 0, 0);
  const diff = Math.ceil((checkout.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function GuestHomePage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("stayhub_guest_session");

  const [restaurants, orders, serviceReqs] = await Promise.all([
    getGuestRestaurants(session?.property_id),
    isVerifiedStay && sessionCookie?.value ? getGuestFoodOrders(sessionCookie.value) : Promise.resolve([]),
    isVerifiedStay && sessionCookie?.value ? getGuestServiceRequests(sessionCookie.value) : Promise.resolve([]),
  ]);

  const activeOrders = orders.filter(
    (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED" && o.status !== "SERVED"
  );
  const activeServiceReqs = serviceReqs.filter(
    (r) => r.status !== "COMPLETED" && r.status !== "CANCELLED" && r.status !== "REJECTED"
  );

  const daysLeft = getDaysUntilCheckout(session?.expected_check_out_date);

  return (
    <div className="space-y-4 pb-6">
      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#08111F] via-[#0E1A38] to-[#121B3B] border-b border-white/[0.08] px-4 pt-5 pb-4">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 rounded-full bg-[var(--brand-gold)]/12 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-32 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/25 text-[var(--brand-gold)] text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            {isVerifiedStay ? `Room ${session?.room_number} · In-House Guest` : "Digital Concierge"}
          </div>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
              {isVerifiedStay
                ? `Welcome, ${session?.guest_first_name || "Guest"}!`
                : `Welcome to ${session?.property_name || "StayHub"}`}
            </h2>
            <p className="text-xs text-slate-300/70 mt-1 leading-relaxed max-w-xs">
              {isVerifiedStay
                ? `Enjoy premium in-room dining, instant housekeeping, and seamless hotel services.`
                : `Discover dining menus, amenities & personalized guest assistance.`}
            </p>
          </div>

          {/* Stay progress bar */}
          {isVerifiedStay && daysLeft !== null && (
            <div className="pt-1 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Stay Progress</span>
                <span className="text-amber-400 font-black">
                  {daysLeft === 0 ? "Checkout Today" : `${daysLeft} night${daysLeft !== 1 ? "s" : ""} remaining`}
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                  style={{
                    width: daysLeft === 0 ? "100%" : `${Math.max(10, 100 - Math.min(daysLeft * 10, 90))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{formatDate(session?.check_in_date)}</span>
                <span>{formatDate(session?.expected_check_out_date)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* ── ACTIVE ORDER ALERTS ── */}
        {activeOrders.length > 0 && (
          <div className="space-y-2">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                href={`/guest/orders/${order.id}`}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/[0.12] border border-amber-500/30 text-white shadow-lg active:scale-[0.99] transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-black text-amber-400">
                        {order.status === "PREPARING" ? "Kitchen Preparing" : "Order " + order.status}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    </div>
                    <p className="text-xs font-bold text-white font-mono">
                      #{order.order_number} · {order.item_count} {order.item_count === 1 ? "item" : "items"} · ₹{Number(order.total_amount).toFixed(0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-bold text-amber-400 gap-1">
                  <span>Track</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── ACTIVE SERVICE REQUESTS TICKER ── */}
        {activeServiceReqs.length > 0 && (
          <Link
            href="/guest/requests"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-white active:scale-[0.99] transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-black text-indigo-300">
                  {activeServiceReqs.length} Request{activeServiceReqs.length > 1 ? "s" : ""} In Progress
                </span>
                <p className="text-xs text-slate-300">
                  {activeServiceReqs[0]?.title || "Service request pending"}
                  {activeServiceReqs.length > 1 ? ` +${activeServiceReqs.length - 1} more` : ""}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {/* ── ROOM SERVICE HERO CTA ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121B3B] via-[#0D1830] to-[#08111F] border border-[var(--brand-gold)]/30 p-5 shadow-xl">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[var(--brand-gold)]/8 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--brand-gold)]/15 border border-[var(--brand-gold)]/30 text-[var(--brand-gold)] text-[10px] font-black uppercase tracking-wider">
                Room Service & Dining
              </span>
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Kitchen Open
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Hungry? Order to Your Room
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Chef-crafted dishes & beverages delivered hot to Room {session?.room_number || "your suite"}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/guest/dining"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[var(--brand-gold)] to-amber-400 text-slate-950 font-black text-xs text-center shadow-lg shadow-amber-500/20 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
              >
                <UtensilsCrossed className="w-4 h-4" />
                Browse Menu & Order
              </Link>
              {orders.length > 0 && (
                <Link
                  href="/guest/orders"
                  className="py-2.5 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-bold text-xs border border-white/[0.12] transition flex items-center gap-1"
                  title="View Orders"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-[10px] font-black text-amber-400">{orders.length}</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── ALL HOTEL SERVICES GRID ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Hotel Services &amp; Amenities</span>
            </h3>
            <Link
              href="/guest/services"
              className="text-[10px] font-black text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
            >
              <span>Explore All</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* 1. Housekeeping */}
            <Link
              href="/guest/services?category=HOUSEKEEPING"
              className="p-3 rounded-2xl bg-[#0E1A34]/90 hover:bg-emerald-500/10 border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-white group-hover:text-emerald-300 leading-tight truncate">Housekeeping</h4>
                <p className="text-[9.5px] text-slate-400 truncate">Linens &amp; cleaning</p>
              </div>
            </Link>

            {/* 2. Front Desk */}
            <Link
              href="/guest/services?category=FRONT_DESK"
              className="p-3 rounded-2xl bg-[#0E1A34]/90 hover:bg-amber-500/10 border border-white/[0.08] hover:border-amber-500/40 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition shrink-0 shadow-sm">
                <BedDouble className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-white group-hover:text-amber-300 leading-tight truncate">Front Desk</h4>
                <p className="text-[9.5px] text-slate-400 truncate">Keys &amp; checkout</p>
              </div>
            </Link>

            {/* 3. Maintenance */}
            <Link
              href="/guest/services?category=MAINTENANCE"
              className="p-3 rounded-2xl bg-[#0E1A34]/90 hover:bg-blue-500/10 border border-white/[0.08] hover:border-blue-500/40 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-slate-950 transition shrink-0 shadow-sm">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-white group-hover:text-blue-300 leading-tight truncate">Maintenance</h4>
                <p className="text-[9.5px] text-slate-400 truncate">AC &amp; room repairs</p>
              </div>
            </Link>

            {/* 4. Laundry & Pressing */}
            <Link
              href="/guest/services?category=LAUNDRY"
              className="p-3 rounded-2xl bg-[#0E1A34]/90 hover:bg-indigo-500/10 border border-white/[0.08] hover:border-indigo-500/40 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-slate-950 transition shrink-0 shadow-sm">
                <Shirt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-white group-hover:text-indigo-300 leading-tight truncate">Laundry &amp; Press</h4>
                <p className="text-[9.5px] text-slate-400 truncate">Dry clean &amp; wash</p>
              </div>
            </Link>

            {/* 5. Spa & Wellness */}
            <Link
              href="/guest/services?category=SPA"
              className="p-3 rounded-2xl bg-[#0E1A34]/90 hover:bg-pink-500/10 border border-white/[0.08] hover:border-pink-500/40 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/20 text-pink-400 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-slate-950 transition shrink-0 shadow-sm">
                <Flower2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-white group-hover:text-pink-300 leading-tight truncate">Spa &amp; Wellness</h4>
                <p className="text-[9.5px] text-slate-400 truncate">Massage &amp; therapies</p>
              </div>
            </Link>

            {/* 6. Transport & Cabs */}
            <Link
              href="/guest/services?category=TRANSPORT"
              className="p-3 rounded-2xl bg-[#0E1A34]/90 hover:bg-teal-500/10 border border-white/[0.08] hover:border-teal-500/40 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/20 text-teal-400 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-slate-950 transition shrink-0 shadow-sm">
                <Car className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-white group-hover:text-teal-300 leading-tight truncate">Transport &amp; Cabs</h4>
                <p className="text-[9.5px] text-slate-400 truncate">Airport &amp; city taxis</p>
              </div>
            </Link>

            {/* 7. In-Room Dining Amenities */}
            <Link
              href="/guest/services?category=ROOM_SERVICE"
              className="p-3 rounded-2xl bg-[#0E1A34]/90 hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/40 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-slate-950 transition shrink-0 shadow-sm">
                <Coffee className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-white group-hover:text-rose-300 leading-tight truncate">Room Amenities</h4>
                <p className="text-[9.5px] text-slate-400 truncate">Cutlery &amp; ice bucket</p>
              </div>
            </Link>

            {/* 8. Concierge & Guidance */}
            <Link
              href="/guest/services?category=CONCIERGE"
              className="p-3 rounded-2xl bg-[#0E1A34]/90 hover:bg-purple-500/10 border border-white/[0.08] hover:border-purple-500/40 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-slate-950 transition shrink-0 shadow-sm">
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-white group-hover:text-purple-300 leading-tight truncate">Concierge &amp; Tours</h4>
                <p className="text-[9.5px] text-slate-400 truncate">Tours &amp; reservations</p>
              </div>
            </Link>

            {/* 9. Special Requests & Banquet */}
            <Link
              href="/guest/services?category=OTHER"
              className="p-3 rounded-2xl bg-[#0E1A34]/90 hover:bg-amber-500/10 border border-white/[0.08] hover:border-amber-500/40 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition shrink-0 shadow-sm">
                <Crown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-white group-hover:text-amber-300 leading-tight truncate">Special Requests</h4>
                <p className="text-[9.5px] text-slate-400 truncate">Banquet &amp; VIP cots</p>
              </div>
            </Link>

            {/* 10. Live Bill & Folio */}
            <Link
              href="/guest/folio"
              className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#0E1A34] to-[#0E1A34] hover:from-amber-500/30 border border-amber-500/30 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-sm">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-black text-amber-400 leading-tight truncate">My Room Bill</h4>
                <p className="text-[9.5px] text-slate-300 truncate">Charges &amp; payments</p>
              </div>
            </Link>
          </div>
        </div>

        {/* ── STAY DETAILS CARD (verified guests) ── */}
        {isVerifiedStay && (
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-[var(--brand-gold)]" />
                <span className="text-xs font-black text-white">
                  Room {session?.room_number}
                  {session?.room_type ? ` · ${session.room_type}` : ""}
                </span>
              </div>
              <Link
                href="/guest/stay"
                className="text-[10px] text-[var(--brand-gold)] font-black hover:underline flex items-center gap-1"
              >
                <span>Full Details</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="p-2 rounded-xl bg-slate-950/50 border border-white/5 space-y-0.5">
                <span className="text-slate-500 uppercase font-bold flex items-center gap-1">
                  <CalendarDays className="w-2.5 h-2.5" />
                  Check-in
                </span>
                <span className="text-white font-bold">{formatDate(session?.check_in_date)}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/50 border border-white/5 space-y-0.5">
                <span className="text-slate-500 uppercase font-bold flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Check-out
                </span>
                <span className="text-amber-400 font-bold">{formatDate(session?.expected_check_out_date)}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/50 border border-white/5 space-y-0.5">
                <span className="text-slate-500 uppercase font-bold flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />
                  Guests
                </span>
                <span className="text-white font-bold">
                  {session?.adults || 1}{session?.children ? `+${session.children}` : ""}
                </span>
              </div>
            </div>

            {serviceReqs.length > 0 && (
              <Link
                href="/guest/requests"
                className="flex items-center justify-between pt-3 border-t border-white/[0.08]"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-slate-300 font-bold">
                    {serviceReqs.length} service request{serviceReqs.length > 1 ? "s" : ""} this stay
                  </span>
                </div>
                <span className="text-[10px] text-amber-400 font-black">View →</span>
              </Link>
            )}
          </div>
        )}

        {/* ── WIFI CARD ── */}
        {session?.wifi_ssid && (
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <Wifi className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Complimentary Wi-Fi
                </span>
                <h4 className="text-xs font-bold text-white">{session.wifi_ssid}</h4>
              </div>
            </div>
            <WifiCopyButton ssid={session.wifi_ssid} password={session.wifi_password || ""} />
          </div>
        )}

        {/* ── UNVERIFIED QR NOTICE ── */}
        {!session && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Scan Your In-Room QR Code</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Scan the QR code in your room to verify your stay and unlock full room service, folio, and personalized concierge features.
              </p>
            </div>
          </div>
        )}

        {/* ── DINING OUTLETS ── */}
        {restaurants.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                On-Site Dining
              </h3>
              <Link href="/guest/dining" className="text-[10px] text-[var(--brand-gold)] hover:underline font-black">
                View Menu
              </Link>
            </div>

            <div className="space-y-2">
              {restaurants.map((rest) => (
                <Link
                  key={rest.id}
                  href={`/guest/dining/${rest.id}`}
                  className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] flex items-center justify-between transition active:scale-[0.99] group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white group-hover:text-[var(--brand-gold)] transition">
                          {rest.name}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-emerald-400" />
                          Open
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {rest.description || "Fine dining, cocktails & in-room service"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── FRONT DESK CALL ── */}
        {session?.front_desk_phone && (
          <a
            href={`tel:${session.front_desk_phone}`}
            className="w-full p-4 rounded-2xl bg-[#0E1B2E] border border-slate-800 hover:border-amber-500/30 flex items-center gap-3 transition shadow-md group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition">
                Call Front Desk
              </h4>
              <p className="text-[10px] text-slate-400">24/7 · {session.front_desk_phone}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 ml-auto transition" />
          </a>
        )}
      </div>
    </div>
  );
}
