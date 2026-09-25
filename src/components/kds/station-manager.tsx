"use client";

// ============================================================
// STAYHUB KITCHEN STATION MANAGER (Phase 13)
// ============================================================

import * as React from "react";
import { useState } from "react";
import { Plus, Edit2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { KitchenStation } from "@/lib/kds/types";
import {
  createKitchenStationAction,
  updateKitchenStationAction,
} from "@/lib/kds/actions";

interface StationManagerProps {
  restaurantId: string;
  restaurantName: string;
  stations: KitchenStation[];
  onRefresh: () => void;
}

export function StationManager({
  restaurantId,
  restaurantName,
  stations,
  onRefresh,
}: StationManagerProps) {
  const { success, error: toastError } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<KitchenStation | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setEditingStation(null);
    setName("");
    setCode("");
    setDescription("");
    setDisplayOrder(String(stations.length + 1));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (station: KitchenStation) => {
    setEditingStation(station);
    setName(station.name);
    setCode(station.code);
    setDescription(station.description || "");
    setDisplayOrder(String(station.display_order));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toastError("Validation Error", "Station name and code are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingStation) {
        const res = await updateKitchenStationAction(
          editingStation.id,
          name.trim(),
          code.trim(),
          description.trim(),
          parseInt(displayOrder, 10) || 0,
          editingStation.is_active
        );
        if (!res.success) {
          toastError("Error", res.error || "Failed to update station.");
          return;
        }
        success("Station Updated", `Station ${name} updated successfully.`);
      } else {
        const res = await createKitchenStationAction(
          restaurantId,
          name.trim(),
          code.trim(),
          description.trim(),
          parseInt(displayOrder, 10) || 0
        );
        if (!res.success) {
          toastError("Error", res.error || "Failed to create station.");
          return;
        }
        success("Station Created", `Kitchen station ${name} added to outlet.`);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to save station.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (station: KitchenStation) => {
    try {
      const res = await updateKitchenStationAction(
        station.id,
        station.name,
        station.code,
        station.description || "",
        station.display_order,
        !station.is_active
      );
      if (!res.success) {
        toastError("Error", res.error || "Failed to toggle status.");
        return;
      }
      success(
        "Status Changed",
        `Station ${station.name} is now ${!station.is_active ? "active" : "deactivated"}.`
      );
      onRefresh();
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Action failed.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-foreground">
            Kitchen Preparation Stations
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure line stations for {restaurantName} (Hot Line, Cold Pantry, Bar, Bakery).
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="text-xs h-8">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Station
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {stations.map((st) => (
          <Card
            key={st.id}
            className={`p-3.5 border-border bg-card flex flex-col justify-between ${
              !st.is_active ? "opacity-60 bg-muted/30" : ""
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {st.name}
                  </h4>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">
                    CODE: {st.code}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    st.is_active
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {st.is_active ? "Active" : "Deactivated"}
                </span>
              </div>

              {st.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {st.description}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-mono">
                Order: #{st.display_order}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(st)}
                  className="h-7 px-2 text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(st)}
                  className={`h-7 px-2 text-xs ${
                    st.is_active ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  {st.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStation ? "Edit Kitchen Station" : "Create Kitchen Station"}
        description={`Configure line production queue for ${restaurantName}`}
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Station Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Hot Kitchen, Tandoor & Grill, Salad Bar, Bar..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!editingStation) {
                  setCode(e.target.value.toUpperCase().replace(/\s+/g, "_"));
                }
              }}
              className="text-xs h-8"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Station Code <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. HOT_KITCHEN, BAR, DESSERT..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-xs h-8 uppercase font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Description (Optional)
            </label>
            <Input
              placeholder="e.g. Handles main curries, rice, tandoori breads..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Display Sequence
            </label>
            <Input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="text-xs h-8"
              min="0"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Saving..." : editingStation ? "Update Station" : "Create Station"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
