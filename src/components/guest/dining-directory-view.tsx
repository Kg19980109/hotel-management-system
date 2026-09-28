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
      <div className="relative overflow-hidden bg-gradient-to-br from-[#08111F] via-[#0E1A38] to-[#17123A] text-white border-b border-violet-500/20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-indigo-600/15 blur-2xl pointer-events-none" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6 space-y-3.5">
          {/* Top Quick Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/home"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition font-medium"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/guest/orders"
              className="inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-white font-bold transition"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>My Orders</span>
            </Link>
          </div>

          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-[10px] font-bold tracking-wide">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span>{isVerifiedStay ? `Room ${roomNumber} · In-Room Dining` : "Hotel Dining & Menus"}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
              Culinary Experiences
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
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
          <div className="p-4 rounded-2xl bg-[#111C38]/90 border border-amber-500/30 shadow-lg flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1 min-w-0">
              <p className="font-bold text-white font-serif">In-Room Room Service</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                You can browse all menus freely. To order food directly to your suite, please scan your in-room QR code.
              </p>
            </div>
          </div>
        )}

        {/* ── 3. SEARCH & CUISINE FILTER ── */}
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
            <input
              type="text"
              placeholder="Search restaurants, cuisines, specialties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#111C38]/90 border border-violet-500/30 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 transition shadow-md"
            />
          </div>

          {/* Cuisine Filter Pills */}
          {cuisines.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCuisine("ALL")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all select-none ${
                  selectedCuisine === "ALL"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30"
                    : "bg-[#111C38]/90 text-slate-300 border border-violet-500/20 hover:bg-[#162347] hover:text-white"
                }`}
              >
                All Dining ({restaurants.length})
              </button>
              {cuisines.map((cuisine) => (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => setSelectedCuisine(cuisine)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all select-none ${
                    selectedCuisine === cuisine
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30"
                      : "bg-[#111C38]/90 text-slate-300 border border-violet-500/20 hover:bg-[#162347] hover:text-white"
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
            <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-serif">
              Available Dining Outlets
            </h3>
            <span className="text-[10px] text-violet-300 font-bold">
              {filteredRestaurants.length} {filteredRestaurants.length === 1 ? "outlet" : "outlets"}
            </span>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 text-center space-y-2.5 shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-300 mx-auto flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-white font-serif">No Dining Outlets Found</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
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
                    className="block rounded-3xl bg-[#111C38]/90 border border-violet-500/30 overflow-hidden shadow-lg shadow-violet-950/30 hover:border-violet-400/60 transition-all duration-200 active:scale-[0.99] group"
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
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111C38] via-[#111C38]/40 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-[#08111F]/80 backdrop-blur-md text-violet-200 border border-violet-400/30 shadow-xs">
                          {rest.cuisine_type || "Fine Dining"}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[9.5px] font-bold bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                          Open
                        </span>
                      </div>

                      {/* Bottom Title on Cover Image */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h4 className="text-lg font-serif font-bold text-white group-hover:text-violet-300 transition-colors drop-shadow-sm">
                          {rest.name}
                        </h4>
                      </div>
                    </div>

                    {/* Restaurant Metadata & Action */}
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {rest.description || "Artisanal seasonal menus crafted with fresh ingredients and served with 5-star hospitality."}
                      </p>

                      <div className="pt-2.5 border-t border-violet-500/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-violet-400" />
                          <span>
                            {rest.opening_time || "07:00"} – {rest.closing_time || "23:00"}
                          </span>
                        </div>

                        <span className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 group-hover:from-violet-500 group-hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-violet-600/30 transition-all">
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
