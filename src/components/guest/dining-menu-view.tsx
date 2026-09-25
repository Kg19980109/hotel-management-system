"use client";

import * as React from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  ArrowLeft,
  Clock,
  Sparkles
} from "lucide-react";
import { GuestRestaurant, GuestMenuCategory, GuestMenuItem } from "@/lib/guest-ordering/types";
import { useCart } from "./cart-context";

interface DiningMenuViewProps {
  restaurant: GuestRestaurant;
  categories: GuestMenuCategory[];
  isVerifiedStay: boolean;
  roomNumber?: string;
}

export function DiningMenuView({
  restaurant,
  categories,
  isVerifiedStay,
  roomNumber,
}: DiningMenuViewProps) {
  const { addItem, items, updateQuantity, totalItems, subtotal } = useCart();
  const [selectedCategory, setSelectedCategory] = React.useState<string>(
    categories[0]?.id || "ALL"
  );
  const [addedItemNotice, setAddedItemNotice] = React.useState<string | null>(null);

  const filteredCategories =
    selectedCategory === "ALL"
      ? categories
      : categories.filter((c) => c.id === selectedCategory);

  const getItemQuantityInCart = (menuItemId: string) => {
    const found = items.find((i) => i.menu_item_id === menuItemId);
    return found ? found.quantity : 0;
  };

  const handleAddItem = (item: GuestMenuItem) => {
    addItem(restaurant.id, restaurant.name, {
      menu_item_id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: 1,
      category_id: item.category_id,
      currency: item.currency || restaurant.currency || "INR",
    });
    setAddedItemNotice(item.name);
    setTimeout(() => setAddedItemNotice(null), 1800);
  };

  return (
    <div className="p-4 space-y-5 pb-28">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/dining"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Restaurants</span>
        </Link>
        {isVerifiedStay && (
          <span className="text-[11px] font-semibold text-amber-400">
            Delivering to Room {roomNumber}
          </span>
        )}
      </div>

      {/* Restaurant Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
            {restaurant.cuisine_type || "Fine Dining"}
          </span>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Kitchen Active
          </span>
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">
          {restaurant.name}
        </h2>
        {restaurant.description && (
          <p className="text-xs text-slate-400">{restaurant.description}</p>
        )}
        {(restaurant.opening_time || restaurant.closing_time) && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Service Hours: {restaurant.opening_time || "07:00"} – {restaurant.closing_time || "23:00"}
            </span>
          </div>
        )}
      </div>

      {/* Category Pills Tab Bar */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === "ALL"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Menu Categories & Items List */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => {
          const categoryItems = cat.items || [];
          if (categoryItems.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-3">
              <div className="border-b border-slate-800 pb-1.5">
                <h3 className="text-sm font-bold text-white">{cat.name}</h3>
                {cat.description && (
                  <p className="text-[11px] text-slate-400">{cat.description}</p>
                )}
              </div>

              <div className="space-y-2.5">
                {categoryItems.map((item) => {
                  const qty = getItemQuantityInCart(item.id);
                  const isAvailable = item.is_available;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition ${
                        isAvailable
                          ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                          : "bg-slate-950/60 border-slate-850 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">
                              {item.name}
                            </h4>
                            {!isAvailable && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Sold Out
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <p className="text-xs font-extrabold text-amber-400 pt-0.5">
                            {item.currency || restaurant.currency || "INR"}{" "}
                            {Number(item.price).toFixed(2)}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        {isAvailable && (
                          <div className="shrink-0 flex items-center">
                            {qty === 0 ? (
                              <button
                                onClick={() => handleAddItem(item)}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1 shadow transition"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 bg-slate-950 border border-amber-500/40 rounded-lg p-1">
                                <button
                                  onClick={() => updateQuantity(item.id, qty - 1)}
                                  className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold text-amber-400 px-1">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, qty + 1)}
                                  className="w-6 h-6 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Added Toast Notification */}
      {addedItemNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Added &quot;{addedItemNotice}&quot; to cart</span>
        </div>
      )}

      {/* Sticky Bottom Cart CTA Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 max-w-md mx-auto px-4 py-2">
          <Link
            href="/guest/cart"
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-2xl flex items-center justify-between transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-950/20 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 fill-slate-950" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black">
                  {totalItems} {totalItems === 1 ? "Item" : "Items"} in Cart
                </div>
                <div className="text-[11px] font-semibold text-slate-900/80">
                  {restaurant.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black">
                {restaurant.currency || "INR"} {subtotal.toFixed(2)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-400 text-xs font-bold">
                View Cart →
              </span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
