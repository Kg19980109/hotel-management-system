"use client";

import * as React from "react";
import { X, Plus, Minus, ShoppingBag, Sparkles } from "lucide-react";
import { GuestMenuItem } from "@/lib/guest-ordering/types";

interface FoodDetailSheetProps {
  open: boolean;
  onClose: () => void;
  item: GuestMenuItem | null;
  categoryName: string;
  currencySymbol?: string;
  initialQuantity?: number;
  foodImage: string;
  onAddToCart: (item: GuestMenuItem, quantity: number, instructions: string) => void;
}

export function FoodDetailSheet({
  open,
  onClose,
  item,
  categoryName,
  currencySymbol = "₹",
  initialQuantity = 1,
  foodImage,
  onAddToCart,
}: FoodDetailSheetProps) {
  const [quantity, setQuantity] = React.useState(initialQuantity);
  const [instructions, setInstructions] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setQuantity(initialQuantity > 0 ? initialQuantity : 1);
      setInstructions("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, initialQuantity]);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const itemPrice = Number(item.price);
  const totalPrice = itemPrice * quantity;

  const handleConfirmAdd = () => {
    onAddToCart(item, quantity, instructions);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-detail-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Modal Container */}
      <div className="relative w-full max-w-md md:max-w-lg bg-[#0B132B] rounded-t-3xl sm:rounded-3xl border border-violet-500/30 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 z-10 text-slate-100">
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-violet-500/30" />
        </div>

        {/* Food Cover Image Banner */}
        <div className="relative h-52 sm:h-60 w-full bg-slate-950 shrink-0 overflow-hidden">
          <img
            src={foodImage}
            alt={item.name}
            className="w-full h-full object-cover object-center"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-[#0B132B]/50 to-transparent" />

          {/* Category Badge */}
          <div className="absolute top-3.5 left-3.5">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#08111F]/80 backdrop-blur-md text-violet-200 border border-violet-400/30 shadow-xs">
              {categoryName}
            </span>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 flex items-center justify-center transition active:scale-95 shadow-md"
            aria-label="Close food details"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Title & Price on Image Cover */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h2
                id="food-detail-title"
                className="text-lg sm:text-xl font-serif font-bold text-white tracking-tight leading-snug drop-shadow-sm"
              >
                {item.name}
              </h2>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base sm:text-lg font-bold text-violet-300 font-mono drop-shadow-sm">
                {currencySymbol}{itemPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Description */}
          <div className="space-y-1">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-violet-300">
              About This Dish
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {item.description || "Prepared to perfection by our culinary team with fresh seasonal ingredients and served hot to your suite."}
            </p>
          </div>

          {/* Special Instructions */}
          <div className="space-y-1.5">
            <label
              htmlFor="special-notes-input"
              className="block text-[11px] uppercase tracking-wider font-bold text-slate-300"
            >
              Special Instructions (Optional)
            </label>
            <textarea
              id="special-notes-input"
              rows={2}
              placeholder="e.g. Extra spicy, dressing on side, allergy note, extra napkins..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#111C38]/90 border border-violet-500/30 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 transition resize-none shadow-md"
            />
          </div>

          {/* Quantity Selector Section */}
          <div className="p-3.5 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 flex items-center justify-between shadow-md">
            <span className="text-xs font-bold text-white">Select Quantity</span>
            <div className="flex items-center gap-3 bg-[#0B132B] border border-violet-500/30 rounded-xl p-1 shadow-md">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 hover:text-white flex items-center justify-center active:scale-90 transition font-bold"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm font-bold text-white w-6 text-center font-mono">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-center active:scale-90 transition font-bold shadow-xs"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-[#08111F]/95 backdrop-blur-md border-t border-violet-500/20 flex items-center gap-3">
          <button
            type="button"
            onClick={handleConfirmAdd}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-violet-600/30 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
            <span>
              Add {quantity} to Order · {currencySymbol}{totalPrice.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
