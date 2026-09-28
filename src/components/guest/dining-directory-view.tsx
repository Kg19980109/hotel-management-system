"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  UtensilsCrossed,
  Clock,
  ChevronRight,
  Sparkles,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  Search,
  Building2,
  Compass,
} from "lucide-react";
import { GuestRestaurant } from "@/lib/guest-ordering/types";

interface DiningDirectoryViewProps {
  restaurants: GuestRestaurant[];
  isVerifiedStay: boolean;
  roomNumber?: string;
  propertyName?: string;
}

// Curated high-res restaurant ambiance photography
const restaurantImageCache = new Map<string, string>();
function getRestaurantAmbianceImage(name: string, cuisine?: string | null): string {
  const key = `${name}:${cuisine || ""}`;
  const cached = restaurantImageCache.get(key);
  if (cached) return cached;

  const text = `${name} ${cuisine || ""}`.toLowerCase();
  let url = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"; // Luxury restaurant dining room

  if (text.includes("grill") || text.includes("bbq") || text.includes("steak") || text.includes("rooftop")) {
    url = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80";
  } else if (text.includes("cafe") || text.includes("coffee") || text.includes("bakery") || text.includes("bistro")) {
    url = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80";
  } else if (text.includes("bar") || text.includes("lounge") || text.includes("cocktail") || text.includes("club")) {
    url = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80";
  } else if (text.includes("italian") || text.includes("pizza") || text.includes("pasta") || text.includes("trattoria")) {
    url = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80";
  } else if (text.includes("asian") || text.includes("chinese") || text.includes("japanese") || text.includes("sushi") || text.includes("thai")) {
    url = "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80";
  } else if (text.includes("indian") || text.includes("spice") || text.includes("royal") || text.includes("tandoor")) {
    url = "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80";
  } else if (text.includes("pool") || text.includes("garden") || text.includes("breeze") || text.includes("terrace")) {
    url = "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80";
  }

  restaurantImageCache.set(key, url);
  return url;
}

