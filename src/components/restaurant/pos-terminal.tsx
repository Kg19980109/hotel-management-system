"use client";

// ============================================================
// STAYHUB UNIFIED HOTEL POS TERMINAL (Phase 12)
// Food Menu, Room Tariffs, Hotel Services & Instant Billing Engine
// Currency: INR (₹) Strictly Globally
// ============================================================

import * as React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  ShoppingBag,
  CheckCircle2,
  Bed,
  BedDouble,
  Sparkles,
  Receipt,
  CreditCard,
  QrCode,
  Banknote,
  Printer,
  Clock,
  ArrowRight,
  X,
  Store,
  RefreshCw,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  Loader2,
  DollarSign,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  Restaurant,
  RestaurantTable,
  MenuCategory,
  MenuItem,
  OrderType,
  RestaurantOrder,
  getPosItemSection,
} from "@/lib/restaurant/types";
import {
  createOrderAction,
  completeOrderAction,
} from "@/lib/restaurant/actions";
import { getRestaurantOrders } from "@/lib/restaurant/queries";
import {
  searchActiveRoomFolioAction,
  recordFolioPaymentAction,
  generateInvoiceAction,
} from "@/lib/billing/actions";

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
  category_name?: string | null;
}

interface PosTerminalProps {
  propertyId: string;
  restaurant: Restaurant;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  onOrderCreated?: (orderId: string, orderNumber: string) => void;
}

type CatalogSection = "FOOD" | "ROOMS" | "SERVICES" | "CHECKOUT" | "ORDERS";
type PaymentMethod = "CASH" | "UPI" | "CARD" | "ROOM_CHARGE";

