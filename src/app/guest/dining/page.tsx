import * as React from "react";
import Link from "next/link";
import { Utensils, Clock, ChevronRight, Sparkles, AlertCircle } from "lucide-react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestRestaurants } from "@/lib/guest-ordering/queries";

export const metadata = {
  title: "StayHub — In-Room Dining & Restaurants",
  description: "Browse on-site restaurants and order in-room food service directly.",
};

export default async function GuestDiningPage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const restaurants = session?.property_id
    ? await getGuestRestaurants(session.property_id)
    : [];

  return (
    <div className="p-4 space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-5 shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            In-Room Dining
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Culinary Experience
          </h2>
          <p className="text-xs text-slate-400">
            {isVerifiedStay
              ? `Freshly prepared meals and beverages delivered directly to Room ${session?.room_number}.`
              : "Explore our hotel restaurants and dining menus."}
          </p>
        </div>
      </div>

      {/* Verified in-house notice if not verified */}
      {!isVerifiedStay && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-300">Room Verification Required for Ordering</p>
            <p className="text-slate-400 text-[11px]">
              You can browse menus freely. To place an in-room dining order, please verify your stay via your room QR code.
            </p>
          </div>
        </div>
      )}

      {/* Quick Nav to Active Orders */}
      {isVerifiedStay && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white">Your Orders</h4>
            <p className="text-[10px] text-slate-400">Track kitchen status & history</p>
          </div>
          <Link
            href="/guest/orders"
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition"
          >
            <span>View Orders</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Restaurant List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Available Dining Outlets
        </h3>

        {restaurants.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <Utensils className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              No active dining outlets currently available.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((rest) => (
              <Link
                key={rest.id}
                href={`/guest/dining/${rest.id}`}
                className="block p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 transition active:scale-[0.99] group shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition">
                        {rest.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Open
                      </span>
                    </div>
                    {rest.cuisine_type && (
                      <p className="text-[11px] text-amber-400/90 font-medium">
                        {rest.cuisine_type}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {rest.description || "Freshly curated dishes crafted with local ingredients."}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition shrink-0 ml-2" />
                </div>

                {(rest.opening_time || rest.closing_time) && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Hours: {rest.opening_time || "07:00"} – {rest.closing_time || "23:00"}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
