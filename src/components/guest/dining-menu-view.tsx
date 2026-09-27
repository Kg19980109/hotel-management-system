"use client";

// ============================================================
// STAYHUB GUEST QR DINING & CULINARY MENU (Phase 6)
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
  X,
  Info,
  ChevronRight,
  Flame,
} from "lucide-react";
import { GuestRestaurant, GuestMenuCategory, GuestMenuItem } from "@/lib/guest-ordering/types";
import { useCart } from "./cart-context";
import { Modal } from "@/components/ui/modal";

interface DiningMenuViewProps {
  restaurant: GuestRestaurant;
  categories: GuestMenuCategory[];
  isVerifiedStay: boolean;
  roomNumber?: string;
}

// Curated high-res culinary image catalog for luxury food cards
const getFoodImageForDish = (dishName: string, categoryName: string): string => {
  const text = `${dishName} ${categoryName}`.toLowerCase();
  if (text.includes("burger")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80";
  }
  if (text.includes("pizza")) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80";
  }
  if (text.includes("biryani") || text.includes("rice")) {
    return "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=700&q=80";
  }
  if (text.includes("paneer") || text.includes("tikka") || text.includes("curry") || text.includes("masala")) {
    return "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=700&q=80";
  }
  if (text.includes("coffee") || text.includes("tea") || text.includes("latte") || text.includes("cappuccino")) {
    return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=700&q=80";
  }
  if (text.includes("drink") || text.includes("cocktail") || text.includes("beverage") || text.includes("juice") || text.includes("wine")) {
    return "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=700&q=80";
  }
  if (text.includes("cake") || text.includes("dessert") || text.includes("sweet") || text.includes("chocolate") || text.includes("ice cream")) {
    return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=700&q=80";
  }
  if (text.includes("pasta") || text.includes("noodle") || text.includes("spaghetti")) {
    return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=700&q=80";
  }
  if (text.includes("salad") || text.includes("soup") || text.includes("starter")) {
    return "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80";
  }
  if (text.includes("steak") || text.includes("chicken") || text.includes("grill") || text.includes("meat") || text.includes("kebab")) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80";
  }
  if (text.includes("fish") || text.includes("seafood") || text.includes("prawn")) {
    return "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=700&q=80";
  }
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80";
};

