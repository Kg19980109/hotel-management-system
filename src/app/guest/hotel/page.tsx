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
      {/* ── 1. EDITORIAL HEADER BANNER ── */}
      <div className="relative overflow-hidden bg-[#0B1526] text-white">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0B1526] via-[#111D31] to-[#0B1526]">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6 space-y-3.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-[#D4AF37]/35 text-[#E4C980] text-[10.5px] font-medium tracking-wide">
            <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Hotel Guide &amp; Directory</span>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-white tracking-tight leading-tight">
              {session?.property_name || "Hotel Information"}
            </h1>
            <p className="text-xs text-slate-300/80 leading-relaxed max-w-md">
              Where every detail of your stay is taken care of. Explore hotel amenities, dining, and concierge services.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5 max-w-lg mx-auto">
        {/* ── 2. PROPERTY DETAILS & CONTACT CARD ── */}
        <div className="p-5 rounded-3xl bg-white border border-[#EAE3D2] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-[#EAE3D2]">
            <Building2 className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
              About The Property
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            {session?.address && (
              <div className="flex items-start gap-2.5 text-slate-700">
                <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{session.address}</span>
              </div>
            )}

            {session?.phone && (
              <div className="flex items-center gap-2.5 text-slate-700">
                <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <a href={`tel:${session.phone}`} className="hover:underline text-[#A67C1E] font-semibold">
                  {session.phone}
                </a>
              </div>
            )}

            {session?.email && (
              <div className="flex items-center gap-2.5 text-slate-700">
                <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <a href={`mailto:${session.email}`} className="hover:underline text-slate-800 font-medium">
                  {session.email}
                </a>
              </div>
            )}
          </div>

          {/* Operating Hours */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[#EAE3D2] text-xs">
            <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2] space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block font-serif">
                Standard Check-In
              </span>
              <span className="text-slate-900 font-bold">{session?.check_in_time || "14:00"}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2] space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block font-serif">
                Standard Check-Out
              </span>
              <span className="text-slate-900 font-bold">{session?.check_out_time || "11:00 AM"}</span>
            </div>
          </div>
        </div>

        {/* ── 3. WI-FI CARD ── */}
        {session?.wifi_ssid && (
          <div className="p-4 rounded-2xl bg-white border border-[#EAE3D2] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-sky-600" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold font-serif">High-Speed Wi-Fi</span>
                <h3 className="text-xs font-bold text-slate-900 font-mono">{session.wifi_ssid}</h3>
              </div>
            </div>

            <WifiCopyButton ssid={session.wifi_ssid} password={session.wifi_password || ""} />
          </div>
        )}

        {/* ── 4. DINING OUTLETS ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Dining &amp; Restaurants</span>
            </h2>
            <Link href="/guest/dining" className="text-[10.5px] text-[#A67C1E] font-semibold hover:underline">
              View Menus →
            </Link>
          </div>

          {restaurants.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white border border-[#EAE3D2] text-center text-xs text-slate-500">
              In-house dining and room service available via concierge and front desk.
            </div>
          ) : (
            <div className="space-y-2.5">
              {restaurants.map((rest) => (
                <div
                  key={rest.id}
                  className="p-4 rounded-2xl bg-white border border-[#EAE3D2] space-y-1.5 shadow-2xs hover:border-[#D4AF37]/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-serif font-semibold text-slate-900">{rest.name}</h3>
                    <span className="text-[9.5px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      Active Outlet
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
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
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Hotel Amenities &amp; Highlights</span>
            </h2>
          </div>

          <div className="p-4 rounded-3xl bg-white border border-[#EAE3D2] space-y-3 shadow-2xs">
            {defaultAmenities.map((amenity, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h3 className="font-semibold text-slate-900">{amenity.title}</h3>
                  <p className="text-[11px] text-slate-500 leading-snug">{amenity.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 6. FRONT DESK CALLOUT ── */}
        {session?.phone && (
          <a
            href={`tel:${session.phone}`}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0B1526] hover:bg-[#111D31] border border-[#D4AF37]/35 text-[#E4C980] font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99]"
          >
            <PhoneCall className="w-4 h-4 text-[#D4AF37]" />
            <span>Contact Concierge Desk ({session.phone})</span>
          </a>
        )}
      </div>
    </div>
  );
}
