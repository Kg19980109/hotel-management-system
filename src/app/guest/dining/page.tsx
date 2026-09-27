import * as React from "react";
import Link from "next/link";
import { UtensilsCrossed, Clock, ChevronRight, Sparkles, AlertCircle, ShoppingBag, ArrowLeft } from "lucide-react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestRestaurants } from "@/lib/guest-ordering/queries";

export const metadata = {
  title: "StayHub — In-Room Dining & Restaurants",
  description: "Browse hotel restaurants and order in-room food service directly to your suite.",
};

export default async function GuestDiningPage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const restaurants = await getGuestRestaurants(session?.property_id);

  return (
    <div className="p-4 space-y-5">
      {/* ── HEADER NAVIGATION & HERO ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/home"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/guest/orders"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-gold)] hover:underline font-bold"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>My Orders</span>
        </Link>
      </div>

      {/* ── LUXURY DINING BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08111F] via-[#0D1830] to-[#121B3B] border border-white/10 p-5 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-[var(--brand-gold)]/15 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/25 text-[var(--brand-gold)] text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            In-Room Room Service
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading">
            Culinary Experience
          </h2>
          <p className="text-xs text-slate-300/80 leading-relaxed">
            {isVerifiedStay
              ? `Freshly prepared gourmet dishes and beverages delivered hot directly to Room ${session?.room_number}.`
              : "Explore our hotel restaurants, seasonal menus, and culinary specialties."}
          </p>
        </div>
      </div>

      {/* ── UNVERIFIED STAY PROMPT ── */}
      {!isVerifiedStay && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-300">Room Verification Required for Ordering</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              You are welcome to browse all restaurant menus. To dispatch food directly to your room, please scan your in-room table QR code.
            </p>
          </div>
        </div>
      )}

      {/* ── RESTAURANT OUTLETS LIST ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Available Dining Outlets
          </h3>
          <span className="text-[11px] text-slate-500 font-semibold">
            {restaurants.length} outlet{restaurants.length !== 1 ? "s" : ""}
          </span>
        </div>

        {restaurants.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white/[0.04] border border-white/10 text-center space-y-2">
            <UtensilsCrossed className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              No active dining outlets currently available.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {restaurants.map((rest) => (
              <Link
                key={rest.id}
                href={`/guest/dining/${rest.id}`}
                className="block p-5 rounded-3xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition active:scale-[0.99] group shadow-xl space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border border-[var(--brand-gold)]/20">
                        {rest.cuisine_type || "Fine Dining"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Open
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-white group-hover:text-[var(--brand-gold)] transition">
                      {rest.name}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {rest.description || "Gourmet dishes prepared with fresh seasonal ingredients."}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {rest.opening_time || "07:00"} – {rest.closing_time || "23:00"}
                    </span>
                  </div>

                  <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--brand-gold)] to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/15 group-hover:brightness-105 transition">
                    <span>View Menu</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
