"use client";

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
  Store,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Layers,
  AlertCircle,
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

export default function PosConfigurationPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Active Section Tab (Strictly the 3 requested POS billing sections)
  const [activeSection, setActiveSection] = useState<PosBillingSection>("FOOD");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "86ED" | "INACTIVE">("ALL");

  // Modal States
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<MenuItem | null>(null);

  // Add Item Form State
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

  const loadData = useCallback(async () => {
    if (!propertyId) return;
    try {
      setLoading(true);
      setError(null);

      const rests = await getRestaurants(propertyId, true);
      setRestaurants(rests);

      if (rests.length > 0) {
        const activeRest = selectedRestaurant
          ? rests.find((r) => r.id === selectedRestaurant.id) || rests[0]
          : rests[0];
        setSelectedRestaurant(activeRest);

        const [catsData, itemsData] = await Promise.all([
          getMenuCategories(activeRest.id, true),
          getMenuItems(activeRest.id, true),
        ]);

        setCategories(catsData);
        setMenuItems(itemsData);
      } else {
        setSelectedRestaurant(null);
      }
    } catch (err: unknown) {
      console.error("Failed to load POS configuration data:", err);
      setError(err instanceof Error ? err.message : "Failed to load POS catalog");
    } finally {
      setLoading(false);
    }
  }, [propertyId, selectedRestaurant]);

  useEffect(() => {
    if (!authLoading && propertyId) {
      void Promise.resolve().then(() => loadData());
    }
  }, [authLoading, propertyId, loadData]);

  const handleSelectOutlet = async (restaurantId: string) => {
    const target = restaurants.find((r) => r.id === restaurantId);
    if (!target) return;
    setSelectedRestaurant(target);
    try {
      setLoading(true);
      const [catsData, itemsData] = await Promise.all([
        getMenuCategories(target.id, true),
        getMenuItems(target.id, true),
      ]);
      setCategories(catsData);
      setMenuItems(itemsData);
    } catch (err: unknown) {
      console.error("Failed to switch outlet:", err);
    } finally {
      setLoading(false);
    }
  };

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
    if (activeSection === "SERVICES") {
      return categories.filter(
        (c) =>
          c.name.toLowerCase().includes("service") ||
          c.name.toLowerCase().includes("amenit") ||
          c.name.toLowerCase().includes("spa") ||
          c.name.toLowerCase().includes("laundry") ||
          c.name.toLowerCase().includes("transfer") ||
          c.name.toLowerCase().includes("banquet") ||
          c.name.toLowerCase().includes("event")
      );
    }
    // FOOD section: all food categories (excluding Rooms and Services)
    return categories.filter(
      (c) =>
        !c.name.toLowerCase().includes("room tariffs") &&
        !c.name.toLowerCase().includes("hotel services")
    );
  }, [categories, activeSection]);

  // Filter items strictly for the active POS section
  const sectionItems = useMemo(() => {
    return menuItems.filter((item) => getPosItemSection(item) === activeSection);
  }, [menuItems, activeSection]);

  // Apply search and dropdown filters
  const filteredItems = useMemo(() => {
    let list = sectionItems;

    if (selectedCategoryFilter !== "ALL") {
      list = list.filter((item) => item.category_id === selectedCategoryFilter);
    }

    if (statusFilter === "AVAILABLE") {
      list = list.filter((item) => item.is_active && item.is_available);
    } else if (statusFilter === "86ED") {
      list = list.filter((item) => item.is_active && !item.is_available);
    } else if (statusFilter === "INACTIVE") {
      list = list.filter((item) => !item.is_active);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSku = item.sku?.toLowerCase().includes(q) || false;
        const matchesShort = item.short_name?.toLowerCase().includes(q) || false;
        const matchesDesc = item.description?.toLowerCase().includes(q) || false;
        const matchesCat = item.category_name?.toLowerCase().includes(q) || false;
        return matchesName || matchesSku || matchesShort || matchesDesc || matchesCat;
      });
    }

    return list;
  }, [sectionItems, selectedCategoryFilter, statusFilter, searchQuery]);

  // Ensure default category exists when adding items
  const ensureCategoryForSection = async (): Promise<string> => {
    if (!selectedRestaurant || !propertyId) return "";

    let targetCatName = "Main Courses";
    if (activeSection === "ROOMS") {
      targetCatName = "Room Tariffs & Stay Charges";
    } else if (activeSection === "SERVICES") {
      targetCatName = "Hotel Services & Amenities";
    }

    const existing = categories.find(
      (c) => c.name.toLowerCase() === targetCatName.toLowerCase()
    );
    if (existing) return existing.id;

    // Create standard category for this section
    const res = await createMenuCategoryAction(propertyId, {
      restaurant_id: selectedRestaurant.id,
      name: targetCatName,
      description: `${targetCatName} for POS billing`,
      display_order: activeSection === "ROOMS" ? 90 : activeSection === "SERVICES" ? 95 : 1,
    });

    if (res.success && res.data?.id) {
      const freshCats = await getMenuCategories(selectedRestaurant.id, true);
      setCategories(freshCats);
      return res.data.id;
    }

    return categories[0]?.id || "";
  };

  const openAddItemModal = async () => {
    if (!selectedRestaurant) {
      toastError("Select Outlet", "Please select a dining/POS outlet first.");
      return;
    }

    // Default or select appropriate category
    let defaultCatId = sectionCategories[0]?.id;
    if (!defaultCatId) {
      defaultCatId = await ensureCategoryForSection();
    }

    setItemCategoryId(defaultCatId || "");
    setItemName("");
    setItemShortName("");
    setItemSku("");
    setItemPrice("");
    setItemDescription("");
    setItemIsAvailable(true);
    setIsAddItemModalOpen(true);
  };

  const openEditItemModal = (item: MenuItem) => {
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

  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !selectedRestaurant) return;

    if (!itemName.trim()) {
      toastError("Validation Error", "Item name is required.");
      return;
    }

    const parsedPrice = parseFloat(itemPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toastError("Validation Error", "Please enter a valid price in INR (₹).");
      return;
    }

    let finalCategoryId = itemCategoryId;
    if (!finalCategoryId) {
      finalCategoryId = await ensureCategoryForSection();
    }

    if (!finalCategoryId) {
      toastError("Category Error", "Please select or create a category first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createMenuItemAction(propertyId, {
        restaurant_id: selectedRestaurant.id,
        category_id: finalCategoryId,
        name: itemName.trim(),
        short_name: itemShortName.trim() || undefined,
        sku: itemSku.trim() || undefined,
        description: itemDescription.trim() || undefined,
        price: parsedPrice,
        currency: "INR",
        is_available: itemIsAvailable,
      });

      if (!res.success) {
        toastError("Error", res.error || "Failed to create item.");
        return;
      }

      success("Item Added", `'${itemName}' added to POS ${activeSection === "FOOD" ? "Food Menu" : activeSection === "ROOMS" ? "Room Charges" : "Hotel Services"}.`);
      setIsAddItemModalOpen(false);
      void loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to add item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !selectedItemForEdit) return;

    if (!itemName.trim()) {
      toastError("Validation Error", "Item name is required.");
      return;
    }

    const parsedPrice = parseFloat(itemPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toastError("Validation Error", "Please enter a valid price in INR (₹).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateMenuItemAction(propertyId, selectedItemForEdit.id, {
        name: itemName.trim(),
        short_name: itemShortName.trim() || undefined,
        sku: itemSku.trim() || undefined,
        description: itemDescription.trim() || undefined,
        price: parsedPrice,
        category_id: itemCategoryId || selectedItemForEdit.category_id,
        is_available: itemIsAvailable,
      });

      if (!res.success) {
        toastError("Error", res.error || "Failed to update item.");
        return;
      }

      success("Item Updated", `'${itemName}' updated successfully in POS.`);
      setIsEditItemModalOpen(false);
      setSelectedItemForEdit(null);
      void loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to update item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    if (!propertyId) return;
    try {
      const newStatus = !item.is_available;
      const res = await toggleMenuItemAvailabilityAction(propertyId, item.id, newStatus);
      if (!res.success) {
        toastError("Error", res.error || "Failed to toggle stock status.");
        return;
      }
      success(
        newStatus ? "In Stock" : "Marked 86ed",
        `'${item.name}' is now ${newStatus ? "available in POS" : "marked unavailable (86ed)"}.`
      );
      void loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to toggle availability.");
    }
  };

  const handleDeactivateItem = async (item: MenuItem) => {
    if (!propertyId) return;
    if (!confirm(`Are you sure you want to remove '${item.name}' from active POS billing?`)) return;

    try {
      const res = await deactivateMenuItemAction(propertyId, item.id);
      if (!res.success) {
        toastError("Error", res.error || "Failed to deactivate item.");
        return;
      }
      success("Item Removed", `'${item.name}' removed from POS catalog.`);
      void loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to remove item.");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !selectedRestaurant) return;
    if (!newCatName.trim()) {
      toastError("Validation Error", "Category name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createMenuCategoryAction(propertyId, {
        restaurant_id: selectedRestaurant.id,
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
        display_order: categories.length + 1,
      });

      if (!res.success) {
        toastError("Error", res.error || "Failed to create category.");
        return;
      }

      success("Category Created", `Category '${newCatName}' created successfully.`);
      setIsAddCategoryModalOpen(false);
      setNewCatName("");
      setNewCatDesc("");
      void loadData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to create category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (loading && !restaurants.length)) {
    return (
      <div className="p-6">
        <LoadingState message="Loading POS Configuration Console..." />
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── LUXURY MIDNIGHT NAVY HEADER ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10 shadow-2xl"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
        }}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.25)",
                background: "rgba(214,168,90,0.08)",
              }}
            >
              <Sparkles className="h-3 w-3" />
              <span>Direct POS Billing Config</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              POS Item & Tariff Configuration
            </h1>
            <p className="text-sm text-slate-300/80 mt-1 max-w-2xl leading-relaxed">
              Configure items and tariffs for the 3 hotel billing streams. Anything added or modified here syncs immediately to the POS cashier terminal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Outlet Selector */}
            {restaurants.length > 1 && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                <Store className="w-4 h-4 text-[var(--brand-gold)]" />
                <select
                  value={selectedRestaurant?.id || ""}
                  onChange={(e) => void handleSelectOutlet(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white border-none outline-none cursor-pointer"
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData()}
              disabled={loading}
              className="border-white/10 text-slate-200 hover:bg-white/5 text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Sync Real-Time
            </Button>

            <Link href="/pos">
              <Button className="bg-gradient-to-r from-[var(--brand-gold)] to-amber-500 text-slate-950 font-black text-xs hover:brightness-105 shadow-md shadow-amber-500/20">
                <Store className="w-4 h-4 mr-1.5" />
                Open Live POS Terminal
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── THE 3 PRIMARY POS TABS (Strictly matching the user's POS terminal tabs) ── */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl">
        <button
          onClick={() => {
            setActiveSection("FOOD");
            setSelectedCategoryFilter("ALL");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold transition-all shadow-sm ${
            activeSection === "FOOD"
              ? "bg-[var(--brand-gold)] text-slate-950 shadow-md shadow-amber-500/20 scale-[1.01]"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Food & Dining Menu</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeSection === "FOOD" ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-400"
            }`}
          >
            {menuItems.filter((i) => getPosItemSection(i) === "FOOD").length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSection("ROOMS");
            setSelectedCategoryFilter("ALL");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold transition-all shadow-sm ${
            activeSection === "ROOMS"
              ? "bg-[var(--brand-gold)] text-slate-950 shadow-md shadow-amber-500/20 scale-[1.01]"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <BedDouble className="w-4 h-4" />
          <span>Rooms & Stay Charges</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeSection === "ROOMS" ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-400"
            }`}
          >
            {menuItems.filter((i) => getPosItemSection(i) === "ROOMS").length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSection("SERVICES");
            setSelectedCategoryFilter("ALL");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold transition-all shadow-sm ${
            activeSection === "SERVICES"
              ? "bg-[var(--brand-gold)] text-slate-950 shadow-md shadow-amber-500/20 scale-[1.01]"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Hotel Services & Spa</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeSection === "SERVICES" ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-400"
            }`}
          >
            {menuItems.filter((i) => getPosItemSection(i) === "SERVICES").length}
          </span>
        </button>
      </div>

      {/* ── ACTION BAR & FILTERS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              type="text"
              placeholder={`Search ${activeSection === "FOOD" ? "dishes" : activeSection === "ROOMS" ? "tariffs" : "services"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 text-xs h-9 text-white placeholder:text-slate-500 rounded-xl"
            />
          </div>

          {/* Category Filter */}
          {sectionCategories.length > 0 && (
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none cursor-pointer h-9 font-medium"
            >
              <option value="ALL">All Categories ({sectionCategories.length})</option>
              {sectionCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none cursor-pointer h-9 font-medium"
          >
            <option value="ALL">All Availability</option>
            <option value="AVAILABLE">In Stock & Active</option>
            <option value="86ED">Unavailable (86ed)</option>
            <option value="INACTIVE">Archived / Inactive</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {activeSection === "FOOD" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddCategoryModalOpen(true)}
              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-bold h-9 rounded-xl"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5 text-[var(--brand-gold)]" />
              + Add Category
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => void openAddItemModal()}
            className="bg-[var(--brand-gold)] hover:brightness-105 text-slate-950 font-black text-xs h-9 rounded-xl shadow-md shadow-amber-500/15"
          >
            <Plus className="w-4 h-4 mr-1" />
            {activeSection === "FOOD"
              ? "Add Food Item"
              : activeSection === "ROOMS"
              ? "Add Room Charge / Tariff"
              : "Add Hotel Service / Spa"}
          </Button>
        </div>
      </div>

      {/* ── ITEMS GRID ── */}
      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-800 bg-slate-900/20 space-y-3 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            {activeSection === "FOOD" ? (
              <UtensilsCrossed className="w-6 h-6" />
            ) : activeSection === "ROOMS" ? (
              <BedDouble className="w-6 h-6" />
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-base font-bold text-white">
            No {activeSection === "FOOD" ? "food menu items" : activeSection === "ROOMS" ? "room stay charges" : "hotel service charges"} found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No items matching '${searchQuery}'. Try clearing your search filter.`
              : `Click the button below to add your first ${activeSection === "FOOD" ? "dish" : activeSection === "ROOMS" ? "room charge item" : "hotel service item"} to the POS.`}
          </p>
          <Button
            size="sm"
            onClick={() => void openAddItemModal()}
            className="bg-[var(--brand-gold)] text-slate-950 font-bold text-xs mt-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add First Item
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`p-4 rounded-2xl border transition-all hover:border-[var(--brand-gold)]/40 group relative flex flex-col justify-between ${
                !item.is_active
                  ? "bg-slate-950/40 border-slate-900 opacity-60"
                  : !item.is_available
                  ? "bg-amber-950/10 border-amber-900/30"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div className="space-y-2.5">
                {/* Header: Name, Price, and Section Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/50">
                      {item.category_name || "Standard Item"}
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-1 group-hover:text-[var(--brand-gold)] transition">
                      {item.name}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-amber-400 font-mono">
                      ₹{Number(item.price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* SKU / Short Name Info */}
                {(item.sku || item.short_name) && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    {item.sku && <span>SKU: {item.sku}</span>}
                    {item.short_name && <span>• Short: {item.short_name}</span>}
                  </div>
                )}
              </div>

              {/* Footer Controls: Availability toggle, Edit, Delete */}
              <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => void handleToggleAvailability(item)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition ${
                    item.is_available
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                  }`}
                  title="Click to toggle in-stock availability in POS"
                >
                  {item.is_available ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>In Stock</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-amber-400" />
                      <span>86ed (Unavailable)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditItemModal(item)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                    title="Edit Item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDeactivateItem(item)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                    title="Remove Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── MODAL: ADD POS ITEM ── */}
      <Modal
        open={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        title={
          activeSection === "FOOD"
            ? "Add Food Menu Item"
            : activeSection === "ROOMS"
            ? "Add Room Tariff / Stay Charge"
            : "Add Hotel Service / Spa Amenity"
        }
      >
        <form onSubmit={handleSaveNewItem} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              This item will immediately be available in POS under the{" "}
              <strong className="text-amber-300">
                {activeSection === "FOOD"
                  ? "Food & Dining Menu"
                  : activeSection === "ROOMS"
                  ? "Rooms & Stay Charges"
                  : "Hotel Services & Spa"}
              </strong>{" "}
              tab for bill generation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Item / Charge Name <span className="text-rose-400">*</span>
            </label>
            <Input
              type="text"
              placeholder={
                activeSection === "FOOD"
                  ? "e.g., Paneer Butter Masala, Club Sandwich"
                  : activeSection === "ROOMS"
                  ? "e.g., Deluxe Ocean View Tariff, Extra Rollaway Bed"
                  : "e.g., Swedish Full Body Massage, Airport Premium Shuttle"
              }
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Price (INR ₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400 font-mono">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="pl-7 bg-slate-950 border-slate-800 text-xs text-white font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none cursor-pointer h-9 font-medium"
              >
                {sectionCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Short Name / Code
              </label>
              <Input
                type="text"
                placeholder="e.g., PBN, EXBED, SPA60"
                value={itemShortName}
                onChange={(e) => setItemShortName(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                SKU / Tariff Code
              </label>
              <Input
                type="text"
                placeholder="e.g., FNB-01, RM-EXT-01"
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Description / Inclusions
            </label>
            <textarea
              rows={2}
              placeholder="Brief details or inclusions for billing receipts..."
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[var(--brand-gold)] transition"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="initialAvailability"
              checked={itemIsAvailable}
              onChange={(e) => setItemIsAvailable(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-[var(--brand-gold)] focus:ring-0 cursor-pointer"
            />
            <label htmlFor="initialAvailability" className="text-xs font-medium text-slate-300 cursor-pointer">
              Mark immediately In-Stock & available in POS cashier
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddItemModalOpen(false)}
              className="border-slate-800 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[var(--brand-gold)] text-slate-950 font-black text-xs"
            >
              {isSubmitting ? "Adding..." : "Save to POS Catalog"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: EDIT POS ITEM ── */}
      <Modal
        open={isEditItemModalOpen}
        onClose={() => setIsEditItemModalOpen(false)}
        title={`Edit ${selectedItemForEdit?.name || "Item"}`}
      >
        <form onSubmit={handleSaveEditItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Item Name <span className="text-rose-400">*</span>
            </label>
            <Input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Price (INR ₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400 font-mono">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="pl-7 bg-slate-950 border-slate-800 text-xs text-white font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none cursor-pointer h-9 font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Short Name / Code
              </label>
              <Input
                type="text"
                value={itemShortName}
                onChange={(e) => setItemShortName(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                SKU / Tariff Code
              </label>
              <Input
                type="text"
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[var(--brand-gold)] transition"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="editAvailability"
              checked={itemIsAvailable}
              onChange={(e) => setItemIsAvailable(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-[var(--brand-gold)] focus:ring-0 cursor-pointer"
            />
            <label htmlFor="editAvailability" className="text-xs font-medium text-slate-300 cursor-pointer">
              Item In-Stock & Available for POS billing
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditItemModalOpen(false)}
              className="border-slate-800 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[var(--brand-gold)] text-slate-950 font-black text-xs"
            >
              {isSubmitting ? "Saving..." : "Update Item"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: ADD CATEGORY ── */}
      <Modal
        open={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        title="Add Menu / Tariff Category"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Category Name <span className="text-rose-400">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., Tandoori Starters, Beverages, Spa Packages"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Description
            </label>
            <Input
              type="text"
              placeholder="Optional category description"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddCategoryModalOpen(false)}
              className="border-slate-800 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[var(--brand-gold)] text-slate-950 font-black text-xs"
            >
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
