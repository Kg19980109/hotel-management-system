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
      <div className="stayhub-card p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">QR Dining Publisher</h2>
            <p className="text-xs text-muted-foreground">
              Admin menu → guest QR menu → KDS kitchen ticket. Same items, instant publish.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedId}
            onChange={(e) => void handleSelect(e.target.value)}
            className="stayhub-input-base h-9 text-xs max-w-60"
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
                <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Guest preview
                </Button>
              </Link>
              <Link href="/restaurant/kds">
                <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5">
                  <ChefHat className="w-3.5 h-3.5" /> Open KDS
                </Button>
              </Link>
              <Link href="/qr-services">
                <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5">
                  <QrCode className="w-3.5 h-3.5" /> QR codes
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="stayhub-card p-3 text-center">
          <p className="font-black text-base">{visibleCount}</p>
          <p className="text-muted-foreground">Visible on QR</p>
        </div>
        <div className="stayhub-card p-3 text-center">
          <p className="font-black text-base text-emerald-600">{orderableCount}</p>
          <p className="text-muted-foreground">Orderable (→ KDS)</p>
        </div>
        <div className="stayhub-card p-3 text-center">
          <p className="font-black text-base text-rose-500">{items.length - orderableCount}</p>
          <p className="text-muted-foreground">Hidden / paused</p>
        </div>
      </div>

      {/* Filters */}
      <div className="stayhub-card p-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes..."
            className="stayhub-input-base pl-9 h-9 text-xs"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="stayhub-input-base h-9 text-xs sm:max-w-52"
        >
          <option value="ALL">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const busy = togglingId === item.id;
          return (
            <div key={item.id} className="stayhub-card p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold truncate">{item.name}</span>
                  {!item.is_active ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border">HIDDEN FROM QR</span>
                  ) : item.is_available ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">LIVE ON QR → KDS</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">VISIBLE, PAUSED</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ₹{Number(item.price).toFixed(2)} · {categories.find((c) => c.id === item.category_id)?.name || "Uncategorized"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void handleToggleVisible(item)} className="h-8 text-[11px]">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : item.is_active ? "Hide from QR" : "Show on QR"}
                </Button>
                <Button
                  size="sm"
                  variant={item.is_available ? "outline" : "primary"}
                  disabled={busy || !item.is_active}
                  onClick={() => void handleToggleAvailable(item)}
                  className="h-8 text-[11px]"
                  title={!item.is_active ? "Show on QR first" : undefined}
                >
                  {item.is_available ? "Pause orders" : "Make orderable"}
                </Button>
                {item.is_active && (
                  <button onClick={() => void handleHide(item)} className="text-rose-500 hover:text-rose-600 p-1.5" title="Deactivate">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="stayhub-card p-8 text-center text-xs text-muted-foreground">
            No dishes match. Create them in <Link href="/restaurant/menu" className="underline font-bold">Restaurant → Menu</Link> first.
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        How it works: “Show on QR” sets <code>is_active</code> (guest portal only lists active items). “Make orderable” sets{" "}
        <code>is_available</code>. Guest QR orders call <code>create_guest_food_order</code> which validates price/availability
        server-side and fires a KDS ticket via <code>create_or_fire_kitchen_ticket</code> — visible in Kitchen (KDS).
      </p>
    </div>
  );
}
