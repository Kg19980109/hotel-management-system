"use client";

import * as React from "react";
import { getPropertyTodayContext } from "@/lib/dashboard/formatters";
import type { PropertyContextInfo } from "@/lib/dashboard/types";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { MapPin, Calendar, Clock, RefreshCw, Sparkles, ShieldCheck, Hotel } from "lucide-react";
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
  const { dateString, greeting } = getPropertyTodayContext(timezone);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] p-4 sm:p-5",
        "border border-white/10 shadow-xl transition-all"
      )}
      style={{
        background: "linear-gradient(135deg, #070D1B 0%, #0D1933 45%, #132247 100%)",
        boxShadow: "0 12px 36px -10px rgba(7, 13, 27, 0.45), 0 0 0 1px rgba(214, 168, 90, 0.15)",
      }}
    >
      {/* Top gold ambient shimmer line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #D4AF37 20%, #F5E7A9 50%, #D4AF37 80%, transparent 100%)",
        }}
      />

      {/* Ambient background glows */}
      <div
        className="absolute -top-24 -right-24 h-64 w-64 rounded-full pointer-events-none blur-3xl opacity-25"
        style={{ background: "radial-gradient(circle, #5146E5 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full pointer-events-none blur-2xl opacity-15"
        style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Property identity & Live context */}
        <div className="flex-1 min-w-0">
          {/* Top badge row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Greeting pill */}
            <span
              className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] px-2.5 py-0.5 rounded-full border backdrop-blur-md shadow-xs"
              style={{
                color: "#E8CD8A",
                borderColor: "rgba(214, 168, 90, 0.35)",
                background: "rgba(214, 168, 90, 0.12)",
              }}
            >
              <Sparkles className="h-3 w-3 text-[#D4AF37]" />
              {greeting}
            </span>

            {/* Live Operations badge */}
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Operations
            </span>

            <span className="text-white/20 hidden sm:inline">·</span>

            {/* Timezone pill */}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/70 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-md">
              <Clock className="h-3 w-3 text-white/40" />
              {timezone}
            </span>

            {/* Date pill */}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/70 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-md">
              <Calendar className="h-3 w-3 text-white/40" />
              {dateString}
            </span>

            {property?.currency && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10 uppercase tracking-wider">
                {property.currency}
              </span>
            )}
          </div>

          {/* Hero Hotel Name & Location Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#5146E5]/20 border border-[#D4AF37]/30 flex items-center justify-center shrink-0 shadow-inner">
              <Hotel className="h-4 w-4 text-[#E8CD8A]" />
            </div>
            <h1
              className="text-[22px] sm:text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-white truncate"
              style={{
                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {property ? property.name : "Grand Luxury Resort & Spa"}
            </h1>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-white/60">
              <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
              {property?.city
                ? `${property.city}${property.state ? `, ${property.state}` : ""}, ${property.country}`
                : property?.country || "Goa, India"}
            </span>
          </div>
        </div>

        {/* Right: Refresh & Luxury Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-9 px-3 text-[12px] font-bold text-white/80 hover:text-white hover:bg-white/10 border border-white/15 rounded-xl backdrop-blur-md transition shadow-xs"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-[#D4AF37] ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          )}
          <DashboardQuickActions />
        </div>
      </div>
    </div>
  );
}
