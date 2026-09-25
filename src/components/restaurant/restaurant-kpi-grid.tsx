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

interface RestaurantKpiGridProps {
  kpis: RestaurantKPIs;
  currency?: string;
  className?: string;
}

export function RestaurantKpiGrid({
  kpis,
  currency = "$",
  className = "",
}: RestaurantKpiGridProps) {
  const cards = [
    {
      title: "Open Orders",
      value: kpis.open_orders_count,
      subtitle: "In-progress & active",
      icon: ShoppingBag,
      iconColor: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400",
      borderColor: "border-amber-200 dark:border-amber-800/60",
    },
    {
      title: "Active Tables",
      value: kpis.active_tables_count,
      subtitle: "Currently occupied",
      icon: Users,
      iconColor: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400",
      borderColor: "border-indigo-200 dark:border-indigo-800/60",
    },
    {
      title: "Available Tables",
      value: kpis.available_tables_count,
      subtitle: "Ready for seating",
      icon: CheckCircle2,
      iconColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400",
      borderColor: "border-emerald-200 dark:border-emerald-800/60",
    },
    {
      title: "Today's Orders",
      value: kpis.today_orders_count,
      subtitle: "Completed & active",
      icon: UtensilsCrossed,
      iconColor: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-800/60",
    },
    {
      title: "Today's Order Sales",
      value: `${currency}${kpis.today_order_sales.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: "Gross order volume",
      icon: DollarSign,
      iconColor: "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300",
      borderColor: "border-emerald-300 dark:border-emerald-700/60",
    },
    {
      title: "Cancelled Orders",
      value: kpis.cancelled_orders_count,
      subtitle: "Voided or cancelled",
      icon: Ban,
      iconColor: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400",
      borderColor: "border-rose-200 dark:border-rose-800/60",
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 ${className}`}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className={`p-3.5 rounded-xl bg-card border ${c.borderColor} shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                {c.title}
              </span>
              <div className={`p-1.5 rounded-lg ${c.iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground">
                {c.value}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {c.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
