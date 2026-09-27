"use client";

// ============================================================
// STAYHUB QR DINING PUBLISHER — Admin → QR Guest Menu → KDS
// One screen linking: outlet menu setup → guest QR preview → kitchen.
// Reuses the same menu_items tables the guest QR portal reads, so
// toggling here is instantly what customers see after scanning.
// Ordering flows through create_guest_food_order RPC which fires
// a KDS kitchen ticket (create_or_fire_kitchen_ticket).
// ============================================================

import * as React from "react";
import Link from "next/link";
import {
  QrCode,
  UtensilsCrossed,
  ChefHat,
  Eye,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import {
  getRestaurants,
  getMenuCategories,
  getMenuItems,
} from "@/lib/restaurant/queries";
import {
  toggleMenuItemAvailabilityAction,
  deactivateMenuItemAction,
} from "@/lib/restaurant/actions";
import type { Restaurant, MenuCategory, MenuItem } from "@/lib/restaurant/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/states";

export function QrDiningPublisher() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [categories, setCategories] = React.useState<MenuCategory[]>([]);
  const [items, setItems] = React.useState<MenuItem[]>([]);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const loadOutlets = React.useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const rests = await getRestaurants(propertyId, true);
      setRestaurants(rests);
      const first = rests.find((r) => r.id === selectedId) || rests[0];
      if (first) {
        setSelectedId(first.id);
        const [cats, menuItems] = await Promise.all([
          getMenuCategories(first.id, false),
          getMenuItems(first.id, false),
        ]);
        setCategories(cats);
        setItems(menuItems);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  React.useEffect(() => {
    void loadOutlets();
  }, [loadOutlets]);

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setLoading(true);
    try {
      const [cats, menuItems] = await Promise.all([
        getMenuCategories(id, false),
        getMenuItems(id, false),
      ]);
      setCategories(cats);
      setItems(menuItems);
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    if (!propertyId) return;
    setTogglingId(item.id);
    const res = await toggleMenuItemAvailabilityAction(propertyId, item.id, !item.is_available);
    if (res.success) {
      setItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_available: !m.is_available } : m)));
      flash(!item.is_available ? `"${item.name}" is now orderable on QR` : `"${item.name}" paused on QR`);
    }
    setTogglingId(null);
  };

  const handleToggleVisible = async (item: MenuItem) => {
    if (!propertyId) return;
    // QR visibility = is_active. Guest portal only reads is_active=true items.
    setTogglingId(item.id);
    const supabase = createClient();
    const { error } = await supabase.from("menu_items").update({ is_active: !item.is_active }).eq("id", item.id);
    if (!error) {
      setItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_active: !m.is_active } : m)));
      flash(!item.is_active ? `"${item.name}" now visible on QR menu` : `"${item.name}" hidden from QR menu`);
    }
    setTogglingId(null);
  };

  const handleHide = async (item: MenuItem) => {
    if (!propertyId) return;
    if (!confirm(`Hide "${item.name}" from all menus (including QR)?`)) return;
    const res = await deactivateMenuItemAction(propertyId, item.id);
    if (res.success) {
      setItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_active: false } : m)));
      flash(`"${item.name}" hidden`);
    }
  };

  const selected = restaurants.find((r) => r.id === selectedId) || null;

  const filtered = React.useMemo(() => {
    let list = categoryFilter === "ALL" ? items : items.filter((i) => i.category_id === categoryFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
    return list;
  }, [items, categoryFilter, search]);

  const visibleCount = items.filter((i) => i.is_active).length;
  const orderableCount = items.filter((i) => i.is_active && i.is_available).length;

  if (loading && !selected) return <LoadingState message="Loading QR dining outlets..." />;

  return (
    <div className="space-y-5">
      {notice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {notice}
        </div>
      )}

      {/* Outlet + flow header */}
      <Card className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-foreground">Digital QR Dining Publisher</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Menu → Guest → Kitchen
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select which dishes guests see and order from room QR codes. Orders route instantly to Kitchen KDS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedId}
            onChange={(e) => void handleSelect(e.target.value)}
            className="h-9 px-3 rounded-xl bg-secondary/60 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 max-w-64"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>

          {selected && (
            <>
              <Link href={`/guest/dining/${selected.id}`} target="_blank">
                <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl">
                  <Eye className="w-3.5 h-3.5 text-amber-500" /> Guest Preview
                </Button>
              </Link>
              <Link href="/restaurant/kds">
                <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl">
                  <ChefHat className="w-3.5 h-3.5 text-indigo-500" /> Open KDS
                </Button>
              </Link>
              <Link href="/qr-services">
                <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl">
                  <QrCode className="w-3.5 h-3.5" /> All QRs
                </Button>
              </Link>
            </>
          )}
        </div>
      </Card>

      {/* Status strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Visible on QR
            </span>
            <div className="text-2xl font-extrabold text-foreground mt-0.5">{visibleCount}</div>
            <span className="text-[10.5px] text-muted-foreground">Catalog items published</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black">
            <QrCode className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Live Orderable (→ KDS)
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{orderableCount}</div>
            <span className="text-[10.5px] text-emerald-600/80 dark:text-emerald-400/80">Dishes ready to prepare</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Hidden / Paused
            </span>
            <div className="text-2xl font-extrabold text-muted-foreground mt-0.5">{items.length - orderableCount}</div>
            <span className="text-[10.5px] text-muted-foreground">Temporarily unavailable</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes by name..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary/50 focus:bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 sm:max-w-56"
        >
          <option value="ALL">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Card>

      {/* Items */}
      <div className="space-y-2.5">
        {filtered.map((item) => {
          const busy = togglingId === item.id;
          return (
            <Card
              key={item.id}
              className="p-4 rounded-2xl border border-border/80 bg-card hover:border-amber-500/30 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground truncate">{item.name}</span>
                  {!item.is_active ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                      HIDDEN FROM QR
                    </span>
                  ) : item.is_available ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE ON QR → KDS
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      VISIBLE, PAUSED
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  <span className="font-bold text-foreground">₹{Number(item.price).toFixed(2)}</span> ·{" "}
                  {categories.find((c) => c.id === item.category_id)?.name || "Uncategorized"}
                  {item.description ? ` · ${item.description}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleToggleVisible(item)}
                  className="h-8.5 text-xs rounded-xl"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : item.is_active ? "Hide from QR" : "Show on QR"}
                </Button>
                <Button
                  size="sm"
                  variant={item.is_available ? "outline" : "primary"}
                  disabled={busy || !item.is_active}
                  onClick={() => void handleToggleAvailable(item)}
                  className="h-8.5 text-xs rounded-xl font-bold"
                  title={!item.is_active ? "Show on QR first" : undefined}
                >
                  {item.is_available ? "Pause Orders" : "Make Orderable"}
                </Button>
                {item.is_active && (
                  <button
                    onClick={() => void handleHide(item)}
                    className="text-rose-500 hover:text-rose-600 p-1.5 hover:bg-rose-500/10 rounded-lg transition"
                    title="Deactivate item"
                  >
                    <XCircle className="w-4.5 h-4.5" />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-10 rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground space-y-2">
            <UtensilsCrossed className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="font-bold text-foreground">No menu items match your search.</p>
            <p>
              Create dishes in <Link href="/restaurant/menu" className="text-primary underline font-bold">Restaurant → Menu</Link> first.
            </p>
          </Card>
        )}
      </div>

      <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
        <span className="font-bold text-foreground uppercase tracking-wider">How Flow Works:</span>
        <span>
          “Show on QR” publishes to guest portal. “Make Orderable” enables cart checkout, calling <code>create_guest_food_order</code> to validate prices and automatically dispatch a live ticket to Kitchen (KDS).
        </span>
      </div>
    </div>
  );
}
