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
      <div className="pt-8 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 3.364a1 1 0 011.415 0l.707.707a1 1 0 01-1.414 1.415l-.708-.707a1 1 0 010-1.415zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-3.364 4.22a1 1 0 010 1.415l-.707.707a1 1 0 01-1.415-1.414l.707-.708a1 1 0 011.415 0zM11 17a1 1 0 10-2 0v1a1 1 0 102 0v-1zm-6.064-1.95a1 1 0 01-1.415 0l-.707-.707a1 1 0 011.414-1.415l.708.707a1 1 0 010 1.415zM4 11a1 1 0 100-2H3a1 1 0 100 2h1zm2.364-6.064a1 1 0 010-1.415l.707-.707a1 1 0 011.415 1.414l-.707.708a1 1 0 01-1.415 0zM10 5a5 5 0 100 10 5 5 0 000-10z"/></svg>
            {greeting}
          </span>
          <span className="text-slate-400/60">•</span>
          <span className="text-[12px] font-medium text-slate-600 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {timezone}
          </span>
          <span className="text-slate-400/60">•</span>
          <span className="text-[12px] font-medium text-slate-600 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {dateString}
          </span>
          <span className="text-slate-400/60">•</span>
          <span className="text-[12px] font-medium text-slate-600">
            Currency: <strong className="text-slate-900">{property?.currency || "INR"}</strong>
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-slate-900 tracking-tight leading-tight">
          {property ? property.name : "Hotel Operations Dashboard"}
        </h1>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-[15px]">
          {property && (
            <span className="flex items-center gap-1.5 font-semibold text-slate-700">
              <MapPin className="h-4 w-4 text-indigo-600" />
              {property.city ? `${property.city}, ${property.country}` : property.country}
            </span>
          )}
          <span className="text-slate-300 font-serif text-lg italic px-2">
            A Sanctuary of Luxury & Tranquility
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
