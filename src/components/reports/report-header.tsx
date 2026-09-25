"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { DateRangePreset, ComparisonPreset } from "@/lib/reports/types";
import { Calendar, Download, Building2, RefreshCw } from "lucide-react";

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
    <div className="flex flex-col gap-4 pb-4 border-b border-border/60">
      {/* Top Bar: Title & Property Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <span className="inline-flex items-center text-xs font-medium gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
              <Building2 className="w-3 h-3" />
              {propertyName}
            </span>
          </div>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            disabled={isExporting}
            className="h-9 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Filter Row: Preset, Date range, Comparison */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border border-border/80 text-sm shadow-xs">
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
            <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs px-2.5">
              Apply
            </Button>
          </form>
        ) : (
          <div className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded">
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
