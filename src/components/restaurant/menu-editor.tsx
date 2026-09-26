"use client";

// ============================================================
// STAYHUB PREMIUM MENU & CATEGORY MANAGEMENT (Phase 5)
// ============================================================

import * as React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  UtensilsCrossed,
  Layers,
  Edit2,
  Trash2,
  ChefHat,
  AlertTriangle,
  Smartphone,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  Restaurant,
  MenuCategory,
  MenuItem,
} from "@/lib/restaurant/types";
import {
  createCategoryAction,
  updateCategoryAction,
  deactivateCategoryAction,
  createMenuItemAction,
  updateMenuItemAction,
  toggleMenuItemAvailabilityAction,
  deactivateMenuItemAction,
} from "@/lib/restaurant/actions";
import { KitchenStation, MenuItemKitchenStation } from "@/lib/kds/types";
import {
  getKitchenStations,
  getMenuItemKitchenStations,
} from "@/lib/kds/queries";
import { saveMenuItemRoutingAction } from "@/lib/kds/actions";

interface MenuEditorProps {
  propertyId: string;
  restaurant: Restaurant;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  onRefresh?: () => void;
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
  // Default luxury gourmet plated dish
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80";
};

export function MenuEditor({
  propertyId,
  restaurant,
  categories,
  menuItems,
  onRefresh,
}: MenuEditorProps) {
  const { success, error: toastError } = useToast();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Stations & Routing
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [routings, setRoutings] = useState<MenuItemKitchenStation[]>([]);

  // Modals
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isGuestPreviewOpen, setIsGuestPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form: Category
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");
  const [categoryOrder, setCategoryOrder] = useState(0);

  // Form: Item
  const [itemName, setItemName] = useState("");
  const [itemShortName, setItemShortName] = useState("");
  const [itemSku, setItemSku] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemStationId, setItemStationId] = useState("");
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemDisplayOrder, setItemDisplayOrder] = useState(0);

  const loadKdsData = useCallback(async () => {
    if (!restaurant.id) return;
    try {
      const [stns, rts] = await Promise.all([
        getKitchenStations(restaurant.id, false),
        getMenuItemKitchenStations(restaurant.id),
      ]);
      setStations(stns);
      setRoutings(rts);
    } catch (err: unknown) {
      console.error("Failed to load KDS routing data:", err);
    }
  }, [restaurant.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKdsData();
  }, [loadKdsData]);

  // Lookup map for item -> primary station
  const stationByItemId = useMemo(() => {
    const map: Record<string, { id: string; name: string; code: string }> = {};
    routings.forEach((r) => {
      if (r.is_primary || !map[r.menu_item_id]) {
        map[r.menu_item_id] = {
          id: r.kitchen_station_id,
          name: r.station_name || "Station",
          code: r.station_code || "KDS",
        };
      }
    });
    return map;
  }, [routings]);

  // Unrouted items count
  const unroutedCount = useMemo(() => {
    return menuItems.filter((m) => m.is_active && !stationByItemId[m.id]).length;
  }, [menuItems, stationByItemId]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.is_active) return false;
      if (selectedCategoryId !== "ALL" && item.category_id !== selectedCategoryId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q) || false;
        const matchesSku = item.sku?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesDesc && !matchesSku) return false;
      }
      return true;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  // CATEGORY HANDLERS
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDesc("");
    setCategoryOrder(categories.length);
    setIsAddCategoryOpen(true);
  };

  const handleOpenEditCategory = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description || "");
    setCategoryOrder(cat.display_order);
    setIsAddCategoryOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toastError("Validation Error", "Category name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const res = await updateCategoryAction(propertyId, editingCategory.id, {
          name: categoryName.trim(),
          description: categoryDesc.trim() || undefined,
          display_order: categoryOrder,
        });

        if (!res.success) {
          toastError("Error", res.error || "Failed to update category.");
          return;
        }

        success("Category Updated", `Category '${categoryName}' updated.`);
      } else {
        const res = await createCategoryAction(propertyId, {
          restaurant_id: restaurant.id,
          name: categoryName.trim(),
          description: categoryDesc.trim() || undefined,
          display_order: categoryOrder,
        });

        if (!res.success) {
          toastError("Error", res.error || "Failed to create category.");
          return;
        }

        success("Category Created", `Category '${categoryName}' added to menu.`);
      }

      setIsAddCategoryOpen(false);
      setCategoryName("");
      setCategoryDesc("");
      setCategoryOrder(0);
      setEditingCategory(null);
      onRefresh?.();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to save category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateCategory = async (cat: MenuCategory) => {
    const activeItemsInCat = menuItems.filter((m) => m.is_active && m.category_id === cat.id);
    if (activeItemsInCat.length > 0) {
      toastError(
        "Cannot Remove Category",
        `Category '${cat.name}' has ${activeItemsInCat.length} active menu item(s). Reassign or deactivate those items first.`
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to deactivate the category "${cat.name}"?`)) {
      return;
    }

    try {
      const res = await deactivateCategoryAction(propertyId, cat.id);
      if (!res.success) {
        toastError("Error", res.error || "Failed to deactivate category.");
        return;
      }
      success("Category Deactivated", `Category '${cat.name}' was removed.`);
      if (selectedCategoryId === cat.id) {
        setSelectedCategoryId("ALL");
      }
      onRefresh?.();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to deactivate category.");
    }
  };

  // ITEM HANDLERS
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemName("");
    setItemShortName("");
    setItemSku("");
    setItemDesc("");
    setItemPrice(0);
    setItemCategoryId(selectedCategoryId !== "ALL" ? selectedCategoryId : categories[0]?.id || "");
    setItemStationId(stations[0]?.id || "");
    setItemAvailable(true);
    setItemDisplayOrder(menuItems.length);
    setIsAddItemOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemShortName(item.short_name || "");
    setItemSku(item.sku || "");
    setItemDesc(item.description || "");
    setItemPrice(item.price);
    setItemCategoryId(item.category_id);
    setItemStationId(stationByItemId[item.id]?.id || "");
    setItemAvailable(item.is_available);
    setItemDisplayOrder(item.display_order);
    setIsAddItemOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toastError("Validation Error", "Item name is required.");
      return;
    }
    if (itemPrice == null || isNaN(itemPrice) || itemPrice < 0) {
      toastError("Validation Error", "Please provide a valid price >= 0.");
      return;
    }
    if (!itemCategoryId) {
      toastError("Validation Error", "Please select a category.");
      return;
    }

    setIsSubmitting(true);
    try {
      let savedItemId = editingItem?.id;

      if (editingItem) {
        const res = await updateMenuItemAction(propertyId, editingItem.id, {
          name: itemName.trim(),
          short_name: itemShortName.trim() || undefined,
          sku: itemSku.trim() || undefined,
          description: itemDesc.trim() || undefined,
          price: itemPrice,
          category_id: itemCategoryId,
          is_available: itemAvailable,
          display_order: itemDisplayOrder,
        });

        if (!res.success) {
          toastError("Update Failed", res.error || "Could not update item.");
          return;
        }
        success("Item Updated", `${itemName} updated.`);
      } else {
        const res = await createMenuItemAction(propertyId, {
          restaurant_id: restaurant.id,
          category_id: itemCategoryId,
          name: itemName.trim(),
          short_name: itemShortName.trim() || undefined,
          sku: itemSku.trim() || undefined,
          description: itemDesc.trim() || undefined,
          price: itemPrice,
          is_available: itemAvailable,
          display_order: itemDisplayOrder,
        });

        if (!res.success || !res.data) {
          toastError("Creation Failed", res.error || "Could not create item.");
          return;
        }
        savedItemId = (res.data as { id: string }).id;
        success("Item Created", `${itemName} added to menu.`);
      }

      // Save Station Routing if selected
      if (savedItemId && itemStationId) {
        await saveMenuItemRoutingAction(savedItemId, itemStationId, true);
      }

      setIsAddItemOpen(false);
      onRefresh?.();
      loadKdsData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const res = await toggleMenuItemAvailabilityAction(
        propertyId,
        item.id,
        !item.is_available
      );
      if (!res.success) {
        toastError("Error", res.error || "Failed to toggle availability.");
        return;
      }
      success(
        item.is_available ? "Marked as Sold Out" : "Marked as In Stock",
        `"${item.name}" availability updated immediately for guest dining and POS.`
      );
      onRefresh?.();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to update item.");
    }
  };

  const handleDeactivateItem = async (item: MenuItem) => {
    if (!window.confirm(`Deactivate "${item.name}"? Historical orders will keep this item's price and details intact.`)) {
      return;
    }

    try {
      const res = await deactivateMenuItemAction(propertyId, item.id);
      if (!res.success) {
        toastError("Deactivation Failed", res.error || "Could not deactivate item.");
        return;
      }
      success("Item Deactivated", `"${item.name}" has been deactivated.`);
      onRefresh?.();
      loadKdsData();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to deactivate item.");
    }
  };

  const currencySymbol = restaurant.currency === "USD" ? "$" : "₹";

  return (
    <div className="space-y-5">
      {/* UNROUTED WARNING BANNER */}
      {unroutedCount > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>{unroutedCount} active dish{unroutedCount > 1 ? "es" : ""}</strong> have no assigned kitchen station. KDS tickets will label them as &quot;Unrouted&quot;.
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
            Edit dishes to route them to Hot Line, Pantry, Bar, or Grill
          </span>
        </div>
      )}

      {/* TOP CONTROLS & CATEGORY PILLS BAR */}
      <div className="stayhub-card p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategoryId === "ALL"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "bg-[var(--secondary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/80"
              }`}
            >
              All Dishes ({menuItems.filter((m) => m.is_active).length})
            </button>
            {categories
              .filter((c) => c.is_active)
              .map((cat) => {
                const count = menuItems.filter(
                  (m) => m.is_active && m.category_id === cat.id
                ).length;
                return (
                  <div key={cat.id} className="relative group inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategoryId === cat.id
                          ? "bg-[var(--primary)] text-white shadow-xs"
                          : "bg-[var(--secondary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/80"
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                    {/* Quick Edit Category on hover */}
                    <div className="hidden group-hover:flex items-center ml-1 space-x-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1 rounded text-slate-400 hover:text-[var(--primary)]"
                        title="Edit Category"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivateCategory(cat)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500"
                        title="Deactivate Category"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Search Input */}
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-md text-xs font-semibold transition ${
                  viewMode === "cards"
                    ? "bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
                title="Rich Culinary Cards View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md text-xs font-semibold transition ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
                title="Dense Table View"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Live Customer Preview Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGuestPreviewOpen(true)}
              className="text-xs h-8 border-[var(--brand-gold)]/40 text-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/10 font-bold"
            >
              <Smartphone className="h-3.5 w-3.5 mr-1" />
              Guest Preview
            </Button>

            {/* Add Category */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenAddCategory}
              className="text-xs h-8"
            >
              <Layers className="h-3.5 w-3.5 mr-1" />
              + Category
            </Button>

            {/* Add Item */}
            <Button
              size="sm"
              onClick={handleOpenAddItem}
              className="text-xs h-8 font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Dish
            </Button>
          </div>
        </div>
      </div>

      {/* EMPTY STATE */}
      {filteredItems.length === 0 ? (
        <div className="py-20 text-center stayhub-card border-dashed flex flex-col items-center justify-center p-8">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h4 className="text-base font-bold text-[var(--foreground)]">No menu items found</h4>
          <p className="text-xs text-[var(--foreground-muted)] mt-1.5 max-w-md">
            {categories.length === 0
              ? "Start by adding a menu category first (e.g. Starters, Main Course, Desserts, Beverages)."
              : "Add culinary dishes with server-validated prices, photos, and prep stations to launch your menu."}
          </p>
          <div className="flex items-center gap-2 mt-5">
            {categories.length === 0 && (
              <Button size="sm" variant="outline" onClick={handleOpenAddCategory} className="text-xs font-semibold">
                <Layers className="h-3.5 w-3.5 mr-1" />
                Add Category First
              </Button>
            )}
            <Button size="sm" onClick={handleOpenAddItem} className="text-xs font-semibold">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add First Dish
            </Button>
          </div>
        </div>
      ) : viewMode === "cards" ? (
        /* ── RICH CULINARY CARDS VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const station = stationByItemId[item.id];
            const cat = categories.find((c) => c.id === item.category_id);
            const foodImg = getFoodImageForDish(item.name, cat?.name || "");

            return (
              <div
                key={item.id}
                className="stayhub-card overflow-hidden flex flex-col justify-between group hover:border-[var(--primary)]/60 hover:shadow-lg transition-all duration-200"
              >
                {/* Food Image Banner */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <img
                    src={foodImg}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Category Pill Tag */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {cat?.name || "Culinary"}
                    </span>
                  </div>

                  {/* Stock Availability Badge */}
                  <div className="absolute top-3 right-3">
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(item)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold backdrop-blur-md transition-all shadow-sm ${
                        item.is_available
                          ? "bg-emerald-500/90 hover:bg-emerald-500 text-white"
                          : "bg-rose-500/90 hover:bg-rose-500 text-white"
                      }`}
                      title="Click to toggle availability"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full bg-white ${item.is_available ? "animate-pulse" : ""}`} />
                      {item.is_available ? "AVAILABLE" : "SOLD OUT"}
                    </button>
                  </div>

                  {/* Price overlay at bottom of image */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <span className="text-xl font-black text-white drop-shadow-md">
                      {currencySymbol}{item.price.toFixed(2)}
                    </span>
                    {item.sku && (
                      <span className="text-[10px] font-mono text-slate-300 bg-black/50 px-2 py-0.5 rounded border border-white/10">
                        {item.sku}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                      {item.name}
                    </h4>
                    {item.short_name && (
                      <p className="text-[11px] font-medium text-[var(--foreground-subtle)]">
                        Short: {item.short_name}
                      </p>
                    )}
                    <p className="text-xs text-[var(--foreground-muted)] line-clamp-2 mt-1 leading-relaxed">
                      {item.description || "Authentic culinary preparation made fresh with premium seasonal ingredients."}
                    </p>
                  </div>

                  {/* Station Routing Pill */}
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                    <div>
                      {station ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[10.5px] uppercase bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">
                          <ChefHat className="h-3 w-3" />
                          {station.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-[10.5px] uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
                          ⚠️ Unrouted
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditItem(item)}
                        className="h-7 w-7 p-0 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
                        title="Edit Dish"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivateItem(item)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Deactivate Dish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── DENSE TABLE VIEW ── */
        <div className="stayhub-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--secondary)]/50 border-b border-[var(--border)] text-[var(--foreground-subtle)] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Dish Name & Details</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Kitchen Station</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredItems.map((item) => {
                  const station = stationByItemId[item.id];
                  const cat = categories.find((c) => c.id === item.category_id);

                  return (
                    <tr key={item.id} className="hover:bg-[var(--secondary)]/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[var(--foreground)]">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-[var(--foreground-muted)] line-clamp-1 max-w-md mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[var(--foreground-muted)] font-medium">
                        {cat?.name || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {station ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] uppercase bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">
                            <ChefHat className="h-3 w-3" />
                            {station.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-[10px] uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
                            ⚠️ Unrouted
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-[var(--foreground)]">
                        {currencySymbol}{item.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-[var(--foreground-muted)] font-mono text-[11px]">
                        {item.sku || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                            item.is_available
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:brightness-95"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:brightness-95"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.is_available ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {item.is_available ? "AVAILABLE" : "UNAVAILABLE"}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditItem(item)}
                            className="h-7 w-7 p-0 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                            title="Edit Item"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivateItem(item)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                            title="Deactivate Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT CATEGORY MODAL ── */}
      <Modal
        open={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        title={editingCategory ? "Edit Menu Category" : "Add Menu Category"}
        description="E.g. Starters, Main Course, Tandoor, Desserts, Beverages"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-foreground mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Starters, Main Course, Biryani, Cocktails"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="text-xs h-8"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">
              Description (Optional)
            </label>
            <Input
              placeholder="Brief description of this culinary section..."
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">
              Display Sequence Order
            </label>
            <Input
              type="number"
              min="0"
              value={categoryOrder}
              onChange={(e) => setCategoryOrder(Number(e.target.value) || 0)}
              className="text-xs h-8"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Controls the tab order in guest mobile dining and cashier terminals.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddCategoryOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── CREATE / EDIT MENU ITEM MODAL ── */}
      <Modal
        open={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title={editingItem ? "Edit Menu Dish" : "Add Menu Dish"}
        description={`Configure culinary item for ${restaurant.name}`}
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-foreground mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="w-full text-xs h-8 rounded-md border border-input bg-background px-3 py-1 font-medium text-foreground"
                required
              >
                <option value="">-- Choose Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                Price ({currencySymbol}) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={itemPrice || ""}
                onChange={(e) => setItemPrice(Number(e.target.value) || 0)}
                className="text-xs h-8"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">
              Primary Kitchen Station (KDS Routing)
            </label>
            <select
              value={itemStationId}
              onChange={(e) => setItemStationId(e.target.value)}
              className="w-full text-xs h-8 rounded-md border border-input bg-background px-3 py-1 font-medium text-foreground"
            >
              <option value="">-- None (Unrouted) --</option>
              {stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Select which kitchen station prepares this dish (e.g. Hot Line, Pantry, Grill).
            </p>
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">
              Dish Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Paneer Butter Masala, Truffle Risotto"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="text-xs h-8"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-foreground mb-1">
                Short Name (Optional)
              </label>
              <Input
                placeholder="e.g. Paneer BM, Truffle Rst"
                value={itemShortName}
                onChange={(e) => setItemShortName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                SKU / Code (Optional)
              </label>
              <Input
                placeholder="e.g. MAIN-012"
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">
              Description (Optional)
            </label>
            <Input
              placeholder="e.g. Cottage cheese cubes simmered in velvety tomato & butter gravy"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="item-available-check"
              checked={itemAvailable}
              onChange={(e) => setItemAvailable(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="item-available-check" className="font-bold text-foreground cursor-pointer">
              Currently Available in Stock (Published to Guest QR Portal & POS)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddItemOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingItem ? "Update Dish" : "Create Dish"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── LIVE CUSTOMER GUEST PREVIEW MODAL ── */}
      <Modal
        open={isGuestPreviewOpen}
        onClose={() => setIsGuestPreviewOpen(false)}
        title="Live Guest QR Dining Preview"
        description={`Authoritative preview of what hotel guests see at ${restaurant.name}`}
      >
        <div className="max-w-md mx-auto bg-slate-950 text-white rounded-3xl p-4 border border-slate-800 shadow-2xl space-y-4">
          {/* Guest App Simulated Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-amber-400">Live QR Dining Portal</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Room 304</span>
          </div>

          {/* Restaurant Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold uppercase">
                {restaurant.code}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Kitchen Active
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white">{restaurant.name}</h3>
            <p className="text-[11px] text-slate-400 line-clamp-1">
              {restaurant.description || "Fine dining & room service delivered to your door."}
            </p>
          </div>

          {/* Category Pills Preview */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.filter((c) => c.is_active).map((c, i) => (
              <span
                key={c.id}
                className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                  i === 0
                    ? "bg-amber-500 text-slate-950 font-black"
                    : "bg-slate-900 text-slate-300 border border-slate-800"
                }`}
              >
                {c.name}
              </span>
            ))}
          </div>

          {/* Dishes Preview List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {menuItems.filter((m) => m.is_active).map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  item.is_available
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-950 border-slate-850 opacity-50"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    {!item.is_available && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Sold Out
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-[10.5px] text-slate-400 line-clamp-1">{item.description}</p>
                  )}
                  <p className="text-xs font-extrabold text-amber-400">
                    {currencySymbol}{item.price.toFixed(2)}
                  </p>
                </div>

                {item.is_available ? (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] shrink-0">
                    + Add
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                    Unavailable
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 text-center">
            <p className="text-[10px] text-slate-400">
              Changes saved in admin appear in real-time on customer smartphones.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
