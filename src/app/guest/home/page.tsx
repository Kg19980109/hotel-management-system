import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  Coffee,
  ShieldCheck,
  Building2,
  ConciergeBell,
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

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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
  const greeting = getTimeGreeting();

  return (
    <div className="space-y-5 pb-8">
      {/* ── 1. EDITORIAL LUXURY HERO SECTION ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#070D18] via-[#0D1829] to-[#0A1322] text-white rounded-b-[2rem] shadow-xl border-b border-[#D4AF37]/25 pb-7 pt-5 px-5">
        {/* Ambient Decorative Lighting & Radiant Aura */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#D4AF37]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Background Hotel Photography if available */}
        {session?.cover_image_url && (
          <div className="absolute inset-0 z-0">
            <Image
              src={session.cover_image_url}
              alt={session.property_name || "Hotel Resort"}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover object-center opacity-25 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1322] via-[#0A1322]/80 to-transparent" />
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 space-y-4">
          {/* Status Badge Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-[#D4AF37]/35 text-[#E4C980] text-[10.5px] font-medium tracking-wide shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Digital Concierge Active</span>
            </div>

            {isVerifiedStay && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Suite Key Active</span>
              </div>
            )}
          </div>

          {/* Luxury Greeting & Guest Name */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#E4C980]/90 font-bold font-serif">
              <span>{greeting}</span>
              <span className="w-1 h-1 rounded-full bg-[#D4AF37]/60" />
              <span className="text-slate-300 font-sans tracking-widest text-[9.5px] uppercase">Welcome</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight flex items-baseline gap-2">
              <span>{isVerifiedStay && session?.guest_first_name ? session.guest_first_name : "Esteemed Guest"}</span>
              {isVerifiedStay && session?.guest_last_name && (
                <span className="text-lg font-serif font-normal text-slate-300">
                  {session.guest_last_name}
                </span>
              )}
            </h2>

            <p className="text-xs text-slate-300/85 leading-relaxed max-w-sm pt-0.5">
              {isVerifiedStay
                ? `Welcome to ${session?.property_name || "your luxury retreat"}. Your personalized room dining, concierge, and folio are at your fingertips.`
                : "Experience 5-star culinary menus, wellness therapies, and tailored hospitality services."}
            </p>
          </div>

          {/* Quick Luxury Features Micro-Strip */}
          <div className="pt-1 flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none text-[10.5px]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 shrink-0 backdrop-blur-xs">
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>In-Room Dining</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 shrink-0 backdrop-blur-xs">
              <ConciergeBell className="w-3.5 h-3.5 text-emerald-400" />
              <span>24/7 Butler Support</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 shrink-0 backdrop-blur-xs">
              <Receipt className="w-3.5 h-3.5 text-indigo-400" />
              <span>Live Folio</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* ── 2. ACTIVE ORDER ALERT (Conditionally Rendered) ── */}
        {activeOrders.length > 0 && (
          <div className="space-y-2.5">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                href={`/guest/orders/${order.id}`}
                prefetch={true}
                className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 border border-amber-200/90 text-slate-900 shadow-2xs hover:shadow-sm active:scale-[0.98] transition-transform duration-75 group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
                <div className="flex items-center gap-3.5 min-w-0 pt-0.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/25 shrink-0">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        {order.status === "PREPARING" ? "Kitchen Preparing" : "Order " + order.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 truncate font-mono">
                      Order #{order.order_number} · {order.item_count} {order.item_count === 1 ? "item" : "items"} · ₹{Number(order.total_amount).toFixed(0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-bold text-amber-800 gap-1 shrink-0">
                  <span>Track</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── 3. ACTIVE SERVICE REQUEST TICKER (Conditionally Rendered) ── */}
        {activeServiceReqs.length > 0 && (
          <Link
            href="/guest/requests"
            prefetch={true}
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/40 border border-indigo-200/90 text-slate-900 shadow-2xs hover:shadow-sm active:scale-[0.98] transition-transform duration-75 group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-600" />
            <div className="flex items-center gap-3.5 min-w-0 pt-0.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                    {activeServiceReqs.length} Service Request{activeServiceReqs.length > 1 ? "s" : ""} In Progress
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium truncate">
                  {activeServiceReqs[0]?.title || "Service ticket update"}
                  {activeServiceReqs.length > 1 ? ` +${activeServiceReqs.length - 1} more` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center text-xs font-bold text-indigo-700 gap-1 shrink-0">
              <span>View</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        )}

        {/* ── 4. STAY PASSPORT SUMMARY (For Verified In-House Guests) ── */}
        {isVerifiedStay && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200/90 shadow-2xs space-y-3.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
            <div className="flex items-center justify-between border-b border-amber-200/70 pb-3 pt-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
                  <BedDouble className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    Room {session?.room_number} {session?.room_type ? `· ${session.room_type}` : ""}
                  </h3>
                  <p className="text-[10px] text-amber-800 font-semibold">In-House Stay Passport</p>
                </div>
              </div>
              <Link
                href="/guest/stay"
                prefetch={true}
                className="text-[11px] text-amber-800 hover:text-amber-950 font-bold flex items-center gap-0.5 shrink-0 transition-transform duration-75 active:scale-95"
              >
                <span>Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-0.5">
                <span className="text-[9.5px] uppercase font-bold text-emerald-800 block">Check-in</span>
                <span className="text-xs font-bold text-emerald-950 block truncate">{formatDate(session?.check_in_date)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-0.5">
                <span className="text-[9.5px] uppercase font-bold text-amber-800 block">Check-out</span>
                <span className="text-xs font-bold text-amber-950 block truncate">{formatDate(session?.expected_check_out_date)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-0.5">
                <span className="text-[9.5px] uppercase font-bold text-indigo-800 block">Remaining</span>
                <span className="text-xs font-bold text-indigo-950 block truncate">
                  {daysLeft === null ? "—" : daysLeft === 0 ? "Today" : `${daysLeft} night${daysLeft > 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. THREE PRIMARY HOSPITALITY ACTION PILLARS ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase font-serif">
              Guest Concierge
            </h3>
            <span className="text-[10px] text-slate-500">Fast Actions</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Action 1: Order Food */}
            <Link
              href="/guest/dining"
              prefetch={true}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40 border border-amber-200/90 transition-transform duration-75 active:scale-95 flex flex-col items-center text-center shadow-2xs hover:shadow-sm group select-none relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white flex items-center justify-center transition-transform group-hover:scale-105 mb-2 shadow-md shadow-amber-500/25">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                Order Food
              </h4>
              <p className="text-[10px] text-amber-900 font-medium mt-0.5 line-clamp-1">
                Room dining
              </p>
            </Link>

            {/* Action 2: Request Service */}
            <Link
              href="/guest/services"
              prefetch={true}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 border border-emerald-200/90 transition-transform duration-75 active:scale-95 flex flex-col items-center text-center shadow-2xs hover:shadow-sm group select-none relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-600" />
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white flex items-center justify-center transition-transform group-hover:scale-105 mb-2 shadow-md shadow-emerald-500/25">
                <ConciergeBell className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                Request Help
              </h4>
              <p className="text-[10px] text-emerald-900 font-medium mt-0.5 line-clamp-1">
                Housekeeping
              </p>
            </Link>

            {/* Action 3: My Room Bill */}
            <Link
              href="/guest/folio"
              prefetch={true}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/40 border border-indigo-200/90 transition-transform duration-75 active:scale-95 flex flex-col items-center text-center shadow-2xs hover:shadow-sm group select-none relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-600" />
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-purple-600 text-white flex items-center justify-center transition-transform group-hover:scale-105 mb-2 shadow-md shadow-indigo-500/25">
                <Receipt className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-800 transition-colors">
                My Bill
              </h4>
              <p className="text-[10px] text-indigo-900 font-medium mt-0.5 line-clamp-1">
                View folio
              </p>
            </Link>
          </div>
        </div>

        {/* ── 6. EDITORIAL DINING INVITATION ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1526] via-[#111D31] to-[#0B1526] text-white p-5 shadow-lg border border-[#D4AF37]/30">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#D4AF37]/10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-[#D4AF37]/30 text-[#E4C980] text-[10px] font-semibold uppercase tracking-wider">
                In-Room Dining
              </span>
              <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Kitchen Active
              </span>
            </div>

            <div>
              <h3 className="text-lg font-serif font-semibold text-white tracking-tight">
                Something Delicious?
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Freshly prepared artisanal cuisine &amp; beverages delivered directly to Room {session?.room_number || "your suite"}.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href="/guest/dining"
                prefetch={true}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E4C980] hover:brightness-105 text-[#0B1526] font-bold text-xs text-center shadow-md transition-transform duration-75 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Explore Menus &amp; Order</span>
              </Link>
              {orders.length > 0 && (
                <Link
                  href="/guest/orders"
                  prefetch={true}
                  className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-transform duration-75 active:scale-95 flex items-center gap-1"
                  title="View Past &amp; Active Orders"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-[10px] font-bold text-[#E4C980]">{orders.length}</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── 7. CURATED QUICK SERVICES GRID (COLORFUL) ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase font-serif flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Hospitality Services</span>
            </h3>
            <Link
              href="/guest/services"
              prefetch={true}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5"
            >
              <span>Explore All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* 1. Housekeeping */}
            <Link
              href="/guest/services?category=HOUSEKEEPING"
              prefetch={true}
              className="p-3 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200/90 hover:border-amber-400 transition-transform duration-75 active:scale-95 flex items-center gap-3 group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11.5px] font-bold text-slate-900 group-hover:text-amber-800 leading-tight truncate">Housekeeping</h4>
                <p className="text-[10px] text-amber-900/80 font-medium truncate">Linens &amp; cleaning</p>
              </div>
            </Link>

            {/* 2. Front Desk */}
            <Link
              href="/guest/services?category=FRONT_DESK"
              prefetch={true}
              className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/30 border border-emerald-200/90 hover:border-emerald-400 transition-transform duration-75 active:scale-95 flex items-center gap-3 group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
                <BedDouble className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11.5px] font-bold text-slate-900 group-hover:text-emerald-800 leading-tight truncate">Front Desk</h4>
                <p className="text-[10px] text-emerald-900/80 font-medium truncate">Keys &amp; checkout</p>
              </div>
            </Link>

            {/* 3. Maintenance */}
            <Link
              href="/guest/services?category=MAINTENANCE"
              prefetch={true}
              className="p-3 rounded-2xl bg-gradient-to-br from-sky-50/80 via-white to-blue-50/30 border border-sky-200/90 hover:border-sky-400 transition-transform duration-75 active:scale-95 flex items-center gap-3 group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/25">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11.5px] font-bold text-slate-900 group-hover:text-blue-800 leading-tight truncate">Maintenance</h4>
                <p className="text-[10px] text-sky-900/80 font-medium truncate">AC &amp; repairs</p>
              </div>
            </Link>

            {/* 4. Laundry & Pressing */}
            <Link
              href="/guest/services?category=LAUNDRY"
              prefetch={true}
              className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/30 border border-indigo-200/90 hover:border-indigo-400 transition-transform duration-75 active:scale-95 flex items-center gap-3 group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25">
                <Shirt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11.5px] font-bold text-slate-900 group-hover:text-indigo-800 leading-tight truncate">Laundry</h4>
                <p className="text-[10px] text-indigo-900/80 font-medium truncate">Dry clean &amp; wash</p>
              </div>
            </Link>

            {/* 5. Spa & Wellness */}
            <Link
              href="/guest/services?category=SPA"
              prefetch={true}
              className="p-3 rounded-2xl bg-gradient-to-br from-pink-50/80 via-white to-rose-50/30 border border-pink-200/90 hover:border-pink-400 transition-transform duration-75 active:scale-95 flex items-center gap-3 group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-pink-500/25">
                <Flower2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11.5px] font-bold text-slate-900 group-hover:text-pink-800 leading-tight truncate">Spa &amp; Wellness</h4>
                <p className="text-[10px] text-pink-900/80 font-medium truncate">Massage &amp; relax</p>
              </div>
            </Link>

            {/* 6. Transport & Cabs */}
            <Link
              href="/guest/services?category=TRANSPORT"
              prefetch={true}
              className="p-3 rounded-2xl bg-gradient-to-br from-teal-50/80 via-white to-cyan-50/30 border border-teal-200/90 hover:border-teal-400 transition-transform duration-75 active:scale-95 flex items-center gap-3 group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-500/25">
                <Car className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11.5px] font-bold text-slate-900 group-hover:text-teal-800 leading-tight truncate">Transport</h4>
                <p className="text-[10px] text-teal-900/80 font-medium truncate">Airport &amp; taxis</p>
              </div>
            </Link>
          </div>
        </div>

        {/* ── 8. COMPLIMENTARY WI-FI CARD (COLORFUL) ── */}
        {session?.wifi_ssid && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/80 via-white to-blue-50/30 border border-sky-200/90 flex items-center justify-between shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-blue-600" />
            <div className="flex items-center gap-3 pt-0.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/25">
                <Wifi className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-sky-900 uppercase tracking-wider font-bold">
                  Complimentary High-Speed Wi-Fi
                </span>
                <h4 className="text-xs font-bold text-slate-900">{session.wifi_ssid}</h4>
              </div>
            </div>
            <WifiCopyButton ssid={session.wifi_ssid} password={session.wifi_password || ""} />
          </div>
        )}

        {/* ── 9. UNVERIFIED QR NOTICE (For Public/Unlinked sessions) ── */}
        {!session && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200/90 text-center space-y-3 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white mx-auto flex items-center justify-center shadow-md shadow-amber-500/25">
              <QrCode className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 font-serif">Scan In-Room QR Code</h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Scan your room QR card to verify your stay, unlock in-room dining, request housekeeping, and view your live folio.
              </p>
            </div>
          </div>
        )}

        {/* ── 10. ON-SITE DINING OUTLETS LIST (COLORFUL) ── */}
        {restaurants.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase font-serif">
                On-Site Dining Outlets
              </h3>
              <Link href="/guest/dining" prefetch={true} className="text-[11px] text-amber-800 hover:text-amber-950 font-bold">
                All Menus
              </Link>
            </div>

            <div className="space-y-2">
              {restaurants.map((rest) => (
                <Link
                  key={rest.id}
                  href={`/guest/dining/${rest.id}`}
                  prefetch={true}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 hover:border-amber-400 border border-amber-200/80 flex items-center justify-between transition-transform duration-75 active:scale-[0.99] group shadow-2xs relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 opacity-60" />
                  <div className="flex items-center gap-3 min-w-0 pt-0.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition truncate">
                          {rest.name}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          Open
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 line-clamp-1">
                        {rest.description || "Gourmet dining & in-room beverage service"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-800 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── 11. 24/7 FRONT DESK HOSPITALITY CONTACT (COLORFUL) ── */}
        {session?.front_desk_phone && (
          <a
            href={`tel:${session.front_desk_phone}`}
            className="w-full p-4 rounded-2xl bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 border border-rose-200/90 hover:border-rose-400 flex items-center gap-3.5 transition-transform duration-75 active:scale-[0.99] shadow-2xs group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-red-600" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/25 pt-0.5">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-700 transition truncate">
                Call Front Desk Concierge
              </h4>
              <p className="text-[10px] text-rose-950 font-medium">24/7 Hospitality Support · {session.front_desk_phone}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 ml-auto transition shrink-0" />
          </a>
        )}
      </div>
    </div>
  );
}

