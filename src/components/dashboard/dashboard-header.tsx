"use client";

import * as React from "react";
import { getPropertyTodayContext } from "@/lib/dashboard/formatters";
import type { PropertyContextInfo } from "@/lib/dashboard/types";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { MapPin, Calendar, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  property: PropertyContextInfo | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DashboardHeader({
  property,
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) {
  const timezone = property?.timezone || "Asia/Kolkata";
  const { dateString, formattedFull, greeting } = getPropertyTodayContext(timezone);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[var(--border)]">
      {/* Title & Property Context */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[12px] font-semibold text-[var(--primary)] uppercase tracking-wider">
            {greeting}
          </span>
          <span className="text-[var(--border)]">•</span>
          <span className="text-[12px] text-[var(--foreground-muted)] flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timezone}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {property ? property.name : "Hotel Operations Dashboard"}
        </h1>

        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[13px] text-[var(--foreground-muted)]">
          {property && (
            <span className="flex items-center gap-1 font-medium text-[var(--foreground)]">
              <MapPin className="h-3.5 w-3.5 text-[var(--primary)]" />
              {property.city ? `${property.city}, ${property.country}` : property.country}
            </span>
          )}
          <span className="hidden sm:inline text-[var(--border)]">•</span>
          <span className="flex items-center gap-1" title={formattedFull}>
            <Calendar className="h-3.5 w-3.5 text-[var(--foreground-subtle)]" />
            {dateString}
          </span>
          <span className="hidden sm:inline text-[var(--border)]">•</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-elevated)] border border-[var(--border)]">
            Currency: <strong className="ml-1 text-[var(--foreground)]">{property?.currency || "INR"}</strong>
          </span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
        <DashboardQuickActions />
      </div>
    </div>
  );
}
