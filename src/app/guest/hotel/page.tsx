import * as React from "react";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Wifi, 
  Sparkles, 
  Utensils, 
  CheckCircle2 
} from "lucide-react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getPublicRestaurants } from "@/lib/guest-portal/queries";
import { WifiCopyButton } from "@/components/guest/wifi-copy-button";

export default async function GuestHotelPage() {
  const session = await getActiveGuestSession();

  const restaurants = session?.property_id 
    ? await getPublicRestaurants(session.property_id) 
    : [];

  const defaultAmenities = [
    "24/7 Front Desk Concierge",
    "High-Speed Fiber Wi-Fi",
    "On-Site Fine Dining & Bar",
    "Daily Housekeeping Service",
    "Valet Parking & Luggage Storage",
    "Express Check-In & Check-Out",
  ];

  return (
    <div className="p-4 space-y-5">
      {/* Hotel Title & Overview */}
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-white tracking-tight">
          {session?.property_name || "Hotel Directory"}
        </h2>
        <p className="text-xs text-slate-400">
          Property overview, amenities, dining, and operating hours.
        </p>
      </div>

      {/* Property Details Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="space-y-2 text-xs">
          {session?.address && (
            <div className="flex items-start gap-2.5 text-slate-300">
              <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{session.address}</span>
            </div>
          )}

          {session?.phone && (
            <div className="flex items-center gap-2.5 text-slate-300">
              <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <a href={`tel:${session.phone}`} className="hover:underline text-amber-400 font-medium">
                {session.phone}
              </a>
            </div>
          )}

          {session?.email && (
            <div className="flex items-center gap-2.5 text-slate-300">
              <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <a href={`mailto:${session.email}`} className="hover:underline">
                {session.email}
              </a>
            </div>
          )}
        </div>

        {/* Operating Hours */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Standard Check-In</span>
            <span className="text-slate-200 font-bold">{session?.check_in_time || "14:00"}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Standard Check-Out</span>
            <span className="text-slate-200 font-bold">{session?.check_out_time || "11:00"}</span>
          </div>
        </div>
      </div>

      {/* Wi-Fi Details Card */}
      {session?.wifi_ssid && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Wi-Fi Network</span>
              <h4 className="text-xs font-bold text-white">{session.wifi_ssid}</h4>
            </div>
          </div>

          <WifiCopyButton ssid={session.wifi_ssid} password={session.wifi_password || ""} />
        </div>
      )}

      {/* Dining Outlets */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-amber-400" />
          <span>Dining & Restaurants</span>
        </h3>

        {restaurants.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
            In-house dining and room service available via front desk.
          </div>
        ) : (
          <div className="space-y-2">
            {restaurants.map((rest) => (
              <div
                key={rest.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{rest.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                    Active Outlet
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {rest.description || "Fine dining, cocktails, and refreshments."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hotel Amenities */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Hotel Amenities & Highlights</span>
        </h3>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          {defaultAmenities.map((amenity, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>{amenity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
