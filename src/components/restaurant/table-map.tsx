"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  CheckCircle2,
  Layers,
  UtensilsCrossed,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  Restaurant,
  RestaurantArea,
  RestaurantTable,
  TableStatus,
} from "@/lib/restaurant/types";
import { TableStatusBadge } from "./order-status-badge";
import {
  createTableAction,
  createAreaAction,
  updateTableStatusAction,
  deactivateTableAction,
} from "@/lib/restaurant/actions";

interface TableMapProps {
  propertyId: string;
  restaurant: Restaurant;
  areas: RestaurantArea[];
  tables: RestaurantTable[];
  onRefresh?: () => void;
}

export function TableMap({
  propertyId,
  restaurant,
  areas,
  tables,
  onRefresh,
}: TableMapProps) {
  const { success, error: toastError } = useToast();

  const [selectedAreaId, setSelectedAreaId] = useState<string>("ALL");
  const selectedStatus = "ALL";

  // Modals
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
  const [selectedTableForStatus, setSelectedTableForStatus] = useState<RestaurantTable | null>(null);

  // Form states
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newAreaId, setNewAreaId] = useState("");
  const [newCapacity, setNewCapacity] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaDesc, setNewAreaDesc] = useState("");

  // Filter tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (!t.is_active) return false;
      if (selectedAreaId !== "ALL" && t.area_id !== selectedAreaId) return false;
      if (selectedStatus !== "ALL" && t.status !== selectedStatus) return false;
      return true;
    });
  }, [tables, selectedAreaId, selectedStatus]);

  // Handlers
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) {
      toastError("Validation Error", "Table number is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTableAction(propertyId, {
        restaurant_id: restaurant.id,
        table_number: newTableNumber.trim(),
        display_name: newDisplayName.trim() || undefined,
        area_id: newAreaId || null,
        capacity: newCapacity,
      });

      if (!res.success) {
        toastError("Error", res.error || "Failed to create table.");
        return;
      }

      success("Table Created", `Table ${newTableNumber} has been added.`);
      setIsAddTableOpen(false);
      setNewTableNumber("");
      setNewDisplayName("");
      setNewAreaId("");
      setNewCapacity(4);
      onRefresh?.();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to create table.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) {
      toastError("Validation Error", "Area name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAreaAction(propertyId, {
        restaurant_id: restaurant.id,
        name: newAreaName.trim(),
        description: newAreaDesc.trim() || undefined,
      });

      if (!res.success) {
        toastError("Error", res.error || "Failed to create area.");
        return;
      }

      success("Area Created", `Dining Area '${newAreaName}' created.`);
      setIsAddAreaOpen(false);
      setNewAreaName("");
      setNewAreaDesc("");
      onRefresh?.();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to create area.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (tableId: string, status: TableStatus) => {
    try {
      const res = await updateTableStatusAction(propertyId, restaurant.id, tableId, status);
      if (!res.success) {
        toastError("Update Failed", res.error || "Could not update table status.");
        return;
      }
      success("Status Updated", `Table status set to ${status}.`);
      setSelectedTableForStatus(null);
      onRefresh?.();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  const handleDeactivateTable = async (table: RestaurantTable) => {
    if (!confirm(`Are you sure you want to deactivate Table ${table.table_number}?`)) {
      return;
    }

    try {
      const res = await deactivateTableAction(propertyId, table.id);
      if (!res.success) {
        toastError("Deactivation Failed", res.error || "Could not deactivate table.");
        return;
      }
      success("Table Deactivated", `Table ${table.table_number} deactivated.`);
      onRefresh?.();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to deactivate table.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Filter Pills & Action Buttons */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 rounded-xl border border-border shadow-xs">
        {/* Area Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedAreaId("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedAreaId === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All Areas ({tables.filter((t) => t.is_active).length})
          </button>
          {areas
            .filter((a) => a.is_active)
            .map((area) => {
              const count = tables.filter(
                (t) => t.is_active && t.area_id === area.id
              ).length;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedAreaId(area.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedAreaId === area.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {area.name} ({count})
                </button>
              );
            })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddAreaOpen(true)}
            className="text-xs h-8"
          >
            <Layers className="h-3.5 w-3.5 mr-1" />
            + Area
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddTableOpen(true)}
            className="text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Tables Grid */}
      {filteredTables.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border flex flex-col items-center justify-center p-6">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h4 className="text-sm font-semibold text-foreground">No tables found</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Configure your dining tables to start taking restaurant orders.
          </p>
          <Button
            size="sm"
            onClick={() => setIsAddTableOpen(true)}
            className="mt-4 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create First Table
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {filteredTables.map((table) => {
            return (
              <div
                key={table.id}
                className={`p-3.5 rounded-xl border bg-card transition-all duration-150 flex flex-col justify-between shadow-xs hover:shadow-sm ${
                  table.status === "OCCUPIED"
                    ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/20"
                    : table.status === "AVAILABLE"
                    ? "border-emerald-200 dark:border-emerald-800/60"
                    : "border-border"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div>
                      <div className="font-bold text-sm text-foreground">
                        T-{table.table_number}
                      </div>
                      {table.display_name && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {table.display_name}
                        </div>
                      )}
                    </div>
                    <TableStatusBadge status={table.status} size="sm" />
                  </div>

                  <div className="text-[11px] text-muted-foreground space-y-0.5 mt-2">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>Capacity: {table.capacity} guests</span>
                    </div>
                    {table.area_name && (
                      <div className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        <span className="truncate">{table.area_name}</span>
                      </div>
                    )}
                  </div>

                  {table.active_order_id && table.active_order_number && (
                    <Link
                      href={`/restaurant/orders/${table.active_order_id}`}
                      className="mt-2.5 block px-2 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-[11px] font-semibold text-center hover:underline"
                    >
                      Active: {table.active_order_number}
                    </Link>
                  )}
                </div>

                {/* Quick Status Button */}
                <div className="pt-2.5 mt-2.5 border-t border-border/60 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTableForStatus(table)}
                    className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    Change Status
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeactivateTable(table)}
                    className="text-muted-foreground hover:text-rose-600 p-1 rounded"
                    title="Deactivate Table"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TABLE MODAL */}
      <Modal
        open={isAddTableOpen}
        onClose={() => setIsAddTableOpen(false)}
        title="Add Restaurant Table"
        description={`Add a new dining table to ${restaurant.name}`}
      >
        <form onSubmit={handleCreateTable} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Table Number <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. 1, 10A, Patio-3"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              className="text-xs h-8"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Display Name (Optional)
            </label>
            <Input
              placeholder="e.g. Window Corner, VIP Booth"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-foreground mb-1">
                Area
              </label>
              <select
                value={newAreaId}
                onChange={(e) => setNewAreaId(e.target.value)}
                className="w-full text-xs h-8 rounded-md border border-input bg-background px-3 py-1 text-foreground"
              >
                <option value="">-- No Area --</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">
                Capacity (Guests)
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value) || 4)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddTableOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Table"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE AREA MODAL */}
      <Modal
        open={isAddAreaOpen}
        onClose={() => setIsAddAreaOpen(false)}
        title="Add Dining Area"
        description="Create a section such as Main Dining, Rooftop, or Bar"
      >
        <form onSubmit={handleCreateArea} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Area Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Rooftop Terrace, Bar Lounge"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="text-xs h-8"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Description (Optional)
            </label>
            <Input
              placeholder="Brief area notes..."
              value={newAreaDesc}
              onChange={(e) => setNewAreaDesc(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddAreaOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Area"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CHANGE STATUS MODAL */}
      <Modal
        open={!!selectedTableForStatus}
        onClose={() => setSelectedTableForStatus(null)}
        title={`Change Status - Table ${selectedTableForStatus?.table_number}`}
        description="Select an operational status for this table"
      >
        <div className="grid grid-cols-2 gap-2 text-xs py-2">
          {(
            [
              "AVAILABLE",
              "OCCUPIED",
              "RESERVED",
              "CLEANING",
              "OUT_OF_SERVICE",
            ] as TableStatus[]
          ).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() =>
                selectedTableForStatus &&
                handleUpdateStatus(selectedTableForStatus.id, st)
              }
              className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                selectedTableForStatus?.status === st
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border hover:bg-muted text-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{st.replace(/_/g, " ")}</span>
                {selectedTableForStatus?.status === st && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
