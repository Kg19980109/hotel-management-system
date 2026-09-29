"use client";

// ============================================================
// STAYHUB KDS MASTER PAGE (Phase 13)
// ============================================================

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  History,
  Layers,
  Store,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { Restaurant } from "@/lib/restaurant/types";
import { KitchenStation } from "@/lib/kds/types";
import { getRestaurants } from "@/lib/restaurant/queries";
import { getKitchenStations } from "@/lib/kds/queries";
import { KdsTerminal } from "@/components/kds";
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

export default function KitchenDisplayPage() {
  return (
    <RoutePermissionGuard permission="kitchen.view" moduleName="Kitchen Display System">
      <KitchenDisplayContent />
    </RoutePermissionGuard>
  );
}

function KitchenDisplayContent() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [stations, setStations] = useState<KitchenStation[]>([]);

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

        const stns = await getKitchenStations(activeRest.id, false);
        setStations(stns);
      } else {
        setSelectedRestaurant(null);
      }
    } catch (err: unknown) {
      console.error("Failed to load KDS data:", err);
      setError(err instanceof Error ? err.message : "Failed to load kitchen display");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (!authLoading) {
      if (propertyId) {
        void loadData();
      } else {
        setLoading(false);
      }
    }
  }, [authLoading, propertyId, loadData]);

  if (authLoading || (loading && !selectedRestaurant)) {
    return (
      <div className="p-6">
        <LoadingState message="Connecting to Kitchen Display System..." />
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
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border p-8">
          <Store className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            No Restaurant Outlets Configured
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Please configure at least one active restaurant outlet to open the Kitchen Display System.
          </p>
          <Link href="/restaurant" className="inline-block mt-4">
            <Button size="sm" className="text-xs font-semibold">
              Create Restaurant Outlet
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* ── LUXURY HERO BANNER ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10 shadow-2xl"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Ambient radial glows */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.10) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            {/* Pill Badge */}
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.30)",
                background: "rgba(214,168,90,0.10)",
              }}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              KITCHEN EXPEDITION & TICKETS
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Kitchen Display System (KDS)
              <span className="block text-white/60 text-sm font-normal mt-1">
                Live order production queue, cook timers, station routing & meal expedition
              </span>
            </h1>

            {/* Outlet and info */}
            <div className="flex items-center gap-3 mt-4 flex-wrap text-xs text-white/80">
              <span className="inline-flex items-center gap-1.5 font-semibold bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-white">
                <Store className="h-3.5 w-3.5 text-amber-400" />
                {selectedRestaurant.name}
              </span>
              <span className="text-white/30">•</span>
              <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                Active Station Link
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Link href="/restaurant/kitchen/stations">
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs font-semibold px-4 border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white backdrop-blur-xs gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                Stations
              </Button>
            </Link>

            <Link href="/restaurant/kds/history">
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs font-semibold px-4 border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white backdrop-blur-xs gap-1.5"
              >
                <History className="h-3.5 w-3.5" />
                History
              </Button>
            </Link>

            <Link href="/restaurant/pos">
              <Button
                size="sm"
                className="h-10 text-xs px-4 gap-2 font-bold shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #F59E0B 100%)",
                  color: "#08111F",
                }}
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Open POS
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KDS Terminal Component */}
      <KdsTerminal
        propertyId={propertyId!}
        restaurantId={selectedRestaurant.id}
        initialStations={stations}
      />
    </div>
  );
}
