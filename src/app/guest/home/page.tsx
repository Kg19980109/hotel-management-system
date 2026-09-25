import * as React from "react";
import Link from "next/link";
import { 
  Building2, 
  Utensils, 
  Sparkles, 
  Wifi, 
  PhoneCall, 
  BedDouble, 
  ArrowRight,
  QrCode
} from "lucide-react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getPublicRestaurants } from "@/lib/guest-portal/queries";
import { WifiCopyButton } from "@/components/guest/wifi-copy-button";

export default async function GuestHomePage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const restaurants = session?.property_id 
    ? await getPublicRestaurants(session.property_id) 
    : [];

  return (
    <div className="p-4 space-y-5">
      {/* 1. Welcoming Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-5 shadow-xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            {isVerifiedStay ? `Room ${session?.room_number} • In-House Guest` : "Digital Guest Concierge"}
          </div>

          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {isVerifiedStay
              ? `Welcome, ${session?.guest_first_name || "Guest"}`
              : `Welcome to ${session?.property_name || "StayHub Resort"}`}
          </h2>

          <p className="text-xs text-slate-400 line-clamp-2">
            {isVerifiedStay
              ? "Enjoy your stay! Access digital hotel amenities, dining, and contactless service requests."
              : "Discover luxury amenities, fine dining, and seamless guest services."}
          </p>
        </div>
      </div>

      {/* 2. Unauthenticated / No Active Session Prompt */}
      {!session && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Scan Your In-Room QR Code</h3>
            <p className="text-xs text-slate-400">
              Scan the QR code placed in your hotel room to verify your reservation and unlock instant digital room services.
            </p>
          </div>
        </div>
      )}

      {/* 3. In-House Stay Quick Card (If Verified Stay) */}
      {isVerifiedStay && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">
                Room {session?.room_number} • {session?.room_type || "Deluxe Room"}
              </span>
            </div>
            <Link
              href="/guest/stay"
              className="text-[11px] text-amber-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Details</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Check-In</span>
              <span className="text-slate-200 font-semibold">{session?.check_in_time || "14:00"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Check-Out</span>
              <span className="text-slate-200 font-semibold">{session?.expected_check_out_date || "11:00"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. High-Speed Hotel Wifi Credentials */}
      {session?.wifi_ssid && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">High-Speed Guest Wi-Fi</span>
              <h4 className="text-xs font-bold text-white">{session.wifi_ssid}</h4>
            </div>
          </div>

          <WifiCopyButton ssid={session.wifi_ssid} password={session.wifi_password || ""} />
        </div>
      )}

      {/* 5. Quick Concierge & Service Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Guest Services & Directory
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/guest/services"
            className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 transition active:scale-[0.98] flex flex-col justify-between h-28 group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition">Dining & Food</h4>
              <p className="text-[10px] text-slate-400">Menus & room dining</p>
            </div>
          </Link>

          <Link
            href="/guest/services"
            className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 transition active:scale-[0.98] flex flex-col justify-between h-28 group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">Housekeeping</h4>
              <p className="text-[10px] text-slate-400">Extra linen & cleaning</p>
            </div>
          </Link>

          <Link
            href="/guest/hotel"
            className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 transition active:scale-[0.98] flex flex-col justify-between h-28 group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-slate-950 transition">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition">Hotel Directory</h4>
              <p className="text-[10px] text-slate-400">Amenities & timings</p>
            </div>
          </Link>

          <a
            href={`tel:${session?.front_desk_phone || session?.phone || ""}`}
            className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 transition active:scale-[0.98] flex flex-col justify-between h-28 group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-slate-950 transition">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-rose-400 transition">Front Desk</h4>
              <p className="text-[10px] text-slate-400">24/7 direct assistance</p>
            </div>
          </a>
        </div>
      </div>

      {/* 6. On-Site Restaurants Preview */}
      {restaurants.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              On-Site Dining Outlets
            </h3>
            <Link href="/guest/hotel" className="text-[11px] text-amber-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2">
            {restaurants.slice(0, 2).map((rest) => (
              <div
                key={rest.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">{rest.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{rest.description || "Fine dining & refreshments"}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-semibold">
                  Open
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
