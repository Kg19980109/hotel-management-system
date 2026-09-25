"use client";

import * as React from "react";
import { GuestCartItem } from "@/lib/guest-ordering/types";

interface CartContextType {
  restaurantId: string | null;
  restaurantName: string | null;
  items: GuestCartItem[];
  addItem: (restaurantId: string, restaurantName: string, item: GuestCartItem) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "stayhub_guest_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [restaurantId, setRestaurantId] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.restaurantId || null;
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [restaurantName, setRestaurantName] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.restaurantName || null;
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [items, setItems] = React.useState<GuestCartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.items)) return parsed.items;
      }
    } catch {
      // Ignore
    }
    return [];
  });

  // Sync to localStorage
  const saveCart = (rId: string | null, rName: string | null, nextItems: GuestCartItem[]) => {
    try {
      if (rId && nextItems.length > 0) {
        localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify({ restaurantId: rId, restaurantName: rName, items: nextItems })
        );
      } else {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  };

  const addItem = (newRestaurantId: string, newRestaurantName: string, item: GuestCartItem) => {
    setItems((prev) => {
      // If switching restaurants, clear previous restaurant's cart
      let targetItems = prev;
      if (restaurantId && restaurantId !== newRestaurantId) {
        targetItems = [];
      }

      const existingIndex = targetItems.findIndex((i) => i.menu_item_id === item.menu_item_id);
      let updated: GuestCartItem[];

      if (existingIndex > -1) {
        updated = targetItems.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      } else {
        updated = [...targetItems, item];
      }

      setRestaurantId(newRestaurantId);
      setRestaurantName(newRestaurantName);
      saveCart(newRestaurantId, newRestaurantName, updated);
      return updated;
    });
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    setItems((prev) => {
      let updated: GuestCartItem[];
      if (quantity <= 0) {
        updated = prev.filter((i) => i.menu_item_id !== menuItemId);
      } else {
        updated = prev.map((i) =>
          i.menu_item_id === menuItemId ? { ...i, quantity } : i
        );
      }

      if (updated.length === 0) {
        setRestaurantId(null);
        setRestaurantName(null);
        saveCart(null, null, []);
      } else {
        saveCart(restaurantId, restaurantName, updated);
      }
      return updated;
    });
  };

  const removeItem = (menuItemId: string) => {
    updateQuantity(menuItemId, 0);
  };

  const clearCart = () => {
    setRestaurantId(null);
    setRestaurantName(null);
    setItems([]);
    saveCart(null, null, []);
  };

  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        restaurantId,
        restaurantName,
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
