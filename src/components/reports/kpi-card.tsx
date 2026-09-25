"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ComparisonMetric } from "@/lib/reports/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  metric?: ComparisonMetric<number>;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "default" | "gold" | "emerald" | "rose" | "indigo";
}

export function KpiCard({
  title,
  value,
  metric,
  subtitle,
  icon,
  variant = "default",
}: KpiCardProps) {
  const getTrendBadge = () => {
    if (!metric || metric.displayPctDiff === undefined) return null;

    if (metric.displayPctDiff === "N/A") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
          <Minus className="w-3 h-3" />
          N/A
        </span>
      );
    }

    if (metric.trend === "up") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
          <TrendingUp className="w-3 h-3" />
          {metric.displayPctDiff}
        </span>
      );
    }

    if (metric.trend === "down") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
          <TrendingDown className="w-3 h-3" />
          {metric.displayPctDiff}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
        {metric.displayPctDiff}
      </span>
    );
  };

  const getBorderColor = () => {
    switch (variant) {
      case "gold":
        return "border-amber-500/30 dark:border-amber-500/20";
      case "emerald":
        return "border-emerald-500/30 dark:border-emerald-500/20";
      case "rose":
        return "border-rose-500/30 dark:border-rose-500/20";
      case "indigo":
        return "border-indigo-500/30 dark:border-indigo-500/20";
      default:
        return "border-border/80";
    }
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${getBorderColor()}`}>
      <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </span>
          {icon && <div className="text-muted-foreground/70 shrink-0">{icon}</div>}
        </div>

        <div className="flex items-baseline justify-between gap-2 mt-1">
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          {getTrendBadge()}
        </div>

        {subtitle && (
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}
