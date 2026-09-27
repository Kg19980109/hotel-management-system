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
        "relative overflow-hidden rounded-[24px] p-6 sm:p-8",
        "border border-white/10 shadow-2xl transition-all"
      )}
      style={{
        background: "linear-gradient(135deg, #070D1B 0%, #0D1933 45%, #132247 100%)",
        boxShadow: "0 20px 50px -10px rgba(7, 13, 27, 0.5), 0 0 0 1px rgba(214, 168, 90, 0.15)",
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
        className="absolute -top-24 -right-24 h-80 w-80 rounded-full pointer-events-none blur-3xl opacity-30"
        style={{ background: "radial-gradient(circle, #5146E5 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full pointer-events-none blur-2xl opacity-20"
        style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Property identity & Live context */}
        <div className="flex-1 min-w-0">
          {/* Top badge row */}
          <div className="flex flex-wrap items-center gap-2 mb-3.5">
            {/* Greeting pill */}
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full border backdrop-blur-md shadow-sm"
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
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Operations
            </span>

            <span className="text-white/20 hidden sm:inline">·</span>

            {/* Timezone pill */}
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">
              <Clock className="h-3.5 w-3.5 text-white/40" />
              {timezone}
            </span>

            {/* Date pill */}
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">
              <Calendar className="h-3.5 w-3.5 text-white/40" />
              {dateString}
            </span>

            {property?.currency && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10 uppercase tracking-wider">
                {property.currency}
              </span>
            )}
          </div>

          {/* Hero Hotel Name with subtle gradient */}
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#5146E5]/20 border border-[#D4AF37]/30 flex items-center justify-center shrink-0 shadow-inner">
              <Hotel className="h-5 w-5 text-[#E8CD8A]" />
            </div>
            <h1
              className="text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-[-0.03em] text-white truncate"
              style={{
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              {property ? property.name : "Grand Luxury Resort & Spa"}
            </h1>
          </div>

          {/* Location & Tagline */}
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-white/60">
            <span className="inline-flex items-center gap-1.5 text-white/75">
              <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
              {property?.city
                ? `${property.city}${property.state ? `, ${property.state}` : ""}, ${property.country}`
                : property?.country || "Goa, India"}
            </span>
            <span className="text-white/20">·</span>
            <span className="italic text-[#E8CD8A]/80 font-serif text-[13.5px]">
              A Sanctuary of Luxury &amp; Tranquility
            </span>
          </div>
        </div>

        {/* Right: Refresh & Luxury Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-10 px-4 text-white/80 hover:text-white hover:bg-white/10 border border-white/15 rounded-xl backdrop-blur-md transition shadow-sm"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className={`h-4 w-4 mr-2 text-[#D4AF37] ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          )}
          <DashboardQuickActions />
        </div>
      </div>
    </div>
  );
}
