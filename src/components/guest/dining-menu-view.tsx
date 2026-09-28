"use client";

// ============================================================
// STAYHUB GUEST QR DINING & CULINARY MENU (Phase 3 & 4 Luxury Design)
// ============================================================

import * as React from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  ArrowLeft, 
  Clock, 
  Sparkles,
  Search,
  CheckCircle2,
  ChevronRight,
  UtensilsCrossed,
} from "lucide-react";
import { GuestRestaurant, GuestMenuCategory, GuestMenuItem } from "@/lib/guest-ordering/types";
import { useCart } from "./cart-context";
import { FoodDetailSheet } from "./food-detail-sheet";

interface DiningMenuViewProps {
  restaurant: GuestRestaurant;
  categories: GuestMenuCategory[];
  isVerifiedStay: boolean;
  roomNumber?: string;
}

// Fast memory-cached culinary image catalog for luxury food cards
const foodImageCache = new Map<string, string>();
const getFoodImageForDish = (dishName: string, categoryName: string): string => {
  const key = `${dishName}:${categoryName}`;
  const cached = foodImageCache.get(key);
  if (cached) return cached;

  const text = `${dishName} ${categoryName}`.toLowerCase();
  let url = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";
  if (text.includes("burger")) {
    url = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80";
  } else if (text.includes("pizza")) {
    url = "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80";
  } else if (text.includes("biryani") || text.includes("rice")) {
    url = "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80";
  } else if (text.includes("paneer") || text.includes("tikka") || text.includes("curry") || text.includes("masala")) {
    url = "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80";
  } else if (text.includes("coffee") || text.includes("tea") || text.includes("latte") || text.includes("cappuccino")) {
    url = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80";
  } else if (text.includes("drink") || text.includes("cocktail") || text.includes("beverage") || text.includes("juice") || text.includes("wine")) {
    url = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80";
  } else if (text.includes("cake") || text.includes("dessert") || text.includes("sweet") || text.includes("chocolate") || text.includes("ice cream")) {
    url = "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80";
  } else if (text.includes("pasta") || text.includes("noodle") || text.includes("spaghetti")) {
    url = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80";
  } else if (text.includes("salad") || text.includes("soup") || text.includes("starter")) {
    url = "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80";
  } else if (text.includes("steak") || text.includes("chicken") || text.includes("grill") || text.includes("meat") || text.includes("kebab")) {
    url = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80";
  } else if (text.includes("fish") || text.includes("seafood") || text.includes("prawn")) {
    url = "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80";
  }
  foodImageCache.set(key, url);
  return url;
};

// Curated restaurant banner image
function getRestaurantHeaderImage(name: string, cuisine?: string | null): string {
  const text = `${name} ${cuisine || ""}`.toLowerCase();
  if (text.includes("grill") || text.includes("bbq") || text.includes("steak")) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80";
  } else if (text.includes("cafe") || text.includes("bistro")) {
    return "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80";
  } else if (text.includes("bar") || text.includes("lounge")) {
    return "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80";
  } else if (text.includes("italian") || text.includes("pizza") || text.includes("pasta")) {
    return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80";
  } else if (text.includes("asian") || text.includes("sushi")) {
    return "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80";
  }
  return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";
}

