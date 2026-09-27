"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ExpenseFilterParams,
  ExpenseCategory,
  ExpenseDatePreset,
  ExpensePaymentMethod,
  ExpenseStatus,
} from "@/lib/expenses/types";
import {
  Search,
  Filter,
  RotateCcw,
  Calendar,
  X,
} from "lucide-react";

interface ExpenseFiltersProps {
  filters: ExpenseFilterParams;
  categories: ExpenseCategory[];
  suppliers: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  onFiltersChange: (newFilters: Partial<ExpenseFilterParams>) => void;
  onReset: () => void;
}

const DATE_PRESETS: Array<{ label: string; value: ExpenseDatePreset }> = [
  { label: "Today", value: "TODAY" },
  { label: "Yesterday", value: "YESTERDAY" },
  { label: "This Week", value: "THIS_WEEK" },
  { label: "This Month", value: "THIS_MONTH" },
  { label: "Last Month", value: "LAST_MONTH" },
  { label: "This Quarter", value: "THIS_QUARTER" },
  { label: "This Year", value: "THIS_YEAR" },
  { label: "Custom", value: "CUSTOM" },
];

const PAYMENT_METHODS: Array<{ label: string; value: ExpensePaymentMethod | "ALL" }> = [
  { label: "All Methods", value: "ALL" },
  { label: "Cash", value: "CASH" },
  { label: "Bank Transfer", value: "BANK_TRANSFER" },
  { label: "UPI", value: "UPI" },
  { label: "Credit Card", value: "CREDIT_CARD" },
  { label: "Debit Card", value: "DEBIT_CARD" },
  { label: "Cheque", value: "CHEQUE" },
  { label: "Other", value: "OTHER" },
];

const STATUSES: Array<{ label: string; value: ExpenseStatus | "ALL" }> = [
  { label: "All Statuses", value: "ALL" },
  { label: "Recorded", value: "RECORDED" },
  { label: "Paid", value: "PAID" },
  { label: "Pending", value: "PENDING" },
  { label: "Draft", value: "DRAFT" },
  { label: "Cancelled / Void", value: "CANCELLED" },
];

export function ExpenseFiltersView({
  filters,
  categories,
  suppliers,
  departments,
  onFiltersChange,
  onReset,
}: ExpenseFiltersProps) {
  const [searchInput, setSearchInput] = React.useState(filters.searchQuery || "");
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Debounced search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== (filters.searchQuery || "")) {
        onFiltersChange({ searchQuery: searchInput, page: 1 });
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput, filters.searchQuery, onFiltersChange]);

  const activeFilterCount = [
    filters.categoryId && filters.categoryId !== "ALL",
    filters.vendorId && filters.vendorId !== "ALL",
    filters.departmentId && filters.departmentId !== "ALL",
    filters.paymentMethod && filters.paymentMethod !== "ALL",
    filters.status && filters.status !== "ALL",
    filters.minAmount !== undefined && filters.minAmount > 0,
    filters.maxAmount !== undefined && filters.maxAmount > 0,
    filters.searchQuery && filters.searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3 bg-card border border-border/80 rounded-xl p-4 shadow-xs">
      {/* 1. Date Range Preset Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {DATE_PRESETS.map((p) => {
            const isSelected = filters.preset === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onFiltersChange({ preset: p.value, page: 1 })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom date range picker (if preset is CUSTOM) */}
        {filters.preset === "CUSTOM" && (
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => onFiltersChange({ startDate: e.target.value, page: 1 })}
              className="bg-muted px-2.5 py-1 rounded-md border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => onFiltersChange({ endDate: e.target.value, page: 1 })}
              className="bg-muted px-2.5 py-1 rounded-md border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {/* 2. Main Search & Dropdown Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Search by title, voucher #, vendor, invoice..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 text-xs h-9 bg-muted/40"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                onFiltersChange({ searchQuery: "", page: 1 });
              }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category */}
        <div>
          <select
            value={filters.categoryId || "ALL"}
            onChange={(e) => onFiltersChange({ categoryId: e.target.value, page: 1 })}
            className="w-full h-9 px-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Vendor */}
        <div>
          <select
            value={filters.vendorId || "ALL"}
            onChange={(e) => onFiltersChange({ vendorId: e.target.value, page: 1 })}
            className="w-full h-9 px-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="ALL">All Vendors</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div>
          <select
            value={filters.paymentMethod || "ALL"}
            onChange={(e) =>
              onFiltersChange({
                paymentMethod: e.target.value as ExpensePaymentMethod | "ALL",
                page: 1,
              })
            }
            className="w-full h-9 px-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <select
            value={filters.status || "ALL"}
            onChange={(e) =>
              onFiltersChange({
                status: e.target.value as ExpenseStatus | "ALL",
                page: 1,
              })
            }
            className="w-full h-9 px-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Filter Actions (Reset & Advanced toggle) */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium text-[11px]">
              {activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}
            </span>
          )}
        </div>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              onReset();
            }}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
