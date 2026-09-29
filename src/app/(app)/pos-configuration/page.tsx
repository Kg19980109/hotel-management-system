"use client";

// ============================================================
// STAYHUB POS CONFIGURATION & CATALOG MANAGEMENT (Phase 12)
// Ultra-Modern, High-Performance POS Billing Catalog
// Strictly structured across: Food, Rooms & Stay, and Services
// ============================================================

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  BedDouble,
  Sparkles,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  ChefHat,
  Tag,
  DollarSign,
  ShieldCheck,
  Check,
  X,
  LayoutGrid,
  List,
  Store,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  Restaurant,
  MenuCategory,
  MenuItem,
  PosBillingSection,
  getPosItemSection,
} from "@/lib/restaurant/types";
import {
  getRestaurants,
  getMenuCategories,
  getMenuItems,
} from "@/lib/restaurant/queries";
import {
  createMenuItemAction,
  updateMenuItemAction,
  toggleMenuItemAvailabilityAction,
  deactivateMenuItemAction,
  createMenuCategoryAction,
} from "@/lib/restaurant/actions";
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

export default function PosConfigurationPage() {
  return (
    <RoutePermissionGuard permission="pos.config" moduleName="POS Catalog Configuration">
      <PosConfigurationContent />
    </RoutePermissionGuard>
  );
}