export function DiningDirectoryView({
  restaurants,
  isVerifiedStay,
  roomNumber,
  propertyName,
}: DiningDirectoryViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCuisine, setSelectedCuisine] = React.useState("ALL");

  // Extract unique cuisine tags
  const cuisines = React.useMemo(() => {
    const set = new Set<string>();
    restaurants.forEach((r) => {
      if (r.cuisine_type) set.add(r.cuisine_type.trim());
    });
    return Array.from(set);
  }, [restaurants]);

  // Fast client-side filtering
  const filteredRestaurants = React.useMemo(() => {
    return restaurants.filter((rest) => {
      const matchesCuisine =
        selectedCuisine === "ALL" ||
        rest.cuisine_type?.toLowerCase() === selectedCuisine.toLowerCase();

      if (!matchesCuisine) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        rest.name.toLowerCase().includes(q) ||
        rest.cuisine_type?.toLowerCase().includes(q) ||
        rest.description?.toLowerCase().includes(q)
      );
    });
  }, [restaurants, selectedCuisine, searchQuery]);

  return (
    <div className="space-y-5 pb-8">
      {/* ── 1. EDITORIAL HEADER BANNER ── */}
      <div className="relative overflow-hidden bg-[#0B1526] text-white">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0B1526] via-[#111D31] to-[#0B1526]">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6 space-y-3.5">
          {/* Top Quick Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/home"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/guest/orders"
              className="inline-flex items-center gap-1.5 text-xs text-[#E4C980] hover:text-white font-medium transition"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>My Orders</span>
            </Link>
          </div>

          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-[#D4AF37]/35 text-[#E4C980] text-[10px] font-medium tracking-wide">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>{isVerifiedStay ? `Room ${roomNumber} · In-Room Dining` : "Hotel Dining & Menus"}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-white tracking-tight leading-tight">
              Culinary Experiences
            </h2>
            <p className="text-xs text-slate-300/80 leading-relaxed max-w-sm">
              {isVerifiedStay
                ? `Exceptional gourmet dining prepared fresh by our chefs and delivered hot directly to Room ${roomNumber}.`
                : `Explore signature restaurants, seasonal menus, and culinary specialties at ${propertyName || "StayHub"}.`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* ── 2. UNVERIFIED STAY PROMPT ── */}
        {!isVerifiedStay && (
          <div className="p-4 rounded-2xl bg-white border border-[#EAE3D2] shadow-2xs flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1 min-w-0">
              <p className="font-bold text-slate-900 font-serif">In-Room Room Service</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                You can browse all menus freely. To order food directly to your suite, please scan your in-room QR code.
              </p>
            </div>
          </div>
        )}

        {/* ── 3. SEARCH & CUISINE FILTER ── */}
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search restaurants, cuisines, specialties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#EAE3D2] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition shadow-2xs"
            />
          </div>

          {/* Cuisine Filter Pills */}
          {cuisines.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCuisine("ALL")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none ${
                  selectedCuisine === "ALL"
                    ? "bg-[#0B1526] text-[#E4C980] border border-[#D4AF37]/35 shadow-xs"
                    : "bg-white text-slate-600 border border-[#EAE3D2] hover:bg-slate-50"
                }`}
              >
                All Dining ({restaurants.length})
              </button>
              {cuisines.map((cuisine) => (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => setSelectedCuisine(cuisine)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none ${
                    selectedCuisine === cuisine
                      ? "bg-[#0B1526] text-[#E4C980] border border-[#D4AF37]/35 shadow-xs"
                      : "bg-white text-slate-600 border border-[#EAE3D2] hover:bg-slate-50"
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. RESTAURANTS DIRECTORY LIST ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase font-serif">
              Available Dining Outlets
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">
              {filteredRestaurants.length} {filteredRestaurants.length === 1 ? "outlet" : "outlets"}
            </span>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white border border-[#EAE3D2] text-center space-y-2.5 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF4E6] text-[#A67C1E] mx-auto flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 font-serif">No Dining Outlets Found</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                {searchQuery
                  ? `No restaurants match "${searchQuery}". Try a different keyword or clear your search.`
                  : "There are currently no active dining outlets available for this property."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRestaurants.map((rest, idx) => {
                const ambiancePhoto = getRestaurantAmbianceImage(rest.name, rest.cuisine_type);

                return (
                  <Link
                    key={rest.id}
                    href={`/guest/dining/${rest.id}`}
                    className="block rounded-3xl bg-white border border-[#EAE3D2] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99] group"
                  >
                    {/* Restaurant Photographic Hero Cover */}
                    <div className="relative h-44 sm:h-52 w-full bg-slate-900 overflow-hidden">
                      <img
                        src={ambiancePhoto}
                        alt={rest.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        loading={idx === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full text-[9.5px] font-semibold uppercase tracking-wider bg-black/60 backdrop-blur-md text-[#E4C980] border border-white/15 shadow-xs">
                          {rest.cuisine_type || "Fine Dining"}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[9.5px] font-semibold bg-emerald-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Open
                        </span>
                      </div>

                      {/* Bottom Title on Cover Image */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h4 className="text-lg font-serif font-semibold text-white group-hover:text-[#E4C980] transition-colors drop-shadow-sm">
                          {rest.name}
                        </h4>
                      </div>
                    </div>

                    {/* Restaurant Metadata & Action */}
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {rest.description || "Artisanal seasonal menus crafted with fresh ingredients and served with 5-star hospitality."}
                      </p>

                      <div className="pt-2.5 border-t border-[#EAE3D2]/70 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {rest.opening_time || "07:00"} – {rest.closing_time || "23:00"}
                          </span>
                        </div>

                        <span className="px-4 py-1.5 rounded-xl bg-[#0B1526] group-hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 font-semibold text-xs flex items-center gap-1 shadow-xs transition-all">
                          <span>Explore Menu</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