export function DiningMenuView({
  restaurant,
  categories,
  isVerifiedStay,
  roomNumber,
}: DiningMenuViewProps) {
  const { addItem, items, updateQuantity } = useCart();
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [addedItemNotice, setAddedItemNotice] = React.useState<string | null>(null);

  // Selected item for Food Detail Modal/Sheet
  const [detailItem, setDetailItem] = React.useState<GuestMenuItem | null>(null);
  const [detailItemCategory, setDetailItemCategory] = React.useState<string>("");

  const filteredCategories = React.useMemo(() => {
    let list = selectedCategory === "ALL"
      ? categories
      : categories.filter((c) => c.id === selectedCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.map((cat) => ({
        ...cat,
        items: (cat.items || []).filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q)
        ),
      })).filter((cat) => (cat.items || []).length > 0);
    }
    return list;
  }, [categories, selectedCategory, searchQuery]);

  const itemsMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.menu_item_id, item.quantity);
    }
    return map;
  }, [items]);

  const getItemQuantityInCart = React.useCallback(
    (menuItemId: string) => itemsMap.get(menuItemId) || 0,
    [itemsMap]
  );

  const handleAddItem = React.useCallback(
    (item: GuestMenuItem, customQty = 1, instructions = "") => {
      if (!item.is_available) return;

      addItem(restaurant.id, restaurant.name, {
        menu_item_id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: customQty,
        category_id: item.category_id,
        currency: item.currency || restaurant.currency || "INR",
        special_instructions: instructions.trim() || undefined,
      });

      setAddedItemNotice(item.name);
      setTimeout(() => setAddedItemNotice(null), 1800);
    },
    [addItem, restaurant.id, restaurant.name, restaurant.currency]
  );

  const handleOpenDetail = React.useCallback(
    (item: GuestMenuItem, categoryName: string) => {
      setDetailItem(item);
      setDetailItemCategory(categoryName);
    },
    []
  );

  const currencySymbol = "₹";
  const headerCover = getRestaurantHeaderImage(restaurant.name, restaurant.cuisine_type);

  return (
    <div className="space-y-5 pb-36">
      {/* ── 1. RESTAURANT HERO HEADER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#08111F] via-[#0E1A38] to-[#17123A] text-white border-b border-violet-500/20">
        <div className="absolute inset-0 z-0">
          <img
            src={headerCover}
            alt={restaurant.name}
            className="w-full h-full object-cover object-center opacity-25 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-[#08111F]/80 to-[#08111F]/50" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6 space-y-3.5">
          {/* Top Quick Navigation Bar */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/dining"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition font-medium"
              aria-label="Back to Dining Outlets"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Dining</span>
            </Link>

            {isVerifiedStay && (
              <span className="text-[10.5px] font-bold text-violet-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Room {roomNumber} · Room Service
              </span>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-[10px] font-bold uppercase tracking-wider">
                {restaurant.cuisine_type || "Fine Dining"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                Kitchen Active
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
              {restaurant.name}
            </h2>

            {restaurant.description && (
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
                {restaurant.description}
              </p>
            )}

            {(restaurant.opening_time || restaurant.closing_time) && (
              <div className="flex items-center gap-1.5 text-[11px] text-violet-300 pt-1">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span>
                  Service Hours: {restaurant.opening_time || "07:00"} – {restaurant.closing_time || "23:00"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* ── 2. MENU SEARCH INPUT ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
          <input
            type="text"
            placeholder="Search culinary dishes, beverages, ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#111C38]/90 border border-violet-500/30 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 transition shadow-md"
          />
        </div>

        {/* ── 3. HORIZONTAL CATEGORY NAVIGATION ── */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all select-none ${
                selectedCategory === "ALL"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30"
                  : "bg-[#111C38]/90 text-slate-300 border border-violet-500/20 hover:bg-[#162347] hover:text-white"
              }`}
            >
              All Dishes
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all select-none ${
                  selectedCategory === cat.id
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30"
                    : "bg-[#111C38]/90 text-slate-300 border border-violet-500/20 hover:bg-[#162347] hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* ── 4. MENU SECTIONS & DISHES LIST ── */}
        <div className="space-y-6">
          {filteredCategories.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 text-center space-y-2.5 shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-300 mx-auto flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-white font-serif">No Menu Items Found</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                {searchQuery
                  ? `No dishes match "${searchQuery}". Please check the spelling or browse other categories.`
                  : "No dishes are currently configured in this menu category."}
              </p>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const categoryItems = cat.items || [];
              if (categoryItems.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-3">
                  {/* Category Header */}
                  <div className="border-b border-violet-500/20 pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-serif font-bold text-white tracking-wide">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="text-[11px] text-slate-400">{cat.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-violet-300">
                      {categoryItems.length} {categoryItems.length === 1 ? "dish" : "dishes"}
                    </span>
                  </div>

                  {/* Dishes Grid/Rows */}
                  <div className="space-y-3">
                    {categoryItems.map((item) => {
                      const qty = getItemQuantityInCart(item.id);
                      const isAvailable = item.is_available;
                      const foodImg = getFoodImageForDish(item.name, cat.name);

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-md shadow-violet-950/20 ${
                            isAvailable
                              ? "bg-[#111C38]/90 border-violet-500/25 hover:border-violet-400/50 hover:shadow-lg"
                              : "bg-[#0B132B]/60 border-violet-950/40 opacity-60"
                          }`}
                        >
                          <div className="flex items-stretch gap-3.5">
                            {/* Food Thumbnail (Clickable to open Food Detail) */}
                            <div
                              onClick={() => isAvailable && handleOpenDetail(item, cat.name)}
                              className="relative w-28 sm:w-32 aspect-square bg-slate-900 shrink-0 cursor-pointer overflow-hidden group"
                            >
                              <img
                                src={foodImg}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                                decoding="async"
                              />
                              {!isAvailable && (
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-1">
                                  <span className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                                    Sold Out
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Food Details, Price & Add Stepper */}
                            <div className="p-3 flex-1 flex flex-col justify-between space-y-2 min-w-0">
                              <div
                                onClick={() => isAvailable && handleOpenDetail(item, cat.name)}
                                className="cursor-pointer space-y-1 min-w-0"
                              >
                                <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                                  {item.name}
                                </h4>

                                {item.description && (
                                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-1.5 border-t border-violet-500/20">
                                <span className="text-sm font-bold text-white font-mono">
                                  {currencySymbol}{Number(item.price).toFixed(2)}
                                </span>

                                {/* Quantity / Add Control */}
                                {isAvailable ? (
                                  qty === 0 ? (
                                    <button
                                      onClick={() => handleAddItem(item)}
                                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-violet-600/30 active:scale-95 transition"
                                      aria-label={`Add ${item.name} to order`}
                                    >
                                      <Plus className="w-3.5 h-3.5 text-white" />
                                      <span>Add</span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-2 bg-[#0B132B] border border-violet-500/40 rounded-xl p-1 shadow-md">
                                      <button
                                        onClick={() => updateQuantity(item.id, qty - 1)}
                                        className="w-6 h-6 rounded-lg bg-white/10 text-slate-300 hover:text-white flex items-center justify-center active:scale-90 transition"
                                        title="Decrease quantity"
                                        aria-label="Decrease quantity"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-xs font-bold text-violet-300 w-4 text-center">
                                        {qty}
                                      </span>
                                      <button
                                        onClick={() => updateQuantity(item.id, qty + 1)}
                                        className="w-6 h-6 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-center active:scale-90 transition font-bold shadow-xs"
                                        title="Increase quantity"
                                        aria-label="Increase quantity"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                                    Unavailable
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 5. FOOD DETAIL BOTTOM SHEET ── */}
      {detailItem && (
        <FoodDetailSheet
          open={!!detailItem}
          onClose={() => setDetailItem(null)}
          item={detailItem}
          categoryName={detailItemCategory}
          currencySymbol={currencySymbol}
          initialQuantity={getItemQuantityInCart(detailItem.id) || 1}
          foodImage={getFoodImageForDish(detailItem.name, detailItemCategory)}
          onAddToCart={handleAddItem}
        />
      )}

      {/* ── 6. TOAST NOTIFICATION ON ADD ── */}
      {addedItemNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-xl shadow-violet-900/50 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 border border-violet-400/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-violet-200" />
          <span>Added &quot;{addedItemNotice}&quot; to order</span>
        </div>
      )}
    </div>
  );
}
