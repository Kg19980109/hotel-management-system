"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  Restaurant,
  RestaurantTable,
  MenuCategory,
  MenuItem,
  OrderType,
} from "@/lib/restaurant/types";
import { createOrderAction } from "@/lib/restaurant/actions";

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

interface PosTerminalProps {
  propertyId: string;
  restaurant: Restaurant;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  onOrderCreated?: (orderId: string, orderNumber: string) => void;
}

export function PosTerminal({
  propertyId,
  restaurant,
  categories,
  menuItems,
  tables,
  onOrderCreated,
}: PosTerminalProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeItemNotesId, setActiveItemNotesId] = useState<string | null>(null);

  // Available tables filter (for DINE_IN)
  const availableTables = useMemo(() => {
    return tables.filter((t) => t.is_active);
  }, [tables]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.is_active) return false;
      if (selectedCategory !== "ALL" && item.category_id !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q) || false;
        const matchesShort = item.short_name?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesDesc && !matchesShort) return false;
      }
      return true;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!item.is_available) {
      toastError("Item Unavailable", `${item.name} is currently out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((ci) => ci.menu_item_id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menu_item_id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          notes: "",
        },
      ];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.menu_item_id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((ci) => (ci.menu_item_id === itemId ? { ...ci, notes } : ci))
    );
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.menu_item_id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setOrderNotes("");
    setDiscountAmount(0);
    setSelectedTableId("");
    setActiveItemNotesId(null);
  };

  // Calculations (mirrored server-side)
  const subtotal = useMemo(() => {
    return cart.reduce((acc, ci) => acc + ci.price * ci.quantity, 0);
  }, [cart]);

  const sanitizedDiscount = useMemo(() => {
    if (!discountAmount || discountAmount < 0) return 0;
    return Math.min(discountAmount, subtotal);
  }, [discountAmount, subtotal]);

  const taxAmount = 0; // Tax configuration ready
  const serviceCharge = 0;
  const totalAmount = Math.max(0, subtotal - sanitizedDiscount + taxAmount + serviceCharge);

  // Submit order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toastError("Empty Cart", "Please add at least one item to place an order.");
      return;
    }

    if (orderType === "DINE_IN" && !selectedTableId) {
      toastError("Table Required", "Please select a table for Dine-In orders.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createOrderAction({
        property_id: propertyId,
        restaurant_id: restaurant.id,
        order_type: orderType,
        table_id: orderType === "DINE_IN" ? selectedTableId : null,
        notes: orderNotes.trim() || null,
        discount_amount: sanitizedDiscount,
        items: cart.map((ci) => ({
          menu_item_id: ci.menu_item_id,
          quantity: ci.quantity,
          notes: ci.notes.trim() || undefined,
        })),
      });

      if (!res.success || !res.data) {
        toastError("Order Creation Failed", res.error || "Unable to place order.");
        return;
      }

      success(
        "Order Placed Successfully",
        `Order ${res.data.order_number} has been created.`
      );

      if (onOrderCreated) {
        onOrderCreated(res.data.id, res.data.order_number);
      } else {
        router.push(`/restaurant/orders/${res.data.id}`);
      }

      clearCart();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT & CENTER: MENU CATALOG (7 cols on lg, 8 cols on xl) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        {/* Top Controls: Category Pills & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-xl border border-border shadow-xs">
          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin flex-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All Items ({menuItems.filter((m) => m.is_active).length})
            </button>
            {categories
              .filter((c) => c.is_active)
              .map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-60 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border flex flex-col items-center justify-center p-6">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h4 className="text-sm font-semibold text-foreground">No menu items found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? "Try searching with a different term or clear your filter."
                : "No menu items have been added to this category yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map((item) => {
              const inCartItem = cart.find((ci) => ci.menu_item_id === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`group relative p-3.5 rounded-xl border transition-all duration-150 flex flex-col justify-between select-none cursor-pointer ${
                    !item.is_available
                      ? "bg-muted/40 border-border opacity-60 cursor-not-allowed"
                      : inCartItem
                      ? "bg-primary/5 border-primary/40 shadow-xs hover:border-primary"
                      : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <h4 className="font-semibold text-xs tracking-tight text-foreground line-clamp-2">
                        {item.name}
                      </h4>
                      {inCartItem && (
                        <span className="shrink-0 h-5 min-w-[20px] px-1 bg-primary text-primary-foreground text-[11px] font-bold rounded-full flex items-center justify-center">
                          {inCartItem.quantity}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-1">
                    <span className="text-xs font-bold text-foreground">
                      ${item.price.toFixed(2)}
                    </span>
                    {item.is_available ? (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                        Out of stock
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT: CURRENT ORDER / CART (5 cols on lg, 4 cols on xl) */}
      <div className="lg:col-span-5 xl:col-span-4 bg-card rounded-xl border border-border shadow-xs p-4 flex flex-col gap-4 sticky top-4">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Current Order</h3>
              <p className="text-[11px] text-muted-foreground">{restaurant.name}</p>
            </div>
          </div>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-7 px-2"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Order Type & Table Selection */}
        <div className="space-y-3">
          {/* Order Type Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setOrderType("DINE_IN")}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                orderType === "DINE_IN"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dine In
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderType("TAKEAWAY");
                setSelectedTableId("");
              }}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                orderType === "TAKEAWAY"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Takeaway
            </button>
          </div>

          {/* Table Selector (for DINE_IN) */}
          {orderType === "DINE_IN" && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Select Table <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Choose a table --</option>
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.table_number}{" "}
                    {t.display_name ? `(${t.display_name})` : ""} - {t.status} (Cap:{" "}
                    {t.capacity})
                  </option>
                ))}
              </select>
              {availableTables.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  No tables configured for this restaurant yet.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 max-h-[320px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {cart.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground flex flex-col items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs">No items in the order</p>
              <p className="text-[11px] opacity-70">Tap items on the left to add</p>
            </div>
          ) : (
            cart.map((ci) => (
              <div
                key={ci.menu_item_id}
                className="p-2.5 rounded-lg border border-border/70 bg-card/50 hover:bg-card transition-all space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-foreground">
                      {ci.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      ${ci.price.toFixed(2)} each
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(ci.menu_item_id, -1)}
                      className="h-6 w-6 rounded border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">
                      {ci.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(ci.menu_item_id, 1)}
                      className="h-6 w-6 rounded border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(ci.menu_item_id)}
                      className="h-6 w-6 rounded text-muted-foreground hover:text-rose-600 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Line Total & Notes Trigger */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveItemNotesId(
                        activeItemNotesId === ci.menu_item_id ? null : ci.menu_item_id
                      )
                    }
                    className="text-primary hover:underline text-[11px] font-medium"
                  >
                    {ci.notes ? "Edit Note" : "+ Add Note"}
                  </button>
                  <span className="font-bold text-foreground">
                    ${(ci.price * ci.quantity).toFixed(2)}
                  </span>
                </div>

                {/* Item Notes Input */}
                {activeItemNotesId === ci.menu_item_id && (
                  <Input
                    type="text"
                    placeholder="E.g. Extra spicy, no onions..."
                    value={ci.notes}
                    onChange={(e) =>
                      updateItemNotes(ci.menu_item_id, e.target.value)
                    }
                    className="text-[11px] h-7 mt-1 bg-background"
                    autoFocus
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Order Notes & Discount */}
        {cart.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/80">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Order Notes
              </label>
              <Input
                type="text"
                placeholder="Special guest instructions..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="text-xs h-7"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Discount Amount ($)
              </label>
              <Input
                type="number"
                min="0"
                max={subtotal}
                step="0.01"
                placeholder="0.00"
                value={discountAmount || ""}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                className="text-xs h-7"
              />
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="pt-2 border-t border-border space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-semibold text-foreground">
              ${subtotal.toFixed(2)}
            </span>
          </div>

          {sanitizedDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Discount</span>
              <span>-${sanitizedDiscount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-muted-foreground text-[11px]">
            <span>Tax (0.00%)</span>
            <span>$0.00</span>
          </div>

          <div className="flex justify-between text-muted-foreground text-[11px]">
            <span>Service Charge</span>
            <span>$0.00</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border text-sm font-bold text-foreground">
            <span>Total Amount</span>
            <span className="text-base text-primary">${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handlePlaceOrder}
          disabled={cart.length === 0 || isSubmitting}
          className="w-full h-10 font-bold text-xs tracking-wide"
        >
          {isSubmitting ? (
            "Placing Order..."
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Place Order (${totalAmount.toFixed(2)})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
