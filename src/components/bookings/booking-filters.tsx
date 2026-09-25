"use client";

import * as React from "react";
import { SearchInput, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookingFilterOptions, ReservationStatus, BookingSource } from "@/lib/bookings/types";
import { RotateCcw } from "lucide-react";

interface BookingFiltersProps {
  filters: BookingFilterOptions;
  onFilterChange: (newFilters: BookingFilterOptions) => void;
}

export function BookingFilters({ filters, onFilterChange }: BookingFiltersProps) {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value, page: 1 });
  };

  const handleStatusChange = (val: string) => {
    onFilterChange({
      ...filters,
      status: val === "ALL" ? "ALL" : (val as ReservationStatus),
      page: 1,
    });
  };

  const handleSourceChange = (val: string) => {
    onFilterChange({
      ...filters,
      bookingSource: val === "ALL" ? "ALL" : (val as BookingSource),
      page: 1,
    });
  };

  const handleDatePresetChange = (val: string) => {
    onFilterChange({
      ...filters,
      datePreset: val as BookingFilterOptions["datePreset"],
      page: 1,
    });
  };

  const handleReset = () => {
    onFilterChange({
      search: "",
      status: "ALL",
      bookingSource: "ALL",
      datePreset: "ALL",
      page: 1,
    });
  };

  const hasActiveFilters =
    Boolean(filters.search) ||
    (filters.status && filters.status !== "ALL") ||
    (filters.bookingSource && filters.bookingSource !== "ALL") ||
    (filters.datePreset && filters.datePreset !== "ALL");

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 max-w-sm">
          <SearchInput
            placeholder="Search confirmation number..."
            value={filters.search || ""}
            onChange={handleSearch}
          />
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <div className="self-end md:self-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Selects Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Status */}
        <div>
          <Select
            value={filters.status || "ALL"}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="ALL">All Reservation Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending Confirmation</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </div>

        {/* Source */}
        <div>
          <Select
            value={filters.bookingSource || "ALL"}
            onChange={(e) => handleSourceChange(e.target.value)}
          >
            <option value="ALL">All Booking Sources</option>
            <option value="DIRECT">Direct (Front Desk)</option>
            <option value="WALK_IN">Walk-in Guest</option>
            <option value="WEBSITE">Brand Website</option>
            <option value="PHONE">Phone Reservation</option>
            <option value="EMAIL">Email Inquiry</option>
            <option value="OTA">Online Travel Agent (OTA)</option>
            <option value="CORPORATE">Corporate Account</option>
            <option value="TRAVEL_AGENT">Travel Agent</option>
            <option value="OTHER">Other Channels</option>
          </Select>
        </div>

        {/* Date Window */}
        <div>
          <Select
            value={filters.datePreset || "ALL"}
            onChange={(e) => handleDatePresetChange(e.target.value)}
          >
            <option value="ALL">All Stay Dates</option>
            <option value="TODAY">Today&apos;s Activity</option>
            <option value="TOMORROW">Tomorrow&apos;s Activity</option>
            <option value="NEXT_7_DAYS">Next 7 Days</option>
            <option value="NEXT_30_DAYS">Next 30 Days</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
