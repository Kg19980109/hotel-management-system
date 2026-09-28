"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { DateRangePreset, ComparisonPreset } from "@/lib/reports/types";
import { Calendar, Download, Building2, RefreshCw, BarChart3 } from "lucide-react";

interface ReportHeaderProps {
  title: string;
  description?: string;
  activePreset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  startDate: string;
  endDate: string;
  onCustomDateChange?: (start: string, end: string) => void;
  comparison: ComparisonPreset;
  onComparisonChange: (comp: ComparisonPreset) => void;
  onExportCsv: () => void;
  isExporting?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
  propertyName?: string;
}

const PRESET_OPTIONS: Array<{ label: string; value: DateRangePreset }> = [
  { label: "Today", value: "TODAY" },
  { label: "Yesterday", value: "YESTERDAY" },
  { label: "Last 7 Days", value: "LAST_7_DAYS" },
  { label: "Last 30 Days", value: "LAST_30_DAYS" },
  { label: "This Month", value: "THIS_MONTH" },
  { label: "Last Month", value: "LAST_MONTH" },
  { label: "This Quarter", value: "THIS_QUARTER" },
  { label: "This Year", value: "THIS_YEAR" },
  { label: "Custom", value: "CUSTOM" },
];

export function ReportHeader({
  title,
  description,
  activePreset,
  onPresetChange,
  startDate,
  endDate,
  onCustomDateChange,
  comparison,
  onComparisonChange,
  onExportCsv,
  isExporting = false,
  onRefresh,
  isLoading = false,
  propertyName = "Primary Property",
}: ReportHeaderProps) {
  const [showCustom, setShowCustom] = React.useState(activePreset === "CUSTOM");
  const [customStart, setCustomStart] = React.useState(startDate);
  const [customEnd, setCustomEnd] = React.useState(endDate);

  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as DateRangePreset;
    if (val === "CUSTOM") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
    }
    onPresetChange(val);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCustomDateChange && customStart && customEnd) {
      onCustomDateChange(customStart, customEnd);
    }
  };

  return (
    <div className="space-y-4 mb-2">
      {/* ── LUXURY HERO BANNER ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10 shadow-2xl"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Ambient radial glows */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.10) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            {/* Pill Badge */}
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.30)",
                background: "rgba(214,168,90,0.10)",
              }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              INTELLIGENCE & AUDIT REPORTS
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {title}
              {description && (
                <span className="block text-white/60 text-sm font-normal mt-1">
                  {description}
                </span>
              )}
            </h1>

            {/* Property and Status indicators */}
            <div className="flex items-center gap-3 mt-4 flex-wrap text-xs text-white/80">
              <span className="inline-flex items-center gap-1.5 font-semibold bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                <Building2 className="w-3.5 h-3.5 text-amber-300" />
                {propertyName}
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-mono text-white/70">
                {startDate} <span className="text-amber-400">→</span> {endDate}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-10 text-xs font-semibold px-4 border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white backdrop-blur-xs gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}

            <Button
              size="sm"
              onClick={onExportCsv}
              disabled={isExporting}
              className="h-10 text-xs px-4 gap-2 font-bold shadow-lg"
              style={{
                background: "linear-gradient(135deg, #D4AF37 0%, #F59E0B 100%)",
                color: "#08111F",
              }}
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Row: Preset, Date range, Comparison */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border border-border/80 text-sm shadow-xs">
        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">Range:</span>
          <select
            value={activePreset}
            onChange={handleSelectPreset}
            className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Display or Custom Inputs */}
        {showCustom ? (
          <form onSubmit={handleApplyCustom} className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
            />
            <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs px-2.5 font-semibold">
              Apply Range
            </Button>
          </form>
        ) : (
          <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2.5 py-1 rounded-md border border-border/50">
            {startDate} <span className="opacity-60">→</span> {endDate}
          </div>
        )}

        {/* Comparison Selector */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-medium text-muted-foreground">Compare:</span>
          <select
            value={comparison}
            onChange={(e) => onComparisonChange(e.target.value as ComparisonPreset)}
            className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="PREVIOUS_PERIOD">Previous Period</option>
            <option value="PREVIOUS_YEAR">Previous Year</option>
            <option value="NONE">No Comparison</option>
          </select>
        </div>
      </div>
    </div>
  );
}
