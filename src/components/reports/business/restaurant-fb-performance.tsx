"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/reports/formatters";
import type { RestaurantFbPerformanceSummary } from "@/lib/reports/business-types";
import {
  UtensilsCrossed,
  QrCode,
  Store,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface RestaurantFbPerformanceProps {
  performance: RestaurantFbPerformanceSummary;
  currency?: string;
}

export function RestaurantFbPerformance({
  performance,
  currency = "INR",
}: RestaurantFbPerformanceProps) {
  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            Restaurant & Food & Beverage Intelligence
          </CardTitle>
        </div>
        <Link href="/restaurant/orders">
          <span className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
            Live Orders Console <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Total F&B Sales
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(performance.totalFbSales, currency)}
            </span>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Restaurant POS (Dine-In)
            </span>
            <span className="text-lg font-bold text-foreground font-mono">
              {formatCurrency(performance.dineInRevenue, currency)}
            </span>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              In-Room Dining (QR)
            </span>
            <span className="text-lg font-bold text-foreground font-mono">
              {formatCurrency(performance.roomServiceRevenue, currency)}
            </span>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Average Order Value
            </span>
            <span className="text-lg font-bold text-foreground font-mono">
              {formatCurrency(performance.avgOrderValue, currency)}
            </span>
          </div>
        </div>

        {/* Top Selling Items & Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
          {/* Top Items */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Top Selling Menu Items
            </span>
            {performance.topSellingItems.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center bg-muted/20 rounded-lg">
                No menu items sold in this period.
              </div>
            ) : (
              <div className="space-y-1.5">
                {performance.topSellingItems.map((item, idx) => (
                  <div
                    key={item.name}
                    className="p-2 bg-muted/30 rounded-lg border border-border/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-muted text-[10px] font-bold flex items-center justify-center text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground truncate">{item.name}</span>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <span className="font-bold">{formatCurrency(item.revenue, currency)}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">({item.quantity} sold)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Types */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Order Type Distribution
            </span>
            {performance.orderTypes.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center bg-muted/20 rounded-lg">
                No order history available.
              </div>
            ) : (
              <div className="space-y-2">
                {performance.orderTypes.map((ot) => (
                  <div key={ot.type} className="p-2 bg-muted/30 rounded-lg border border-border/50 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground uppercase text-[11px]">
                        {ot.type.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {ot.count} orders ({ot.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(3, ot.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
