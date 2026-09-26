"use client";

import * as React from "react";
import {
  UtensilsCrossed,
  ShoppingBag,
  DollarSign,
  Ban,
  Users,
  CheckCircle2,
} from "lucide-react";
import { RestaurantKPIs } from "@/lib/restaurant/types";
import { KPIWidget } from "@/components/hotel/hotel-cards";

interface RestaurantKpiGridProps {
  kpis: RestaurantKPIs;
  currency?: string;
  className?: string;
  loading?: boolean;
}

export function RestaurantKpiGrid({
  kpis,
  currency = "$",
  className = "",
  loading = false,
}: RestaurantKpiGridProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 ${className}`}>
      <KPIWidget
        title="Open Orders"
        value={kpis.open_orders_count}
        trendLabel="In-progress & active"
        color="warning"
        icon={<ShoppingBag className="h-4 w-4" />}
        loading={loading}
      />

      <KPIWidget
        title="Active Tables"
        value={kpis.active_tables_count}
        trendLabel="Currently occupied"
        color="primary"
        icon={<Users className="h-4 w-4" />}
        loading={loading}
      />

      <KPIWidget
        title="Available Tables"
        value={kpis.available_tables_count}
        trendLabel="Ready for seating"
        color="success"
        icon={<CheckCircle2 className="h-4 w-4" />}
        loading={loading}
      />

      <KPIWidget
        title="Today's Orders"
        value={kpis.today_orders_count}
        trendLabel="Completed & active"
        color="info"
        icon={<UtensilsCrossed className="h-4 w-4" />}
        loading={loading}
      />

      <KPIWidget
        title="Today's Sales"
        value={`${currency}${kpis.today_order_sales.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
        trendLabel="Gross volume"
        color="accent"
        icon={<DollarSign className="h-4 w-4" />}
        loading={loading}
      />

      <KPIWidget
        title="Cancelled Orders"
        value={kpis.cancelled_orders_count}
        trendLabel="Voided or cancelled"
        color="danger"
        icon={<Ban className="h-4 w-4" />}
        loading={loading}
      />
    </div>
  );
}