export function PosTerminal({
  propertyId,
  restaurant,
  categories,
  menuItems,
  tables,
  onOrderCreated,
}: PosTerminalProps) {
  const { success, error: toastError } = useToast();

  // Active Catalog Section
  const [activeSection, setActiveSection] = useState<CatalogSection>("FOOD");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [roomNumberInput, setRoomNumberInput] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeItemNotesId, setActiveItemNotesId] = useState<string | null>(null);

  // Settlement & Receipt Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [completedBill, setCompletedBill] = useState<{
    orderId: string;
    orderNumber: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: PaymentMethod;
    paidAt: string;
    destination: string;
  } | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Recent Orders State (for the Live Bills tab)
  const [recentOrders, setRecentOrders] = useState<RestaurantOrder[]>([]);
  const [loadingRecentOrders, setLoadingRecentOrders] = useState(false);

  // Room Folio Search & Checkout State
  const [folioSearchQuery, setFolioSearchQuery] = useState<string>("");
  const [isSearchingFolio, setIsSearchingFolio] = useState<boolean>(false);
  const [searchedRoomFolio, setSearchedRoomFolio] = useState<any | null>(null);
  const [folioSettlePaymentMethod, setFolioSettlePaymentMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [folioSettleNotes, setFolioSettleNotes] = useState<string>("");
  const [isSettlingRoomFolio, setIsSettlingRoomFolio] = useState<boolean>(false);

  const handleSearchRoomFolio = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!folioSearchQuery.trim()) {
      toastError("Search Query Required", "Please enter a room number or guest name.");
      return;
    }

    try {
      setIsSearchingFolio(true);
      const res = await searchActiveRoomFolioAction(propertyId, folioSearchQuery.trim());
      if (!res.success || !res.data) {
        toastError("Not Found", res.error || "Failed to search room folio.");
        setSearchedRoomFolio(null);
        return;
      }

      if (!res.data.found) {
        toastError("No Active Stay Found", res.data.message || "No active checked-in stay found.");
        setSearchedRoomFolio(null);
        return;
      }

      setSearchedRoomFolio(res.data);
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to search folio.");
    } finally {
      setIsSearchingFolio(false);
    }
  };

  const handleSettleRoomFolio = async () => {
    if (!searchedRoomFolio || !searchedRoomFolio.folio) return;
    const folioId = searchedRoomFolio.folio.id;
    const balanceDue = searchedRoomFolio.folio.balance_due;

    try {
      setIsSettlingRoomFolio(true);

      if (balanceDue > 0) {
        const payRes = await recordFolioPaymentAction({
          propertyId,
          folioId,
          paymentMethod: folioSettlePaymentMethod,
          amount: balanceDue,
          notes: folioSettleNotes.trim() || `POS Room Checkout Settlement (${folioSettlePaymentMethod})`,
        });

        if (!payRes.success) {
          toastError("Payment Failed", payRes.error || "Failed to record settlement payment.");
          return;
        }
      }

      // Generate invoice
      await generateInvoiceAction({
        propertyId,
        folioId,
        billingName: searchedRoomFolio.stay.guest_name,
        billingEmail: searchedRoomFolio.stay.email,
      });

      // Prepare completed bill receipt modal
      setCompletedBill({
        orderId: folioId,
        orderNumber: searchedRoomFolio.folio.folio_number,
        items: (searchedRoomFolio.charges || []).map((c: any) => ({
          menu_item_id: c.id,
          name: c.description,
          price: Number(c.unit_price),
          quantity: Number(c.quantity),
          notes: c.charge_type,
        })),
        subtotal: searchedRoomFolio.folio.charges_subtotal,
        discount: searchedRoomFolio.folio.discounts_total,
        total: searchedRoomFolio.folio.charges_subtotal + searchedRoomFolio.folio.taxes_total,
        paymentMethod: folioSettlePaymentMethod,
        paidAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        destination: `Room ${searchedRoomFolio.stay.room_number} (${searchedRoomFolio.stay.guest_name})`,
      });

      setIsReceiptModalOpen(true);
      success("Room Bill Settled!", `Room ${searchedRoomFolio.stay.room_number} folio is now settled. Tax invoice generated.`);

      // Re-search to refresh
      void handleSearchRoomFolio();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to settle room folio.");
    } finally {
      setIsSettlingRoomFolio(false);
    }
  };

  const loadRecentOrders = useCallback(async () => {
    if (!propertyId || !restaurant.id) return;
    try {
      setLoadingRecentOrders(true);
      const res = await getRestaurantOrders(propertyId, {
        restaurantId: restaurant.id,
        limit: 15,
      });
      setRecentOrders(res.orders);
    } catch (err) {
      console.error("Failed to load recent orders:", err);
    } finally {
      setLoadingRecentOrders(false);
    }
  }, [propertyId, restaurant.id]);

  useEffect(() => {
    if (activeSection === "ORDERS") {
      void loadRecentOrders();
    }
  }, [activeSection, loadRecentOrders]);

  // Available tables filter (for DINE_IN)
  const availableTables = useMemo(() => {
    return tables.filter((t) => t.is_active);
  }, [tables]);

  // Categorize menu items based on active section
  const sectionCategories = useMemo(() => {
    if (activeSection === "ROOMS") {
      return categories.filter((c) =>
        c.name.toLowerCase().includes("room") || c.name.toLowerCase().includes("stay")
      );
    }
    if (activeSection === "SERVICES") {
      return categories.filter((c) =>
        c.name.toLowerCase().includes("service") ||
        c.name.toLowerCase().includes("amenit") ||
        c.name.toLowerCase().includes("spa") ||
        c.name.toLowerCase().includes("laundry")
      );
    }
    // FOOD section: all categories excluding Room Tariffs and Hotel Services
    return categories.filter(
      (c) =>
        !c.name.toLowerCase().includes("room tariffs") &&
        !c.name.toLowerCase().includes("hotel services")
    );
  }, [categories, activeSection]);

  // Filter items according to section, category, and search query
  const filteredItems = useMemo(() => {
    let items = menuItems.filter((m) => m.is_active && getPosItemSection(m) === activeSection);

    if (selectedCategory !== "ALL") {
      items = items.filter((item) => item.category_id === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((item) => {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q) || false;
        const matchesShort = item.short_name?.toLowerCase().includes(q) || false;
        return matchesName || matchesDesc || matchesShort;
      });
    }

    return items;
  }, [menuItems, activeSection, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!item.is_available) {
      toastError("Item Unavailable", `${item.name} is currently marked out of stock.`);
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
          category_name: item.category_name,
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
    setRoomNumberInput("");
    setActiveItemNotesId(null);
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, ci) => acc + ci.price * ci.quantity, 0);
  }, [cart]);

  const sanitizedDiscount = useMemo(() => {
    if (!discountAmount || discountAmount < 0) return 0;
    return Math.min(discountAmount, subtotal);
  }, [discountAmount, subtotal]);

  const taxAmount = 0;
  const serviceCharge = 0;
  const totalAmount = Math.max(0, subtotal - sanitizedDiscount + taxAmount + serviceCharge);

  // Suggested tendered cash buttons
  const cashSuggestions = useMemo(() => {
    const ceil500 = Math.ceil(totalAmount / 500) * 500 || 500;
    const ceil1000 = Math.ceil(totalAmount / 1000) * 1000 || 1000;
    const ceil2000 = Math.ceil(totalAmount / 2000) * 2000 || 2000;
    const set = new Set([totalAmount, ceil500, ceil1000, ceil2000]);
    return Array.from(set).filter((amt) => amt >= totalAmount).sort((a, b) => a - b);
  }, [totalAmount]);

  const changeToReturn = Math.max(0, (tenderedAmount || 0) - totalAmount);

  // Validate before order creation / settlement
  const validateOrder = (): boolean => {
    if (cart.length === 0) {
      toastError("Empty Order", "Please add at least one item to place a bill.");
      return false;
    }
    if (orderType === "DINE_IN" && !selectedTableId) {
      toastError("Table Required", "Please select a dining table for Dine-In billing.");
      return false;
    }
    if (orderType === "ROOM_SERVICE" && !roomNumberInput.trim()) {
      toastError("Room Number Required", "Please enter the room number for Room Service / Stay billing.");
      return false;
    }
    return true;
  };

  // Direct Order Placement
  const handlePlaceOrder = async (shouldSettleImmediately = false) => {
    if (!validateOrder()) return;

    setIsSubmitting(true);
    try {
      const formattedNotes = [
        orderNotes.trim(),
        orderType === "ROOM_SERVICE" && roomNumberInput.trim()
          ? `[Room: ${roomNumberInput.trim()}]`
          : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const res = await createOrderAction({
        property_id: propertyId,
        restaurant_id: restaurant.id,
        order_type: orderType,
        room_number: orderType === "ROOM_SERVICE" && roomNumberInput.trim() ? roomNumberInput.trim() : undefined,
        table_id: orderType === "DINE_IN" ? selectedTableId : null,
        notes: formattedNotes || null,
        discount_amount: sanitizedDiscount,
        fire_kitchen_ticket: false,
        items: cart.map((ci) => ({
          menu_item_id: ci.menu_item_id,
          quantity: ci.quantity,
          notes: ci.notes.trim() || undefined,
        })),
      });

      if (!res.success || !res.data) {
        toastError("Billing Failed", res.error || "Unable to place POS order.");
        return;
      }

      const createdOrderId = res.data.id;
      const createdOrderNumber = res.data.order_number;

      let destinationLabel = "Direct Counter / Takeaway";
      if (orderType === "DINE_IN") {
        const tbl = tables.find((t) => t.id === selectedTableId);
        destinationLabel = `Table ${tbl?.table_number || "Selected"}`;
      } else if (orderType === "ROOM_SERVICE") {
        destinationLabel = `Room ${roomNumberInput.trim()}`;
      }

      if (shouldSettleImmediately) {
        // Automatically settle and mark complete
        await completeOrderAction(propertyId, createdOrderId, `Settled via POS (${paymentMethod})`);
      }

      // Setup bill details for receipt view
      setCompletedBill({
        orderId: createdOrderId,
        orderNumber: createdOrderNumber,
        items: [...cart],
        subtotal,
        discount: sanitizedDiscount,
        total: totalAmount,
        paymentMethod,
        paidAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        destination: destinationLabel,
      });

      setIsSettleModalOpen(false);
      setIsReceiptModalOpen(true);

      success(
        shouldSettleImmediately ? "Bill Settled & Completed" : "Order Placed Successfully",
        `Order ${createdOrderNumber} (${destinationLabel}) is recorded in POS.`
      );

      if (onOrderCreated) {
        onOrderCreated(createdOrderId, createdOrderNumber);
      }

      clearCart();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── TOP SECTION NAVIGATION PILLS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-2.5 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <button
            type="button"
            onClick={() => {
              setActiveSection("FOOD");
              setSelectedCategory("ALL");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === "FOOD"
                ? "bg-[var(--brand-gold)] text-slate-950 shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            Food & Dining Menu
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection("ROOMS");
              setSelectedCategory("ALL");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === "ROOMS"
                ? "bg-[var(--brand-gold)] text-slate-950 shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Bed className="h-4 w-4" />
            Rooms & Stay Charges
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection("SERVICES");
              setSelectedCategory("ALL");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === "SERVICES"
                ? "bg-[var(--brand-gold)] text-slate-950 shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Hotel Services & Spa
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("CHECKOUT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === "CHECKOUT"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <BedDouble className="h-4 w-4" />
            Room Checkout & Folio
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("ORDERS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === "ORDERS"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Receipt className="h-4 w-4" />
            Live Orders & Bills
          </button>
        </div>

        {/* Search Bar */}
        {activeSection !== "ORDERS" && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search ${
                activeSection === "FOOD"
                  ? "dishes & drinks..."
                  : activeSection === "ROOMS"
                  ? "room tariffs..."
                  : "hotel services..."
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 rounded-xl bg-background"
            />
          </div>
        )}
      </div>

      {/* ── ROOM CHECKOUT & FOLIO SEARCH TAB ── */}
      {activeSection === "CHECKOUT" ? (
        <div className="space-y-5">
          {/* Top Search Banner */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-amber-500" />
                  Room Folio Search & Instant Checkout
                </h3>
                <p className="text-xs text-muted-foreground">
                  Fetch live guest stay charges, food orders, laundry, services, and settle the final bill directly from POS.
                </p>
              </div>

              {searchedRoomFolio && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchedRoomFolio(null);
                    setFolioSearchQuery("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground h-8"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear Search
                </Button>
              )}
            </div>

            <form onSubmit={handleSearchRoomFolio} className="flex gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter Room Number (e.g. 303, 101) or Guest Name / Phone..."
                  value={folioSearchQuery}
                  onChange={(e) => setFolioSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs font-medium"
                />
              </div>
              <Button
                type="submit"
                disabled={isSearchingFolio || !folioSearchQuery.trim()}
                className="h-10 px-5 text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shrink-0"
              >
                {isSearchingFolio ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    Fetch Room Bill
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Search Result or Empty State */}
          {searchedRoomFolio ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Stay Info & Itemized Charges (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                {/* Stay Profile Header */}
                <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-black text-sm">
                        {searchedRoomFolio.stay.room_number}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-foreground flex items-center gap-1.5">
                          <span>Room {searchedRoomFolio.stay.room_number}</span>
                          <span className="text-xs font-normal text-muted-foreground">• {searchedRoomFolio.stay.room_type || "Room"}</span>
                        </h4>
                        <p className="text-xs font-bold text-amber-500">
                          {searchedRoomFolio.stay.guest_name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <span className="font-mono text-[11px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                        Folio #{searchedRoomFolio.folio.folio_number}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Ref: {searchedRoomFolio.stay.confirmation_number}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground pt-1">
                    <div>
                      <span className="text-[10px] block opacity-70">Check-In</span>
                      <span className="font-semibold text-foreground">
                        {new Date(searchedRoomFolio.stay.check_in_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] block opacity-70">Expected Out</span>
                      <span className="font-semibold text-foreground">
                        {new Date(searchedRoomFolio.stay.expected_check_out_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] block opacity-70">Contact Phone</span>
                      <span className="font-mono font-semibold text-foreground">
                        {searchedRoomFolio.stay.phone || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] block opacity-70">Occupancy</span>
                      <span className="font-semibold text-foreground">
                        {searchedRoomFolio.stay.adults} Adults, {searchedRoomFolio.stay.children} Kids
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itemized Charges Table */}
                <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Itemized Stay & Incidentals ({searchedRoomFolio.charges?.length || 0})
                    </h4>
                    <span className="text-xs font-mono font-bold text-foreground">
                      Subtotal: ₹{searchedRoomFolio.folio.charges_subtotal.toFixed(2)}
                    </span>
                  </div>

                  {(!searchedRoomFolio.charges || searchedRoomFolio.charges.length === 0) ? (
                    <div className="p-6 text-center text-xs text-muted-foreground rounded-xl bg-muted/20 border border-dashed border-border">
                      No incidentals or room charges posted yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                      {searchedRoomFolio.charges.map((charge: any) => (
                        <div
                          key={charge.id}
                          className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center shrink-0 border border-border/80">
                              {charge.charge_type === "ROOM" ? (
                                <Bed className="w-3.5 h-3.5 text-indigo-500" />
                              ) : charge.charge_type === "RESTAURANT" || charge.charge_type === "ROOM_SERVICE" ? (
                                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{charge.description}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {charge.charge_date} • Qty: {charge.quantity} × ₹{Number(charge.unit_price).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <span className="font-bold text-foreground">
                              ₹{Number(charge.total_amount).toFixed(2)}
                            </span>
                            {Number(charge.tax_amount) > 0 && (
                              <p className="text-[9px] text-muted-foreground">
                                Incl. ₹{Number(charge.tax_amount).toFixed(2)} Tax
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recorded Payments */}
                {searchedRoomFolio.payments && searchedRoomFolio.payments.length > 0 && (
                  <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Recorded Advances & Payments ({searchedRoomFolio.payments.length})
                    </h4>

                    <div className="space-y-1.5">
                      {searchedRoomFolio.payments.map((p: any) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-bold text-foreground">
                              {p.payment_method} Payment
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({p.payment_reference})
                            </span>
                          </div>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                            - ₹{Number(p.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Settle & Checkout Action Card (4 cols) */}
              <div className="lg:col-span-4 bg-card rounded-2xl border border-border shadow-md p-4 space-y-4 sticky top-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-500" />
                    Bill Settlement
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      searchedRoomFolio.folio.balance_due <= 0
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                    }`}
                  >
                    {searchedRoomFolio.folio.balance_due <= 0 ? "PAID IN FULL" : "BALANCE DUE"}
                  </span>
                </div>

                {/* Balance Summary Box */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-sans">Charges Subtotal:</span>
                    <span>₹{searchedRoomFolio.folio.charges_subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-sans">Taxes (GST):</span>
                    <span>₹{searchedRoomFolio.folio.taxes_total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-sans">Total Payments:</span>
                    <span className="text-emerald-500">- ₹{searchedRoomFolio.folio.net_payments.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-black text-foreground pt-2 border-t border-border">
                    <span className="font-sans">Balance Due:</span>
                    <span className="text-amber-500 font-mono text-base">
                      ₹{searchedRoomFolio.folio.balance_due.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Settlement Method & Action */}
                {searchedRoomFolio.folio.balance_due > 0 ? (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Select Settlement Mode
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-xl text-xs">
                        <button
                          type="button"
                          onClick={() => setFolioSettlePaymentMethod("CASH")}
                          className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                            folioSettlePaymentMethod === "CASH"
                              ? "bg-card text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => setFolioSettlePaymentMethod("UPI")}
                          className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                            folioSettlePaymentMethod === "UPI"
                              ? "bg-card text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          UPI
                        </button>
                        <button
                          type="button"
                          onClick={() => setFolioSettlePaymentMethod("CARD")}
                          className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                            folioSettlePaymentMethod === "CARD"
                              ? "bg-card text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Card
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Settlement Remarks (Optional)
                      </label>
                      <Input
                        placeholder="e.g. Settled at checkout counter"
                        value={folioSettleNotes}
                        onChange={(e) => setFolioSettleNotes(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <Button
                      onClick={handleSettleRoomFolio}
                      disabled={isSettlingRoomFolio}
                      className="w-full h-11 text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSettlingRoomFolio ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing Settlement...
                        </>
                      ) : (
                        <>
                          <Receipt className="w-4 h-4" />
                          Collect ₹{searchedRoomFolio.folio.balance_due.toFixed(2)} & Settle
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Folio is fully paid & settled!
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompletedBill({
                          orderId: searchedRoomFolio.folio.id,
                          orderNumber: searchedRoomFolio.folio.folio_number,
                          items: (searchedRoomFolio.charges || []).map((c: any) => ({
                            menu_item_id: c.id,
                            name: c.description,
                            price: Number(c.unit_price),
                            quantity: Number(c.quantity),
                            notes: c.charge_type,
                          })),
                          subtotal: searchedRoomFolio.folio.charges_subtotal,
                          discount: searchedRoomFolio.folio.discounts_total,
                          total: searchedRoomFolio.folio.charges_subtotal + searchedRoomFolio.folio.taxes_total,
                          paymentMethod: "CASH",
                          paidAt: new Date().toLocaleString("en-IN"),
                          destination: `Room ${searchedRoomFolio.stay.room_number}`,
                        });
                        setIsReceiptModalOpen(true);
                      }}
                      className="text-xs h-8 w-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-bold"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" />
                      Print Tax Invoice
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center bg-card rounded-2xl border border-dashed border-border p-6 space-y-3">
              <BedDouble className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  Quick Room Folio Lookup & Billing
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Type any room number (e.g. <span className="font-bold text-amber-500">303</span>) or guest name above to fetch and bill their stay charges, meals, and services.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : activeSection === "ORDERS" ? (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-sm text-foreground">Recent POS Bills & Orders</h3>
              <p className="text-xs text-muted-foreground">
                Live list of orders created for {restaurant.name}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecentOrders}
              disabled={loadingRecentOrders}
              className="text-xs h-8"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${loadingRecentOrders ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No recent POS orders found</p>
              <p className="text-xs text-muted-foreground">
                Orders created via POS terminal will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary">
                        {ord.order_number}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(ord.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                          : ord.status === "CANCELLED"
                          ? "bg-rose-500/10 text-rose-600 border border-rose-500/30"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/30 animate-pulse"
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>
                      Type:{" "}
                      <span className="font-semibold text-foreground">
                        {ord.order_type === "DINE_IN"
                          ? `Dine-In (${ord.table_number ? `Table ${ord.table_number}` : "Table"})`
                          : ord.order_type === "ROOM_SERVICE"
                          ? "Room Service"
                          : "Takeaway / Direct"}
                      </span>
                    </p>
                    {ord.notes && (
                      <p className="text-[11px] italic line-clamp-1 text-muted-foreground">
                        {ord.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/70 flex items-center justify-between">
                    <span className="text-sm font-black text-foreground">
                      ₹{Number(ord.total_amount).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {ord.status !== "COMPLETED" && ord.status !== "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await completeOrderAction(
                              propertyId,
                              ord.id,
                              "Settled from POS recent orders"
                            );
                            success("Order Settled", `Order ${ord.order_number} marked completed.`);
                            loadRecentOrders();
                          }}
                          className="text-[11px] h-7 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                        >
                          Settle Bill
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCompletedBill({
                            orderId: ord.id,
                            orderNumber: ord.order_number,
                            items: (ord.items || []).map((it) => ({
                              menu_item_id: it.id,
                              name: it.item_name,
                              price: Number(it.unit_price),
                              quantity: it.quantity,
                              notes: it.notes || "",
                            })),
                            subtotal: Number(ord.subtotal),
                            discount: Number(ord.discount_amount),
                            total: Number(ord.total_amount),
                            paymentMethod: "CASH",
                            paidAt: new Date(ord.created_at).toLocaleString("en-IN"),
                            destination:
                              ord.order_type === "DINE_IN"
                                ? `Table ${ord.table_number || ""}`
                                : ord.order_type === "ROOM_SERVICE"
                                ? "Room Service"
                                : "Counter",
                          });
                          setIsReceiptModalOpen(true);
                        }}
                        className="text-[11px] h-7 px-2"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── MAIN POS BILLING TERMINAL GRID ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ── LEFT & CENTER: ITEM CATALOG (8 cols) ── */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3.5">
            {/* Category Filter Pills */}
            {sectionCategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin bg-card p-2 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === "ALL"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({filteredItems.length})
                </button>
                {sectionCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
              <div className="py-20 text-center bg-card rounded-2xl border border-dashed border-border flex flex-col items-center justify-center p-6">
                <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h4 className="text-sm font-semibold text-foreground">No catalog items found</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {searchQuery
                    ? "Try searching with a different keyword or clear your search."
                    : "No items have been added to this section yet. Configure dishes in Menu Configuration."}
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
                      className={`group relative p-3.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between select-none cursor-pointer hover:scale-[1.01] ${
                        !item.is_available
                          ? "bg-muted/40 border-border opacity-60 cursor-not-allowed"
                          : inCartItem
                          ? "bg-primary/5 border-primary/50 shadow-xs ring-1 ring-primary/40"
                          : "bg-card border-border hover:border-primary/50 hover:shadow-md"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <h4 className="font-bold text-xs tracking-tight text-foreground line-clamp-2 leading-snug">
                            {item.name}
                          </h4>
                          {inCartItem && (
                            <span className="shrink-0 h-5 min-w-[20px] px-1.5 bg-primary text-primary-foreground text-[11px] font-black rounded-full flex items-center justify-center shadow-xs">
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

                      <div className="flex items-center justify-between pt-2.5 border-t border-border/50 mt-1">
                        <span className="text-sm font-black text-foreground">
                          ₹{item.price.toFixed(2)}
                        </span>
                        {item.is_available ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Ready
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

          {/* ── RIGHT: CURRENT BILL / CART (4 cols) ── */}
          <div className="lg:col-span-5 xl:col-span-4 bg-card rounded-2xl border border-border shadow-md p-4 flex flex-col gap-4 sticky top-4">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-xl">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">POS Billing Cart</h3>
                  <p className="text-[11px] text-muted-foreground">{restaurant.name}</p>
                </div>
              </div>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 h-7 px-2"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Destination Type & Table/Room Selector */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setOrderType("DINE_IN")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    orderType === "TAKEAWAY"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Direct Cashier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("ROOM_SERVICE");
                    setSelectedTableId("");
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    orderType === "ROOM_SERVICE"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Room Billing
                </button>
              </div>

              {/* Table Selector for DINE_IN */}
              {orderType === "DINE_IN" && (
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Select Dining Table <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full text-xs h-9 rounded-xl border border-input bg-background px-3 py-1 font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">-- Choose Dining Table --</option>
                    {availableTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.table_number}{" "}
                        {t.display_name ? `(${t.display_name})` : ""} - {t.status} (Cap:{" "}
                        {t.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Room Selector for ROOM_SERVICE */}
              {orderType === "ROOM_SERVICE" && (
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Guest Room Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="E.g. 101, 204, 305..."
                    value={roomNumberInput}
                    onChange={(e) => setRoomNumberInput(e.target.value)}
                    className="text-xs h-9 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 max-h-[280px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-semibold">Cart is currently empty</p>
                  <p className="text-[11px] opacity-70">Tap items on the left to add to bill</p>
                </div>
              ) : (
                cart.map((ci) => (
                  <div
                    key={ci.menu_item_id}
                    className="p-3 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-xs font-bold text-foreground line-clamp-1">
                          {ci.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          ₹{ci.price.toFixed(2)} each
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(ci.menu_item_id, -1)}
                          className="h-6 w-6 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-black w-5 text-center">
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(ci.menu_item_id, 1)}
                          className="h-6 w-6 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(ci.menu_item_id)}
                          className="h-6 w-6 rounded-lg text-muted-foreground hover:text-rose-600 flex items-center justify-center ml-1 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Line Total & Notes Trigger */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveItemNotesId(
                            activeItemNotesId === ci.menu_item_id ? null : ci.menu_item_id
                          )
                        }
                        className="text-primary hover:underline text-[11px] font-semibold"
                      >
                        {ci.notes ? `Note: "${ci.notes}"` : "+ Add Note"}
                      </button>
                      <span className="font-black text-foreground">
                        ₹{(ci.price * ci.quantity).toFixed(2)}
                      </span>
                    </div>

                    {/* Item Notes Input */}
                    {activeItemNotesId === ci.menu_item_id && (
                      <Input
                        type="text"
                        placeholder="E.g. Less sugar, extra towels, spicy..."
                        value={ci.notes}
                        onChange={(e) => updateItemNotes(ci.menu_item_id, e.target.value)}
                        className="text-[11px] h-7 mt-1 bg-background rounded-lg"
                        autoFocus
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Order Notes & Discount */}
            {cart.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/80 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    Special Bill Instructions
                  </label>
                  <Input
                    type="text"
                    placeholder="Guest notes / billing instructions..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="text-xs h-8 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    Discount Amount (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="1"
                    placeholder="0.00"
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    className="text-xs h-8 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="pt-2 border-t border-border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-foreground">₹{subtotal.toFixed(2)}</span>
              </div>

              {sanitizedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Discount</span>
                  <span>-₹{sanitizedDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Taxes & GST (Included)</span>
                <span>₹0.00</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border text-sm font-black text-foreground">
                <span>Grand Total</span>
                <span className="text-lg text-[var(--brand-gold)] font-black">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handlePlaceOrder(false)}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full h-10 font-bold text-xs"
              >
                Place Order
              </Button>

              <Button
                onClick={() => {
                  if (validateOrder()) {
                    setTenderedAmount(totalAmount);
                    setIsSettleModalOpen(true);
                  }
                }}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full h-10 font-bold text-xs bg-[var(--brand-gold)] text-slate-950 hover:bg-[var(--brand-gold)]/90"
              >
                <Banknote className="h-4 w-4 mr-1.5" />
                Settle & Bill
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── BILL SETTLEMENT MODAL ── */}
      <Modal
        open={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        title="POS Cashier Bill Settlement"
        description={`Settle total bill of ₹${totalAmount.toFixed(2)} for ${restaurant.name}`}
      >
        <div className="space-y-4 text-xs">
          {/* Payment Method Selector */}
          <div>
            <label className="block font-bold text-foreground mb-2">Select Payment Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === "CASH"
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Banknote className="h-5 w-5" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("UPI")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === "UPI"
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <QrCode className="h-5 w-5" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("CARD")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === "CARD"
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Card Terminal</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("ROOM_CHARGE")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === "ROOM_CHARGE"
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Bed className="h-5 w-5" />
                <span>Room Folio</span>
              </button>
            </div>
          </div>

          {/* Cash Calculation Engine */}
          {paymentMethod === "CASH" && (
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground">Tendered Cash Amount (₹)</label>
                <span className="font-mono text-xs text-muted-foreground">
                  Exact: ₹{totalAmount.toFixed(2)}
                </span>
              </div>

              <Input
                type="number"
                min={totalAmount}
                step="1"
                value={tenderedAmount || ""}
                onChange={(e) => setTenderedAmount(Number(e.target.value) || 0)}
                className="text-sm font-bold h-9"
              />

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {cashSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setTenderedAmount(sug)}
                    className="px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-bold hover:bg-muted transition"
                  >
                    ₹{sug}
                  </button>
                ))}
              </div>

              {/* Change to return */}
              <div className="flex items-center justify-between pt-2 border-t border-border/70 text-xs font-bold">
                <span className="text-muted-foreground">Change to return:</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  ₹{changeToReturn.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* UPI Scan Simulator */}
          {paymentMethod === "UPI" && (
            <div className="p-4 rounded-xl border border-border bg-muted/30 text-center space-y-2">
              <QrCode className="h-16 w-16 mx-auto text-foreground" />
              <p className="font-bold text-xs">Scan UPI QR Code to Pay ₹{totalAmount.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground">
                Accepted: Google Pay, PhonePe, Paytm, BHIM & All Indian UPI Apps
              </p>
            </div>
          )}

          {/* Room Folio Charge Notice */}
          {paymentMethod === "ROOM_CHARGE" && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs space-y-1">
              <p className="font-bold">Post charge to guest room folio</p>
              <p className="text-[11px] opacity-90">
                This bill will be added to the guest&apos;s active stay folio and settled during final
                checkout at the front desk.
              </p>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSettleModalOpen(false)}
              disabled={isSubmitting}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handlePlaceOrder(true)}
              disabled={isSubmitting}
              className="text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirm Payment & Print Receipt
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── PRINTABLE TAX INVOICE RECEIPT MODAL ── */}
      <Modal
        open={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Payment Receipt & Tax Invoice"
        description={`Order #${completedBill?.orderNumber || ""}`}
      >
        {completedBill && (
          <div className="space-y-4 text-xs font-mono">
            <div
              id="stayhub-pos-receipt"
              className="p-4 bg-white text-slate-950 rounded-xl border border-slate-300 shadow-xs space-y-3"
            >
              {/* Receipt Header */}
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
                <h2 className="text-base font-black tracking-wider uppercase">
                  StayHub Hotel & Resorts
                </h2>
                <p className="text-[11px] text-slate-600 font-sans">{restaurant.name}</p>
                <p className="text-[10px] text-slate-500">GSTIN: 29AABCS1429B1Z8</p>
                <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 font-sans">
                  <span>Bill: {completedBill.orderNumber}</span>
                  <span>{completedBill.paidAt}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-700 font-sans text-left">
                  Destination: {completedBill.destination}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between text-[11px] font-bold text-slate-800 pb-1">
                  <span>Item</span>
                  <span>Qty × Price</span>
                  <span>Total</span>
                </div>
                {completedBill.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                    <span className="flex-1 truncate pr-2">{it.name}</span>
                    <span className="text-slate-500 pr-2">
                      {it.quantity} × ₹{it.price.toFixed(0)}
                    </span>
                    <span className="font-bold">₹{(it.quantity * it.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{completedBill.subtotal.toFixed(2)}</span>
                </div>
                {completedBill.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₹{completedBill.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 text-slate-950">
                  <span>NET TOTAL PAID:</span>
                  <span>₹{completedBill.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-sans pt-1">
                  <span>Payment Mode:</span>
                  <span className="font-bold uppercase">{completedBill.paymentMethod}</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-[10px] text-slate-500 space-y-0.5 pt-1">
                <p>Thank you for your visit!</p>
                <p>Have a wonderful stay with StayHub.</p>
              </div>
            </div>

            {/* Print & Close Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => window.print()}
                className="text-xs font-bold"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Tax Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