export function DiningMenuView({
  restaurant,
  categories,
  isVerifiedStay,
  roomNumber,
}: DiningMenuViewProps) {
  const { addItem, items, updateQuantity, totalItems, subtotal } = useCart();
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [addedItemNotice, setAddedItemNotice] = React.useState<string | null>(null);

  // Selected item for Food Detail Modal
  const [detailItem, setDetailItem] = React.useState<GuestMenuItem | null>(null);
  const [detailItemCategory, setDetailItemCategory] = React.useState<string>("");
  const [detailQuantity, setDetailQuantity] = React.useState<number>(1);
  const [detailInstructions, setDetailInstructions] = React.useState<string>("");

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

  const getItemQuantityInCart = (menuItemId: string) => {
    const found = items.find((i) => i.menu_item_id === menuItemId);
    return found ? found.quantity : 0;
  };

  const handleAddItem = (item: GuestMenuItem, customQty = 1, instructions = "") => {
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
  };

  const handleOpenDetail = (item: GuestMenuItem, categoryName: string) => {
    setDetailItem(item);
    setDetailItemCategory(categoryName);
    const existingQty = getItemQuantityInCart(item.id);
    setDetailQuantity(existingQty > 0 ? existingQty : 1);
    setDetailInstructions("");
  };

  const currencySymbol = "₹";

  return (
    <div className="p-4 space-y-5 pb-36">
      {/* ── TOP NAV BAR ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/dining"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Restaurants</span>
        </Link>
        {isVerifiedStay && (
          <span className="text-[11px] font-bold text-[var(--brand-gold)] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[var(--brand-gold)]" />
            Delivering to Room {roomNumber}
          </span>
        )}
      </div>

      {/* ── RESTAURANT HEADER CARD ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08111F] via-[#0E1A38] to-[#121B3B] border border-white/10 p-5 shadow-2xl space-y-2.5">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-[var(--brand-gold)]/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-[var(--brand-gold)]/15 border border-[var(--brand-gold)]/25 text-[var(--brand-gold)] text-[10px] font-black uppercase tracking-wider">
            {restaurant.cuisine_type || "Fine Dining"}
          </span>
          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Kitchen Active
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading">
          {restaurant.name}
        </h2>

        {restaurant.description && (
          <p className="text-xs text-slate-300/80 leading-relaxed">
            {restaurant.description}
          </p>
        )}

        {(restaurant.opening_time || restaurant.closing_time) && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-white/10">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Service Hours: {restaurant.opening_time || "07:00"} – {restaurant.closing_time || "23:00"}
            </span>
          </div>
        )}
      </div>

      {/* ── SEARCH INPUT ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search culinary dishes, drinks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold)] transition"
        />
      </div>

      {/* ── CATEGORY PILLS BAR ── */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === "ALL"
                ? "bg-[var(--brand-gold)] text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08]"
            }`}
          >
            All Dishes
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "bg-[var(--brand-gold)] text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* ── DISHES LIST ── */}
      <div className="space-y-6">
        {filteredCategories.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white/[0.04] border border-white/10 text-center space-y-2">
            <p className="text-xs text-slate-400">No dishes match your search.</p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const categoryItems = cat.items || [];
            if (categoryItems.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-3">
                <div className="border-b border-white/10 pb-1.5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-white tracking-wide">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-[11px] text-slate-400">{cat.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {categoryItems.length} items
                  </span>
                </div>

                <div className="space-y-3">
                  {categoryItems.map((item) => {
                    const qty = getItemQuantityInCart(item.id);
                    const isAvailable = item.is_available;
                    const foodImg = getFoodImageForDish(item.name, cat.name);

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                          isAvailable
                            ? "bg-white/[0.04] border-white/10 hover:border-[var(--brand-gold)]/40 hover:bg-white/[0.07]"
                            : "bg-black/30 border-white/5 opacity-55"
                        }`}
                      >
                        <div className="flex items-stretch gap-3">
                          {/* Food Photo (clickable to open detail) */}
                          <div
                            onClick={() => isAvailable && handleOpenDetail(item, cat.name)}
                            className="relative w-28 sm:w-32 bg-slate-900 shrink-0 cursor-pointer overflow-hidden group"
                          >
                            <img
                              src={foodImg}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm">
                                  Sold Out
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Food Details & Pricing */}
                          <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                            <div
                              onClick={() => isAvailable && handleOpenDetail(item, cat.name)}
                              className="cursor-pointer space-y-1"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                                  {item.name}
                                </h4>
                              </div>

                              {item.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                              <span className="text-sm font-black text-[var(--brand-gold)] font-mono">
                                {currencySymbol}{Number(item.price).toFixed(2)}
                              </span>

                              {/* Quantity Controls */}
                              {isAvailable ? (
                                qty === 0 ? (
                                  <button
                                    onClick={() => handleAddItem(item)}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--brand-gold)] to-amber-500 hover:brightness-105 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 transition"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2 bg-slate-950/80 border border-[var(--brand-gold)]/50 rounded-xl p-1 shadow-sm">
                                    <button
                                      onClick={() => updateQuantity(item.id, qty - 1)}
                                      className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-90 transition"
                                      title="Decrease quantity"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-black text-[var(--brand-gold)] w-4 text-center">
                                      {qty}
                                    </span>
                                    <button
                                      onClick={() => updateQuantity(item.id, qty + 1)}
                                      className="w-6 h-6 rounded-lg bg-[var(--brand-gold)] hover:brightness-105 text-slate-950 flex items-center justify-center active:scale-90 transition font-bold"
                                      title="Increase quantity"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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

      {/* ── FOOD DETAIL MODAL ── */}
      {detailItem && (
        <Modal
          open={!!detailItem}
          onClose={() => setDetailItem(null)}
          title={detailItem.name}
          description={`${detailItemCategory} • ${currencySymbol}${Number(detailItem.price).toFixed(2)}`}
        >
          <div className="space-y-4 text-xs">
            {/* Modal Image */}
            <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
              <img
                src={getFoodImageForDish(detailItem.name, detailItemCategory)}
                alt={detailItem.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-[var(--brand-gold)]">
                {detailItemCategory}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {detailItem.description || "Authentic culinary preparation made fresh with premium seasonal ingredients."}
              </p>
            </div>

            {/* Special Instructions Note */}
            <div>
              <label className="block font-bold text-slate-200 mb-1">
                Special Instructions (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Extra spicy, dressing on side, allergy note..."
                value={detailInstructions}
                onChange={(e) => setDetailInstructions(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold)] resize-none"
              />
            </div>

            {/* Stepper & Add Button */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 bg-slate-950 border border-white/10 rounded-xl p-1.5">
                <button
                  type="button"
                  onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-black text-white w-5 text-center">
                  {detailQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailQuantity(detailQuantity + 1)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleAddItem(detailItem, detailQuantity, detailInstructions);
                  setDetailItem(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--brand-gold)] to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add {detailQuantity} to Order • {currencySymbol}{(Number(detailItem.price) * detailQuantity).toFixed(2)}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── TOAST NOTIFICATION ON ADD ── */}
      {addedItemNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-500 text-slate-950 font-black text-xs shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Added &quot;{addedItemNotice}&quot; to order</span>
        </div>
      )}
    </div>
  );
}
