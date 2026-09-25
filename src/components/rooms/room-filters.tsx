"use client";

import * as React from "react";
import { SearchInput, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Floor, RoomType, RoomFilterOptions } from "@/lib/rooms/types";
import { LayoutGrid, List, RotateCcw } from "lucide-react";

interface RoomFiltersProps {
  filters: RoomFilterOptions;
  onFilterChange: (filters: RoomFilterOptions) => void;
  floors: Floor[];
  roomTypes: RoomType[];
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
}

export function RoomFilters({
  filters,
  onFilterChange,
  floors,
  roomTypes,
  viewMode,
  onViewModeChange,
}: RoomFiltersProps) {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value, page: 1 });
  };

  const handleStatusChange = (val: string) => {
    onFilterChange({
      ...filters,
      status: val === "ALL" ? "ALL" : (val as RoomFilterOptions["status"]),
      page: 1,
    });
  };

  const handleFloorChange = (val: string) => {
    onFilterChange({ ...filters, floorId: val, page: 1 });
  };

  const handleTypeChange = (val: string) => {
    onFilterChange({ ...filters, roomTypeId: val, page: 1 });
  };

  const handleActiveChange = (val: string) => {
    onFilterChange({
      ...filters,
      isActive: val === "ALL" ? "ALL" : val === "true",
      page: 1,
    });
  };

  const handleReset = () => {
    onFilterChange({
      search: "",
      status: "ALL",
      housekeepingStatus: "ALL",
      floorId: "ALL",
      roomTypeId: "ALL",
      isActive: "ALL",
      page: 1,
    });
  };

  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.status !== "ALL" ||
    filters.floorId !== "ALL" ||
    filters.roomTypeId !== "ALL" ||
    filters.isActive !== "ALL";

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 max-w-sm">
          <SearchInput
            placeholder="Search room number or name..."
            value={filters.search || ""}
            onChange={handleSearch}
          />
        </div>

        {/* View mode toggle & reset */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Filters
            </Button>
          )}

          <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
                viewMode === "list"
                  ? "bg-white text-[var(--foreground)] shadow-xs"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
              title="Table List View"
              aria-label="Table List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-[var(--foreground)] shadow-xs"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
              title="Card Grid View"
              aria-label="Card Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Selects Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Status */}
        <div>
          <Select
            value={filters.status || "ALL"}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="ALL">All Operational Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="DIRTY">Needs Cleaning</option>
            <option value="CLEANING">Cleaning in Progress</option>
            <option value="INSPECTED">Inspected</option>
            <option value="OUT_OF_ORDER">Out of Order</option>
          </Select>
        </div>

        {/* Room Type */}
        <div>
          <Select
            value={filters.roomTypeId || "ALL"}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <option value="ALL">All Room Types</option>
            {roomTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Floor */}
        <div>
          <Select
            value={filters.floorId || "ALL"}
            onChange={(e) => handleFloorChange(e.target.value)}
          >
            <option value="ALL">All Floors</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Active/Inactive */}
        <div>
          <Select
            value={
              filters.isActive === undefined || filters.isActive === "ALL"
                ? "ALL"
                : filters.isActive
                ? "true"
                : "false"
            }
            onChange={(e) => handleActiveChange(e.target.value)}
          >
            <option value="ALL">All Records (Active & Inactive)</option>
            <option value="true">Active Rooms Only</option>
            <option value="false">Deactivated Rooms Only</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
