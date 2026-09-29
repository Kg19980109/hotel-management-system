"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Layers,
  ShoppingBag,
  RefreshCw,
  Store,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  Restaurant,
  RestaurantTable,
  MenuCategory,
  MenuItem,
} from "@/lib/restaurant/types";
import {
  getRestaurants,
  getMenuCategories,
  getMenuItems,
  getRestaurantTables,
} from "@/lib/restaurant/queries";
import { PosTerminal } from "@/components/restaurant";
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

export default function RestaurantPosPage() {
  return (
    <RoutePermissionGuard permission="pos.view" moduleName="Point of Sale">
      <RestaurantPosContent />
    </RoutePermissionGuard>
  );
}

function RestaurantPosContent() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);

  const loadData = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const rests = await getRestaurants(propertyId, false);
      setRestaurants(rests);

      if (rests.length > 0) {
        const activeRest = rests[0];
        setSelectedRestaurant(activeRest);

        const [catsData, itemsData, tablesData] = await Promise.all([
          getMenuCategories(activeRest.id, false),
          getMenuItems(activeRest.id, false),
          getRestaurantTables(activeRest.id, false),
        ]);

        setCategories(catsData);
        setMenuItems(itemsData);
        setTables(tablesData);
      } else {
        setSelectedRestaurant(null);
      }
    } catch (err: unknown) {
      console.error("Failed to load POS data:", err);
      setError(err instanceof Error ? err.message : "Failed to load POS terminal data");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (!authLoading && propertyId) {
      void loadData();
    }
  }, [authLoading, propertyId, loadData]);

  if (authLoading || (loading && !selectedRestaurant)) {
    return (
      <div className="p-6">
        <LoadingState message="Loading POS Terminal..." />
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
        <Link href="/pos-configuration">
          <Button variant="ghost" size="sm" className="text-xs">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Restaurant Overview
          </Button>
        </Link>
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border p-8">
          <Store className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            No Active Dining Outlets
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Please configure at least one active restaurant outlet to use the POS cashier terminal.
          </p>
          <Link href="/pos-configuration" className="inline-block mt-4">
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
      {/* Page Header */}
      <PageHeader
        title="POS Cashier Terminal"
        description="High-speed order taking, live table seating, and instant order creation."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-foreground shadow-xs">
              <Store className="h-3.5 w-3.5 text-amber-500" />
              <span>{selectedRestaurant.name}</span>
            </div>

            <Link href="/restaurant/tables">
              <Button variant="outline" size="sm" className="text-xs h-9">
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Tables
              </Button>
            </Link>

            <Link href="/restaurant/orders">
              <Button variant="outline" size="sm" className="text-xs h-9">
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                Orders
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs h-9"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      {/* POS Terminal Component */}
      <PosTerminal
        propertyId={propertyId!}
        restaurant={selectedRestaurant}
        categories={categories}
        menuItems={menuItems}
        tables={tables}
      />
    </div>
  );
}
