"use client";

import * as React from "react";
import { getPropertyTodayContext } from "@/lib/dashboard/formatters";
import type { PropertyContextInfo } from "@/lib/dashboard/types";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { MapPin, Calendar, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-2xl)] px-7 py-7",
        "border border-white/10"
      )}
      style={{
        background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
        boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
      }}
    >
      {/* Decorative ambient blobs */}
      <div
        className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(214,168,90,0.08) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        {/* Left: property identity */}
        <div className="flex-1 min-w-0">
          {/* Context bar */}
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            {/* Greeting tag */}
            <span
              className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.30)",
                background: "rgba(214,168,90,0.10)",
              }}
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 3.364a1 1 0 011.415 0l.707.707a1 1 0 01-1.414 1.415l-.708-.707a1 1 0 010-1.415zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-3.364 4.22a1 1 0 010 1.415l-.707.707a1 1 0 01-1.415-1.414l.707-.708a1 1 0 011.415 0zM11 17a1 1 0 10-2 0v1a1 1 0 102 0v-1zm-6.064-1.95a1 1 0 01-1.415 0l-.707-.707a1 1 0 011.414-1.415l.708.707a1 1 0 010 1.415zM4 11a1 1 0 100-2H3a1 1 0 100 2h1zm2.364-6.064a1 1 0 010-1.415l.707-.707a1 1 0 011.415 1.414l-.707.708a1 1 0 01-1.415 0zM10 5a5 5 0 100 10 5 5 0 000-10z" />
              </svg>
              {greeting}
            </span>

            {/* Context pills */}
            <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-white/50">
              <Clock className="h-3.5 w-3.5 text-white/30" />
              {timezone}
            </span>

            <span className="text-white/20 text-sm">·</span>

            <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-white/50">
              <Calendar className="h-3.5 w-3.5 text-white/30" />
              {dateString}
            </span>

            {property?.currency && (
              <>
                <span className="text-white/20 text-sm">·</span>
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  {property.currency}
                </span>
              </>
            )}
          </div>

          {/* Property name — the hero */}
          <h1
            className="text-[32px] sm:text-[38px] font-bold leading-[1.12] tracking-[-0.025em] text-white mb-2 truncate"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {property ? property.name : "Hotel Operations Dashboard"}
          </h1>

          {/* Location */}
          {property && (
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-white/50">
              <MapPin className="h-3.5 w-3.5 text-white/30" />
              {property.city
                ? `${property.city}${property.state ? `, ${property.state}` : ""}, ${property.country}`
                : property.country}
              <span className="text-white/20 mx-1">·</span>
              <span className="italic text-white/30">A Sanctuary of Luxury &amp; Tranquility</span>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-white/50 hover:text-white hover:bg-white/10 border border-white/10"
              title="Refresh dashboard data"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
          <DashboardQuickActions />
        </div>
      </div>
    </div>
  );
}
