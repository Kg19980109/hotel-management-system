import * as React from "react";
import Link from "next/link";
import { 
  Building2, 
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
} from "lucide-react";
import { cookies } from "next/headers";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestRestaurants, getGuestFoodOrders } from "@/lib/guest-ordering/queries";
import { WifiCopyButton } from "@/components/guest/wifi-copy-button";

export default async function GuestHomePage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("stayhub_guest_session");

  // Fetch real database restaurants for this property
  const restaurants = await getGuestRestaurants(session?.property_id);

  // Check for any active in-progress food orders
  const orders = isVerifiedStay && sessionCookie?.value 
    ? await getGuestFoodOrders(sessionCookie.value) 
    : [];

  const activeOrder = orders.find(
    (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED" && o.status !== "SERVED"
  );

  return (
    <div className="p-4 space-y-5">
      {/* ── 1. WELCOMING HOSPITALITY HERO ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08111F] via-[#0E1A38] to-[#121B3B] border border-white/10 p-5 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 rounded-full bg-[var(--brand-gold)]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-32 h-32 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/25 text-[var(--brand-gold)] text-[10.5px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[var(--brand-gold)]" />
            {isVerifiedStay ? `Room ${session?.room_number} • In-House Guest` : "Digital Concierge"}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading">
            {isVerifiedStay
              ? `Welcome, ${session?.guest_first_name || "Guest"}`
              : `Welcome to ${session?.property_name || "StayHub Resort"}`}
          </h2>

          <p className="text-xs text-slate-300/80 leading-relaxed max-w-sm">
            {isVerifiedStay
              ? "Enjoy premium in-room dining, instant housekeeping requests, and seamless hotel services."
              : "Discover on-site dining menus, amenities, and personalized guest assistance."}
          </p>
        </div>
      </div>

      {/* ── 2. ACTIVE ORDER STATUS TICKER (If active food order exists) ── */}
      {activeOrder && (
        <Link
          href={`/guest/orders/${activeOrder.id}`}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-white shadow-lg active:scale-[0.99] transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-gold)] text-slate-950 flex items-center justify-center font-bold animate-pulse">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-400">Order In Progress</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs font-bold text-white font-mono">
                Order #{activeOrder.order_number} • {activeOrder.status}
              </p>
            </div>
          </div>

          <div className="flex items-center text-xs font-bold text-amber-400 gap-1">
            <span>Track</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}

      {/* ── 3. HERO ROOM SERVICE & FOOD ORDERING CTA (The centerpiece) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121B3B] via-[#0D1830] to-[#08111F] border border-[var(--brand-gold)]/30 p-5 shadow-xl group">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--brand-gold)]/15 border border-[var(--brand-gold)]/30 text-[var(--brand-gold)] text-[10px] font-black uppercase tracking-wider">
              Room Service & Dining
            </span>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Kitchen Open
            </span>
          </div>

          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Hungry? Order to Your Room
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Freshly prepared culinary dishes, beverages, and desserts delivered hot directly to Room {session?.room_number || "your suite"}.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Link
              href="/guest/dining"
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--brand-gold)] via-amber-400 to-[var(--brand-gold)] text-slate-950 font-black text-xs text-center shadow-lg shadow-amber-500/20 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Browse Menu & Order</span>
            </Link>

            {orders.length > 0 && (
              <Link
                href="/guest/orders"
                className="py-3 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition flex items-center gap-1"
                title="View My Past Orders"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Orders</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. UNVERIFIED GUEST QR NOTICE ── */}
      {!session && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Scan Your In-Room QR Code</h3>
            <p className="text-xs text-slate-400">
              Scan the QR code placed on your room table to verify your stay and order room service seamlessly.
            </p>
          </div>
        </div>
      )}

      {/* ── 5. IN-HOUSE STAY QUICK CARD (If verified stay) ── */}
      {isVerifiedStay && (
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-[var(--brand-gold)]" />
              <span className="text-xs font-bold text-white">
                Room {session?.room_number} • {session?.room_type || "Deluxe Suite"}
              </span>
            </div>
            <Link
              href="/guest/stay"
              className="text-[11px] text-[var(--brand-gold)] font-bold hover:underline flex items-center gap-1"
            >
              <span>Stay Details</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Check-In</span>
              <span className="text-white font-semibold">{session?.check_in_time || "14:00"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Check-Out</span>
              <span className="text-white font-semibold">{session?.expected_check_out_date || "11:00"}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. HIGH-SPEED GUEST WI-FI CARD ── */}
      {session?.wifi_ssid && (
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Complimentary Hotel Wi-Fi</span>
              <h4 className="text-xs font-bold text-white">{session.wifi_ssid}</h4>
            </div>
          </div>

          <WifiCopyButton ssid={session.wifi_ssid} password={session.wifi_password || ""} />
        </div>
      )}

      {/* ── 7. QUICK SERVICES 4-GRID ── */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Quick Services & Assistance
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Direct Dining Link */}
          <Link
            href="/guest/dining"
            className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition active:scale-[0.98] flex flex-col justify-between h-28 group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-[var(--brand-gold)] flex items-center justify-center group-hover:bg-[var(--brand-gold)] group-hover:text-slate-950 transition">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-[var(--brand-gold)] transition">In-Room Dining</h4>
              <p className="text-[10px] text-slate-400">Order food & drinks</p>
            </div>
          </Link>

          {/* Housekeeping Service */}
          <Link
            href="/guest/services"
            className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition active:scale-[0.98] flex flex-col justify-between h-28 group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">Housekeeping</h4>
              <p className="text-[10px] text-slate-400">Extra towels & cleaning</p>
            </div>
          </Link>

          {/* Orders Tracking */}
          <Link
            href="/guest/orders"
            className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition active:scale-[0.98] flex flex-col justify-between h-28 group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-slate-950 transition">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition">My Orders</h4>
              <p className="text-[10px] text-slate-400">Track kitchen delivery</p>
            </div>
          </Link>

          {/* Front Desk Call */}
          <a
            href={`tel:${session?.front_desk_phone || session?.phone || ""}`}
            className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition active:scale-[0.98] flex flex-col justify-between h-28 group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-slate-950 transition">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-rose-400 transition">Front Desk</h4>
              <p className="text-[10px] text-slate-400">24/7 direct dial</p>
            </div>
          </a>
        </div>
      </div>

      {/* ── 8. ON-SITE DINING OUTLETS ── */}
      {restaurants.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              On-Site Dining Outlets
            </h3>
            <Link href="/guest/dining" className="text-[11px] text-[var(--brand-gold)] hover:underline font-bold">
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {restaurants.map((rest) => (
              <Link
                key={rest.id}
                href={`/guest/dining/${rest.id}`}
                className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-between transition active:scale-[0.99] group shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white group-hover:text-[var(--brand-gold)] transition">
                      {rest.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Open
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {rest.description || "Fine dining, cocktails & in-room room service."}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-[var(--brand-gold)] shrink-0 ml-3">
                  <span>Menu</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
