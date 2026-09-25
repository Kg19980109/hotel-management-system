"use client";

// ============================================================
// STAYHUB MENU & STATION ROUTING EDITOR (Phase 12 & 13)
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

  // Stations & Routing
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [routings, setRoutings] = useState<MenuItemKitchenStation[]>([]);

  // Modals
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
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

  // Create lookup map for item -> primary station
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

  // Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toastError("Validation Error", "Category name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
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

      success("Category Created", `Category '${categoryName}' has been added.`);
      setIsAddCategoryOpen(false);
      setCategoryName("");
      setCategoryDesc("");
      setCategoryOrder(0);
      onRefresh?.();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to create category.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    setItemDisplayOrder(0);
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

  return (
    <div className="space-y-4">
      {/* UNROUTED WARNING BANNER */}
      {unroutedCount > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>{unroutedCount} menu items</strong> have no assigned kitchen station. KDS will mark them as &quot;Unrouted&quot;.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            Edit items to assign prep stations
          </span>
        </div>
      )}

      {/* Top Filter & Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 rounded-xl border border-border shadow-xs">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCategoryId("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategoryId === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All Items ({menuItems.filter((m) => m.is_active).length})
          </button>
          {categories
            .filter((c) => c.is_active)
            .map((cat) => {
              const count = menuItems.filter(
                (m) => m.is_active && m.category_id === cat.id
              ).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategoryId === cat.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
        </div>

        {/* Search & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddCategoryOpen(true)}
            className="text-xs h-8"
          >
            <Layers className="h-3.5 w-3.5 mr-1" />
            + Category
          </Button>
          <Button
            size="sm"
            onClick={handleOpenAddItem}
            className="text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Menu Item
          </Button>
        </div>
      </div>

      {/* Menu Items Table / Grid */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border flex flex-col items-center justify-center p-6">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h4 className="text-sm font-semibold text-foreground">No menu items found</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {categories.length === 0
              ? "Start by adding a menu category first."
              : "Add menu items with prices to build your restaurant catalog."}
          </p>
          <Button
            size="sm"
            onClick={handleOpenAddItem}
            className="mt-4 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Item Name</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Kitchen Station</th>
                  <th className="px-4 py-2.5">Price</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Availability</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const station = stationByItemId[item.id];

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-md">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.category_name || "—"}
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 font-bold text-foreground">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                        {item.sku || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                            item.is_available
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.is_available ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {item.is_available ? "In Stock" : "Out of Stock"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditItem(item)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeactivateItem(item)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Deactivate Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* CREATE CATEGORY MODAL */}
      <Modal
        open={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        title="Add Menu Category"
        description="E.g. Starters, Main Course, Beverages, Desserts"
      >
        <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Starters, Biryani, Drinks"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="text-xs h-8"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Description (Optional)
            </label>
            <Input
              placeholder="Brief description..."
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Display Order
            </label>
            <Input
              type="number"
              min="0"
              value={categoryOrder}
              onChange={(e) => setCategoryOrder(Number(e.target.value) || 0)}
              className="text-xs h-8"
            />
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
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE / EDIT MENU ITEM MODAL */}
      <Modal
        open={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title={editingItem ? `Edit Menu Item` : `Add Menu Item`}
        description={`Configure menu item for ${restaurant.name}`}
      >
        <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-foreground mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="w-full text-xs h-8 rounded-md border border-input bg-background px-3 py-1 text-foreground"
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
              <label className="block font-semibold text-foreground mb-1">
                Price ($) <span className="text-rose-500">*</span>
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
            <label className="block font-semibold text-foreground mb-1">
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
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Item Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Paneer Butter Masala"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="text-xs h-8"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-foreground mb-1">
                Short Name (Optional)
              </label>
              <Input
                placeholder="e.g. Paneer BM"
                value={itemShortName}
                onChange={(e) => setItemShortName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">
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
            <label className="block font-semibold text-foreground mb-1">
              Description (Optional)
            </label>
            <Input
              placeholder="e.g. Cottage cheese cubes simmered in creamy tomato gravy"
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
              className="rounded border-input text-primary focus:ring-primary"
            />
            <label htmlFor="item-available-check" className="font-semibold text-foreground">
              Currently Available in Stock
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
              {isSubmitting ? "Saving..." : editingItem ? "Update Item" : "Create Item"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
