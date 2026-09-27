"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  RefreshCw,
  Store,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  Restaurant,
  MenuCategory,
  MenuItem,
} from "@/lib/restaurant/types";
import {
  getRestaurants,
  getMenuCategories,
  getMenuItems,
} from "@/lib/restaurant/queries";
import { MenuEditor } from "@/components/restaurant";

export default function RestaurantMenuPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const loadData = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const rests = await getRestaurants(propertyId, true);
      setRestaurants(rests);

      if (rests.length > 0) {
        const activeRest = rests[0];
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
      console.error("Failed to load menu data:", err);
      setError(err instanceof Error ? err.message : "Failed to load menu catalog");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (!authLoading && propertyId) {
      void loadData();
    }
  }, [authLoading, propertyId, loadData]);

  const activeItemsCount = useMemo(() => {
    return menuItems.filter((m) => m.is_active).length;
  }, [menuItems]);

  const inStockCount = useMemo(() => {
    return menuItems.filter((m) => m.is_active && m.is_available).length;
  }, [menuItems]);

  const outOfStockCount = useMemo(() => {
    return menuItems.filter((m) => m.is_active && !m.is_available).length;
  }, [menuItems]);

  if (authLoading || (loading && !selectedRestaurant)) {
    return (
      <div className="p-6">
        <LoadingState message="Loading Menu Catalog & Kitchen Routings..." />
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

  if (!selectedRestaurant) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="py-16 text-center stayhub-card border-dashed p-8">
          <Store className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            No Restaurant Outlets Configured
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Configure an outlet first to add categories and menu items.
          </p>
          <Link href="/pos" className="inline-block mt-4">
            <Button size="sm" className="text-xs font-semibold">
              Go to POS
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── LUXURY MIDNIGHT NAVY HERO ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Ambient radial lighting */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.08) 0%, transparent 70%)" }}
        />

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
              <span>Authoritative Menu & Pricing Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              Menu & Culinary Catalog
            </h1>
            <p className="text-sm text-slate-300/80 mt-1 max-w-2xl leading-relaxed">
              Configure dishes, server-authoritative pricing, stock availability, category order, and kitchen prep station routings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-slate-900/80 backdrop-blur-md text-xs font-semibold text-white shadow-xs">
              <Store className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
              <span>{selectedRestaurant.name}</span>
            </div>

            <Link href="/pos">
              <Button
                size="sm"
                className="text-xs h-9 font-bold bg-[var(--brand-gold)] hover:brightness-110 text-slate-950 shadow-md flex items-center gap-1.5"
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Open POS
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs h-9 border-white/20 text-slate-200 hover:text-white hover:bg-white/10 bg-slate-900/60"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Live Menu Summary Chips */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Layers className="h-4 w-4 text-[var(--brand-gold)] shrink-0" />
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Categories</p>
              <p className="text-sm font-extrabold text-white">{categories.filter(c => c.is_active).length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Total Dishes</p>
              <p className="text-sm font-extrabold text-white">{activeItemsCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">In Stock</p>
              <p className="text-sm font-extrabold text-emerald-400">{inStockCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Out of Stock</p>
              <p className="text-sm font-extrabold text-rose-400">{outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Editor Component */}
      <MenuEditor
        propertyId={propertyId!}
        restaurant={selectedRestaurant}
        categories={categories}
        menuItems={menuItems}
        onRefresh={loadData}
      />
    </div>
  );
}