function PosConfigurationContent() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Active Section Tab (Strictly the 3 requested POS billing sections)
  const [activeSection, setActiveSection] = useState<PosBillingSection>("FOOD");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "86ED">("ALL");

  // Modal States
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<MenuItem | null>(null);

  // Add/Edit Item Form State
  const [itemName, setItemName] = useState("");
  const [itemShortName, setItemShortName] = useState("");
  const [itemSku, setItemSku] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Category Form State
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Load Data with no recursive dependency loops
  const loadData = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const rests = await getRestaurants(propertyId, false);
      if (rests.length > 0) {
        const activeRest = rests[0];
        setRestaurant(activeRest);

        const [catsData, itemsData] = await Promise.all([
          getMenuCategories(activeRest.id, true),
          getMenuItems(activeRest.id, true),
        ]);

        setCategories(catsData);
        setMenuItems(itemsData);
      } else {
        setRestaurant(null);
      }
    } catch (err: unknown) {
      console.error("Failed to load POS configuration data:", err);
      setError(err instanceof Error ? err.message : "Failed to load POS catalog");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (!authLoading && propertyId) {
      void loadData();
    }
  }, [authLoading, propertyId, loadData]);

  // Section-aware categories
  const sectionCategories = useMemo(() => {
    if (activeSection === "ROOMS") {
      return categories.filter(
        (c) =>
          c.name.toLowerCase().includes("room") ||
          c.name.toLowerCase().includes("stay") ||
          c.name.toLowerCase().includes("tariff")
      );
    }
    if (activeSection === "LAUNDRY") {
      return categories.filter(
        (c) =>
          c.name.toLowerCase().includes("laundry") ||
          c.name.toLowerCase().includes("dry clean") ||
          c.name.toLowerCase().includes("washing") ||
          c.name.toLowerCase().includes("pressing") ||
          c.name.toLowerCase().includes("iron")
      );
    }
    if (activeSection === "SPA") {
      return categories.filter(
        (c) =>
          c.name.toLowerCase().includes("spa") ||
          c.name.toLowerCase().includes("wellness") ||
          c.name.toLowerCase().includes("massage") ||
          c.name.toLowerCase().includes("beauty") ||
          c.name.toLowerCase().includes("salon") ||
          c.name.toLowerCase().includes("facial")
      );
    }
    if (activeSection === "SERVICES") {
      return categories.filter(
        (c) =>
          (c.name.toLowerCase().includes("service") ||
          c.name.toLowerCase().includes("amenit") ||
          c.name.toLowerCase().includes("transfer") ||
          c.name.toLowerCase().includes("banquet") ||
          c.name.toLowerCase().includes("event")) &&
          !c.name.toLowerCase().includes("laundry") &&
          !c.name.toLowerCase().includes("spa") &&
          !c.name.toLowerCase().includes("dry clean") &&
          !c.name.toLowerCase().includes("massage")
      );
    }
    // FOOD section: all dining categories
    return categories.filter(
      (c) =>
        !c.name.toLowerCase().includes("room tariff") &&
        !c.name.toLowerCase().includes("stay charge") &&
        !c.name.toLowerCase().includes("hotel service") &&
        !c.name.toLowerCase().includes("spa") &&
        !c.name.toLowerCase().includes("laundry") &&
        !c.name.toLowerCase().includes("wellness") &&
        !c.name.toLowerCase().includes("dry clean") &&
        !c.name.toLowerCase().includes("massage")
    );
  }, [categories, activeSection]);

  // Filter items strictly for active section
  const sectionItems = useMemo(() => {
    return menuItems.filter((item) => getPosItemSection(item) === activeSection);
  }, [menuItems, activeSection]);

  // Counts for all 5 sections
  const counts = useMemo(() => {
    let food = 0;
    let rooms = 0;
    let laundry = 0;
    let spa = 0;
    let services = 0;
    for (const item of menuItems) {
      const sec = getPosItemSection(item);
      if (sec === "FOOD") food++;
      else if (sec === "ROOMS") rooms++;
      else if (sec === "LAUNDRY") laundry++;
      else if (sec === "SPA") spa++;
      else if (sec === "SERVICES") services++;
    }
    return { food, rooms, laundry, spa, services, total: menuItems.length };
  }, [menuItems]);

  // Filtered Items based on search, category filter, and status filter
  const filteredItems = useMemo(() => {
    return sectionItems.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSku = item.sku?.toLowerCase().includes(q);
        const matchCat = item.category_name?.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat) return false;
      }
      // Category
      if (selectedCategoryFilter !== "ALL" && item.category_id !== selectedCategoryFilter) {
        return false;
      }
      // Status
      if (statusFilter === "AVAILABLE" && !item.is_available) return false;
      if (statusFilter === "86ED" && item.is_available) return false;
      return true;
    });
  }, [sectionItems, searchQuery, selectedCategoryFilter, statusFilter]);

  // Toggle Item Availability (In-stock vs 86ed)
  const handleToggleAvailability = async (item: MenuItem) => {
    if (!propertyId) return;
    const newStatus = !item.is_available;
    // Optimistic UI update
    setMenuItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i))
    );

    try {
      const res = await toggleMenuItemAvailabilityAction(propertyId, item.id, newStatus);
      if (!res.success) {
        toastError("Error", res.error || "Failed to update item availability");
        void loadData();
      } else {
        success(
          newStatus ? "Item Available" : "Item Marked Sold Out (86ed)",
          `"${item.name}" availability updated for POS & QR portals.`
        );
      }
    } catch {
      toastError("Error", "Failed to update item status");
      void loadData();
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: MenuItem) => {
    setSelectedItemForEdit(item);
    setItemName(item.name);
    setItemShortName(item.short_name || "");
    setItemSku(item.sku || "");
    setItemPrice(item.price.toString());
    setItemCategoryId(item.category_id);
    setItemDescription(item.description || "");
    setItemIsAvailable(item.is_available);
    setIsEditItemModalOpen(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setItemName("");
    setItemShortName("");
    setItemSku("");
    setItemPrice("");
    setItemCategoryId(sectionCategories[0]?.id || categories[0]?.id || "");
    setItemDescription("");
    setItemIsAvailable(true);
    setIsAddItemModalOpen(true);
  };

  // Handle Save New Item
  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !restaurant) return;

    if (!itemName.trim()) {
      toastError("Validation Error", "Item name is required.");
      return;
    }
    const priceNum = parseFloat(itemPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toastError("Validation Error", "Please provide a valid price (₹).");
      return;
    }
    if (!itemCategoryId) {
      toastError("Validation Error", "Please select a category.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createMenuItemAction(propertyId, {
        restaurant_id: restaurant.id,
        category_id: itemCategoryId,
        name: itemName.trim(),
        short_name: itemShortName.trim() || undefined,
        sku: itemSku.trim() || undefined,
        price: priceNum,
        currency: "INR",
        description: itemDescription.trim() || undefined,
        is_available: itemIsAvailable,
      });

      if (!res.success) {
        toastError("Error", res.error || "Failed to create item");
        return;
      }

      success("Item Created", `"${itemName}" is now live in POS Billing & Menus.`);
      setIsAddItemModalOpen(false);
      void loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Edit Item
  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !selectedItemForEdit) return;

    if (!itemName.trim()) {
      toastError("Validation Error", "Item name is required.");
      return;
    }
    const priceNum = parseFloat(itemPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toastError("Validation Error", "Please provide a valid price (₹).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateMenuItemAction(propertyId, selectedItemForEdit.id, {
        name: itemName.trim(),
        short_name: itemShortName.trim() || undefined,
        sku: itemSku.trim() || undefined,
        price: priceNum,
        category_id: itemCategoryId || selectedItemForEdit.category_id,
        description: itemDescription.trim() || undefined,
        is_available: itemIsAvailable,
      });

      if (!res.success) {
        toastError("Error", res.error || "Failed to update item");
        return;
      }

      success("Item Updated", `"${itemName}" changes saved.`);
      setIsEditItemModalOpen(false);
      void loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete / Deactivate Item
  const handleDeleteItem = async (item: MenuItem) => {
    if (!propertyId) return;
    if (!confirm(`Are you sure you want to remove "${item.name}" from POS Billing?`)) return;

    try {
      const res = await deactivateMenuItemAction(propertyId, item.id);
      if (!res.success) {
        toastError("Error", res.error || "Failed to remove item");
        return;
      }
      success("Item Removed", `"${item.name}" removed from active POS catalog.`);
      void loadData();
    } catch {
      toastError("Error", "Failed to delete item");
    }
  };

  // Handle Create Category
  const handleSaveNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !restaurant) return;

    if (!newCatName.trim()) {
      toastError("Validation Error", "Category name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createMenuCategoryAction(propertyId, {
        restaurant_id: restaurant.id,
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });

      if (!res.success) {
        toastError("Error", res.error || "Failed to create category");
        return;
      }

      success("Category Created", `"${newCatName}" added to POS catalog.`);
      setNewCatName("");
      setNewCatDesc("");
      setIsAddCategoryModalOpen(false);
      void loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (loading && !restaurant)) {
    return (
      <div className="p-6">
        <LoadingState message="Connecting to POS Master Configuration..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState description={error} onRetry={() => { void loadData(); }} />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="py-16 text-center bg-card rounded-2xl border border-dashed border-border p-8">
          <Store className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            No Active Restaurant Configured
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Please configure your property dining outlet in Menu Configuration to start adding POS billing items.
          </p>
          <Link href="/menu-configuration" className="inline-block mt-4">
            <Button size="sm" className="text-xs font-semibold">
              Open Menu Configuration
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── TOP HERO BANNER & STATS ── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0B1528] via-[#091122] to-[#040812] border border-white/10 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-36 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--brand-gold)] to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0 font-bold">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-heading">
                  POS Configuration & Item Catalog
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure all billable catalog items for POS Billing & QR In-Room Guest Portals
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData()}
              disabled={loading}
              className="h-9 px-3 text-xs font-bold border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-[var(--brand-gold)]" : ""}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddCategoryModalOpen(true)}
              className="h-9 px-3 text-xs font-bold border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
            >
              <Layers className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
              + Category
            </Button>

            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="h-9 px-4 text-xs font-black bg-gradient-to-r from-[var(--brand-gold)] to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              + Add POS Item
            </Button>

            <Link href="/pos">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-bold border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                Go to POS Billing
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Catalog Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 relative z-10">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
              🍽️
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Food & Dining</p>
              <p className="text-base font-extrabold text-white font-mono">{counts.food} Items</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
              🛏️
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Rooms & Stay</p>
              <p className="text-base font-extrabold text-white font-mono">{counts.rooms} Tariffs</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
              ✨
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Services & Spa</p>
              <p className="text-base font-extrabold text-white font-mono">{counts.services} Services</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] flex items-center justify-center font-bold text-xs">
              ₹
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Billing Currency</p>
              <p className="text-base font-extrabold text-[var(--brand-gold)] font-mono">INR (₹)</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5 MASTER POS BILLING SECTION TABS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* TAB 1: FOOD & DINING */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("FOOD");
            setSelectedCategoryFilter("ALL");
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeSection === "FOOD"
              ? "bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-amber-500/50 shadow-lg shadow-amber-500/10"
              : "bg-card border-border hover:border-border/80 text-muted-foreground"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                activeSection === "FOOD"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              🍽️
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeSection === "FOOD"
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {counts.food}
            </span>
          </div>
          <div>
            <h3 className={`text-xs font-bold ${activeSection === "FOOD" ? "text-foreground font-extrabold" : "text-foreground"}`}>
              Food & Dining
            </h3>
            <p className="text-[10px] text-muted-foreground line-clamp-1">Kitchen dishes & beverages</p>
          </div>
        </button>

        {/* TAB 2: ROOMS & STAY CHARGES */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("ROOMS");
            setSelectedCategoryFilter("ALL");
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeSection === "ROOMS"
              ? "bg-gradient-to-r from-indigo-500/15 via-indigo-500/10 to-transparent border-indigo-500/50 shadow-lg shadow-indigo-500/10"
              : "bg-card border-border hover:border-border/80 text-muted-foreground"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                activeSection === "ROOMS"
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              🛏️
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeSection === "ROOMS"
                  ? "bg-indigo-500/20 text-indigo-500 border border-indigo-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {counts.rooms}
            </span>
          </div>
          <div>
            <h3 className={`text-xs font-bold ${activeSection === "ROOMS" ? "text-foreground font-extrabold" : "text-foreground"}`}>
              Rooms & Stay
            </h3>
            <p className="text-[10px] text-muted-foreground line-clamp-1">Tariffs & extra beds</p>
          </div>
        </button>

        {/* TAB 3: LAUNDRY & DRY CLEANING */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("LAUNDRY");
            setSelectedCategoryFilter("ALL");
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeSection === "LAUNDRY"
              ? "bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent border-sky-500/50 shadow-lg shadow-sky-500/10"
              : "bg-card border-border hover:border-border/80 text-muted-foreground"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                activeSection === "LAUNDRY"
                  ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              🧺
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeSection === "LAUNDRY"
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {counts.laundry}
            </span>
          </div>
          <div>
            <h3 className={`text-xs font-bold ${activeSection === "LAUNDRY" ? "text-foreground font-extrabold" : "text-foreground"}`}>
              Laundry & Pressing
            </h3>
            <p className="text-[10px] text-muted-foreground line-clamp-1">Wash, dry clean & iron rates</p>
          </div>
        </button>

        {/* TAB 4: SPA & WELLNESS */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("SPA");
            setSelectedCategoryFilter("ALL");
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeSection === "SPA"
              ? "bg-gradient-to-r from-pink-500/15 via-pink-500/10 to-transparent border-pink-500/50 shadow-lg shadow-pink-500/10"
              : "bg-card border-border hover:border-border/80 text-muted-foreground"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                activeSection === "SPA"
                  ? "bg-pink-500 text-white font-bold shadow-md shadow-pink-500/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              💆
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeSection === "SPA"
                  ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {counts.spa}
            </span>
          </div>
          <div>
            <h3 className={`text-xs font-bold ${activeSection === "SPA" ? "text-foreground font-extrabold" : "text-foreground"}`}>
              Spa & Wellness
            </h3>
            <p className="text-[10px] text-muted-foreground line-clamp-1">Massages, facial & therapies</p>
          </div>
        </button>

        {/* TAB 5: HOTEL SERVICES */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("SERVICES");
            setSelectedCategoryFilter("ALL");
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeSection === "SERVICES"
              ? "bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border-emerald-500/50 shadow-lg shadow-emerald-500/10"
              : "bg-card border-border hover:border-border/80 text-muted-foreground"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                activeSection === "SERVICES"
                  ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              ✨
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeSection === "SERVICES"
                  ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {counts.services}
            </span>
          </div>
          <div>
            <h3 className={`text-xs font-bold ${activeSection === "SERVICES" ? "text-foreground font-extrabold" : "text-foreground"}`}>
              Hotel Services
            </h3>
            <p className="text-[10px] text-muted-foreground line-clamp-1">Transfers, banquets & extras</p>
          </div>
        </button>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${
                activeSection === "FOOD"
                  ? "dishes"
                  : activeSection === "ROOMS"
                  ? "tariffs"
                  : activeSection === "LAUNDRY"
                  ? "laundry items"
                  : activeSection === "SPA"
                  ? "spa treatments"
                  : "services"
              }...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-background"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({sectionItems.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("AVAILABLE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "AVAILABLE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              In-Stock ({sectionItems.filter((i) => i.is_available).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("86ED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "86ED"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Sold Out / 86ed ({sectionItems.filter((i) => !i.is_available).length})
            </button>
          </div>
        </div>

        {/* Category Pill Filters */}
        {sectionCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-border/50 pt-2.5">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0">Category:</span>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategoryFilter === "ALL"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Categories
            </button>
            {sectionCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(c.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategoryFilter === c.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── CATALOG ITEMS GRID ── */}
      {filteredItems.length === 0 ? (
        <div className="py-20 text-center bg-card rounded-2xl border border-dashed border-border p-8 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <Tag className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              No Items Found in this Section
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? `No items match "${searchQuery}".`
                : `You currently have no active catalog items in the ${activeSection} section.`}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="text-xs font-bold bg-[var(--brand-gold)] text-slate-950 mt-2"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between space-y-3 ${
                item.is_available
                  ? "bg-card border-border hover:border-border/80"
                  : "bg-muted/30 border-dashed border-border opacity-70"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      {item.category_name || "General"}
                    </span>
                    <h4 className="text-sm font-black text-foreground pt-1 leading-snug">
                      {item.name}
                    </h4>
                  </div>

                  {/* Availability Badge */}
                  <button
                    type="button"
                    onClick={() => void handleToggleAvailability(item)}
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                      item.is_available
                        ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/25"
                        : "bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/25"
                    }`}
                    title="Click to toggle availability in POS & QR menu"
                  >
                    {item.is_available ? (
                      <>
                        <Check className="h-3 w-3" /> Available
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3" /> 86ed / Sold Out
                      </>
                    )}
                  </button>
                </div>

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {item.sku && (
                  <p className="text-[10.5px] font-mono text-muted-foreground">
                    SKU: <span className="font-bold text-foreground">{item.sku}</span>
                  </p>
                )}
              </div>

              {/* Price & Action Row */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black font-mono text-[var(--brand-gold)]">
                    ₹{item.price.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">INR</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(item)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    title="Edit Item"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDeleteItem(item)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                    title="Remove Item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ADD ITEM MODAL ── */}
      <Modal
        open={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        title={`Add Item to ${
          activeSection === "FOOD"
            ? "Food & Dining"
            : activeSection === "ROOMS"
            ? "Rooms & Stay"
            : activeSection === "LAUNDRY"
            ? "Laundry & Pressing"
            : activeSection === "SPA"
            ? "Spa & Wellness"
            : "Hotel Services"
        }`}
      >
        <form onSubmit={handleSaveNewItem} className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Category *</label>
              <button
                type="button"
                onClick={() => {
                  setIsAddItemModalOpen(false);
                  setIsAddCategoryModalOpen(true);
                  if (activeSection === "LAUNDRY") setNewCatName("Laundry & Dry Cleaning");
                  else if (activeSection === "SPA") setNewCatName("Spa & Wellness Treatments");
                  else if (activeSection === "ROOMS") setNewCatName("Room Tariffs");
                }}
                className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
              >
                + Create New Category
              </button>
            </div>
            <select
              value={itemCategoryId}
              onChange={(e) => setItemCategoryId(e.target.value)}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 font-medium text-foreground"
              required
            >
              <option value="" disabled>
                -- Select Category --
              </option>
              {(sectionCategories.length > 0 ? sectionCategories : categories).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Item Name *</label>
            <Input
              placeholder="e.g. Butter Chicken / Deluxe Suite / Swedish Massage"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Price in INR (₹) *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="₹ 0.00"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className="text-xs h-9 font-mono"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">SKU / Item Code</label>
              <Input
                placeholder="e.g. FOOD-01"
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Short Name (POS Quick Key)</label>
            <Input
              placeholder="e.g. Butter Chk"
              value={itemShortName}
              onChange={(e) => setItemShortName(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Description</label>
            <textarea
              rows={2}
              placeholder="Details or ingredients..."
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-md border border-input bg-background font-medium text-foreground resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="addItemAvail"
              checked={itemIsAvailable}
              onChange={(e) => setItemIsAvailable(e.target.checked)}
              className="rounded border-input h-4 w-4 text-primary"
            />
            <label htmlFor="addItemAvail" className="text-xs font-medium text-foreground cursor-pointer">
              Available immediately in POS Terminal & QR Menu
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddItemModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[var(--brand-gold)] text-slate-950 font-bold"
            >
              {isSubmitting ? "Creating..." : "Create Item"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT ITEM MODAL ── */}
      <Modal
        open={isEditItemModalOpen}
        onClose={() => setIsEditItemModalOpen(false)}
        title="Edit Catalog Item"
      >
        <form onSubmit={handleSaveEditItem} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Category *</label>
            <select
              value={itemCategoryId}
              onChange={(e) => setItemCategoryId(e.target.value)}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 font-medium text-foreground"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Item Name *</label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Price in INR (₹) *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className="text-xs h-9 font-mono"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">SKU / Code</label>
              <Input
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Description</label>
            <textarea
              rows={2}
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-md border border-input bg-background font-medium text-foreground resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="editItemAvail"
              checked={itemIsAvailable}
              onChange={(e) => setItemIsAvailable(e.target.checked)}
              className="rounded border-input h-4 w-4 text-primary"
            />
            <label htmlFor="editItemAvail" className="text-xs font-medium text-foreground cursor-pointer">
              Available in POS Terminal & QR Menu
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditItemModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[var(--brand-gold)] text-slate-950 font-bold"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── ADD CATEGORY MODAL ── */}
      <Modal
        open={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        title="Create New POS Category"
      >
        <form onSubmit={handleSaveNewCategory} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Category Name *</label>
            <Input
              placeholder="e.g. Starters / Room Tariffs / Spa Treatments"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Description</label>
            <textarea
              rows={2}
              placeholder="Optional category details..."
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="w-full text-xs p-2.5 rounded-md border border-input bg-background font-medium text-foreground resize-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[var(--brand-gold)] text-slate-950 font-bold"
            >
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
