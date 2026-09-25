"use client";

// ============================================================
// STAYHUB KITCHEN STATIONS MANAGEMENT PAGE (Phase 13)
// ============================================================

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
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
import { StationManager } from "@/components/kds";

export default function KitchenStationsPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [stations, setStations] = useState<KitchenStation[]>([]);

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

        const stns = await getKitchenStations(activeRest.id, true);
        setStations(stns);
      } else {
        setSelectedRestaurant(null);
      }
    } catch (err: unknown) {
      console.error("Failed to load kitchen stations:", err);
      setError(err instanceof Error ? err.message : "Failed to load stations");
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
      const stns = await getKitchenStations(target.id, true);
      setStations(stns);
    } catch (err: unknown) {
      console.error("Failed to load stations:", err);
    }
  };

  if (authLoading || (loading && !selectedRestaurant)) {
    return (
      <div className="p-6">
        <LoadingState message="Loading Kitchen Stations..." />
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
            Configure an outlet first to add and manage kitchen stations.
          </p>
          <Link href="/restaurant" className="inline-block mt-4">
            <Button size="sm" className="text-xs font-semibold">
              Go to Restaurant Overview
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <Link href="/restaurant/kds" className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Kitchen Display (KDS)
        </Link>
        <PageHeader
          title="Kitchen Stations Configuration"
          description="Define preparation stations (Hot Kitchen, Cold Pantry, Bar, Bakery) and display sequences."
          actions={
            <div className="flex items-center gap-2">
              {restaurants.length > 1 && (
                <select
                  value={selectedRestaurant.id}
                  onChange={(e) => handleSelectOutlet(e.target.value)}
                  className="text-xs h-9 rounded-md border border-input bg-background px-3 py-1 font-medium text-foreground shadow-xs"
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="text-xs h-9"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>
          }
        />
      </div>

      <StationManager
        restaurantId={selectedRestaurant.id}
        restaurantName={selectedRestaurant.name}
        stations={stations}
        onRefresh={loadData}
      />
    </div>
  );
}
