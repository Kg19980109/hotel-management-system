import * as React from "react";
import Link from "next/link";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Wifi, 
  Sparkles, 
  UtensilsCrossed, 
  CheckCircle2,
  Building2,
  Clock,
  ShieldCheck,
  PhoneCall,
  ChevronRight,
  Compass,
  BedDouble,
  Car,
} from "lucide-react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getPublicRestaurants } from "@/lib/guest-portal/queries";
import { WifiCopyButton } from "@/components/guest/wifi-copy-button";

export const metadata = {
  title: "StayHub — Hotel Directory & Guide",
  description: "Explore property overview, amenities, dining outlets, operating hours, and front desk assistance.",
};

export default async function GuestHotelPage() {
  const session = await getActiveGuestSession();

  const restaurants = session?.property_id 
    ? await getPublicRestaurants(session.property_id) 
    : [];

  const defaultAmenities = [
    { title: "24/7 Front Desk Concierge", desc: "Round-the-clock guest support and inquiries." },
    { title: "High-Speed Fiber Wi-Fi", desc: "Seamless connectivity across all rooms and public areas." },
    { title: "On-Site Fine Dining & Lounge", desc: "Curated culinary experiences and premium beverages." },
    { title: "Daily Housekeeping & Turndown", desc: "Attentive room cleaning and linen replenishment." },
    { title: "Valet Parking & Luggage Care", desc: "Complimentary valet parking and secure bag storage." },
    { title: "Express Check-In & Check-Out", desc: "Frictionless digital check-in and room billing." },
  ];

  return (
    <div className="space-y-5 pb-28">
      {/* ── 1. LUXURY VIOLET HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B132B] border border-violet-500/30 text-white shadow-xl shadow-violet-950/40">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-violet-900/30 via-[#0B132B] to-indigo-950/40 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-600/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-6 space-y-3.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-200 text-[10.5px] font-semibold tracking-wide backdrop-blur-xs">
            <Building2 className="w-3.5 h-3.5 text-violet-400" />
            <span>Hotel Guide &amp; Directory</span>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
              {session?.property_name || "Hotel Information"}
            </h1>
            <p className="text-xs text-slate-300/85 leading-relaxed max-w-md font-sans">
              Where every detail of your stay is taken care of. Explore hotel amenities, dining, and concierge services.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 max-w-lg mx-auto">
        {/* ── 2. PROPERTY DETAILS & CONTACT CARD ── */}
        <div className="p-5 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 space-y-4 shadow-lg shadow-violet-950/20 backdrop-blur-md">
          <div className="flex items-center gap-2 pb-2 border-b border-violet-500/20">
            <Building2 className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans">
              About The Property
            </h2>
          </div>

          <div className="space-y-2.5 text-xs font-sans">
            {session?.address && (
              <div className="flex items-start gap-2.5 text-slate-300">
                <MapPin className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{session.address}</span>
              </div>
            )}

            {session?.phone && (
              <div className="flex items-center gap-2.5 text-slate-300">
                <Phone className="w-4 h-4 text-violet-400 shrink-0" />
                <a href={`tel:${session.phone}`} className="hover:underline text-violet-300 font-semibold">
                  {session.phone}
                </a>
              </div>
            )}

            {session?.email && (
              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-violet-400 shrink-0" />
                <a href={`mailto:${session.email}`} className="hover:underline text-slate-200 font-medium">
                  {session.email}
                </a>
              </div>
            )}
          </div>

          {/* Operating Hours */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-violet-500/20 text-xs">
            <div className="p-3 rounded-2xl bg-[#0B132B]/80 border border-violet-500/20 space-y-0.5">
              <span className="text-[10px] text-violet-400 uppercase font-bold block font-sans">
                Standard Check-In
              </span>
              <span className="text-white font-bold">{session?.check_in_time || "14:00"}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#0B132B]/80 border border-violet-500/20 space-y-0.5">
              <span className="text-[10px] text-violet-400 uppercase font-bold block font-sans">
                Standard Check-Out
              </span>
              <span className="text-white font-bold">{session?.check_out_time || "11:00 AM"}</span>
            </div>
          </div>
        </div>

        {/* ── 3. WI-FI CARD ── */}
        {session?.wifi_ssid && (
          <div className="p-4 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 flex items-center justify-between shadow-md shadow-violet-950/15 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-950/60 text-sky-300 border border-sky-500/30 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-sky-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-violet-400 uppercase font-bold font-sans">High-Speed Wi-Fi</span>
                <h3 className="text-xs font-bold text-white font-mono">{session.wifi_ssid}</h3>
              </div>
            </div>

            <WifiCopyButton ssid={session.wifi_ssid} password={session.wifi_password || ""} />
          </div>
        )}

        {/* ── 4. DINING OUTLETS ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-violet-400" />
              <span>Dining &amp; Restaurants</span>
            </h2>
            <Link href="/guest/dining" className="text-[10.5px] text-violet-300 font-semibold hover:underline">
              View Menus →
            </Link>
          </div>

          {restaurants.length === 0 ? (
            <div className="p-5 rounded-2xl bg-[#111C38]/80 border border-violet-500/20 text-center text-xs text-slate-300">
              In-house dining and room service available via concierge and front desk.
            </div>
          ) : (
            <div className="space-y-2.5">
              {restaurants.map((rest) => (
                <div
                  key={rest.id}
                  className="p-4 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 space-y-1.5 shadow-md shadow-violet-950/15 hover:border-violet-400/50 transition backdrop-blur-md"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-serif font-bold text-white">{rest.name}</h3>
                    <span className="text-[9.5px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Active Outlet
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {rest.description || "Gourmet dining, artisanal beverages, and signature dishes."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 5. HOTEL AMENITIES ── */}
        <div className="space-y-3">
          <div className="px-0.5">
            <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Hotel Amenities &amp; Highlights</span>
            </h2>
          </div>

          <div className="p-4 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 space-y-3 shadow-lg shadow-violet-950/20 backdrop-blur-md">
            {defaultAmenities.map((amenity, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h3 className="font-semibold text-white">{amenity.title}</h3>
                  <p className="text-[11px] text-slate-300 leading-snug font-sans">{amenity.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 6. FRONT DESK CALLOUT ── */}
        {session?.phone && (
          <a
            href={`tel:${session.phone}`}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-950/40 transition active:scale-[0.99]"
          >
            <PhoneCall className="w-4 h-4 text-violet-200" />
            <span>Contact Concierge Desk ({session.phone})</span>
          </a>
        )}
      </div>
    </div>
  );
}
