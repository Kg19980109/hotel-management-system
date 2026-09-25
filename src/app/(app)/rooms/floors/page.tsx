"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { fetchFloors } from "@/lib/rooms/queries";
import { createFloorAction, updateFloorAction } from "@/lib/rooms/actions";
import type { Floor } from "@/lib/rooms/types";
import { PageHeader } from "@/components/shared/page-header";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState, LoadingState } from "@/components/ui/states";
import {
  ArrowLeft,
  Plus,
  Layers,
  Edit,
  AlertCircle,
} from "lucide-react";

export default function FloorsPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingFloor, setEditingFloor] = React.useState<Floor | null>(null);

  const [name, setName] = React.useState("");
  const [floorNumber, setFloorNumber] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("0");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const activePropertyId = currentProperty?.property_id;

  const loadFloors = React.useCallback(async () => {
    if (!activePropertyId) return;
    setLoading(true);
    try {
      const data = await fetchFloors(supabase, activePropertyId);
      setFloors(data);
    } catch (err) {
      console.error("Error loading floors:", err);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && activePropertyId) {
      void Promise.resolve().then(() => {
        if (isMounted) loadFloors();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadFloors]);

  const openCreateModal = () => {
    setEditingFloor(null);
    setName("");
    setFloorNumber("");
    setDescription("");
    setSortOrder((floors.length + 1).toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (f: Floor) => {
    setEditingFloor(f);
    setName(f.name);
    setFloorNumber(f.floor_number !== null ? f.floor_number.toString() : "");
    setDescription(f.description || "");
    setSortOrder(f.sort_order.toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePropertyId) return;

    if (!name.trim()) {
      setFormError("Floor name is required.");
      return;
    }

    const sortNum = parseInt(sortOrder, 10);
    const flNum = floorNumber.trim() ? parseInt(floorNumber, 10) : null;

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingFloor) {
        const res = await updateFloorAction(activePropertyId, editingFloor.id, {
          name: name.trim(),
          floor_number: flNum,
          description: description.trim() || null,
          sort_order: isNaN(sortNum) ? 0 : sortNum,
        });

        if (res.success) {
          setIsModalOpen(false);
          loadFloors();
        } else {
          setFormError(res.error || "Failed to update floor.");
        }
      } else {
        const res = await createFloorAction(activePropertyId, {
          name: name.trim(),
          floor_number: flNum,
          description: description.trim() || null,
          sort_order: isNaN(sortNum) ? 0 : sortNum,
        });

        if (res.success) {
          setIsModalOpen(false);
          loadFloors();
        } else {
          setFormError(res.error || "Failed to create floor.");
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      setFormError("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingState message="Loading floors..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Floors & Levels"
        description="Organize your property structure into physical levels for floor-plan views and housekeeping routing."
        breadcrumbs={[
          { label: "Operations", href: "/rooms" },
          { label: "Rooms", href: "/rooms" },
          { label: "Floors" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/rooms">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Rooms
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={openCreateModal} className="shadow-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Floor
            </Button>
          </div>
        }
      />

      {/* Floors List Table */}
      {floors.length === 0 ? (
        <div className="stayhub-card p-10">
          <EmptyState
            icon={<Layers className="h-10 w-10 text-[var(--foreground-subtle)]" />}
            title="No floors configured yet"
            description="Add building levels (e.g. Ground Floor, 1st Floor, Rooftop) to organize your room layout."
            action={{
              label: "Add First Floor",
              onClick: openCreateModal,
            }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[12px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Display Order</th>
                <th className="py-3 px-4">Floor Name</th>
                <th className="py-3 px-4">Floor Number</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Rooms Attached</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {floors.map((floor) => (
                <tr key={floor.id} className="hover:bg-[var(--secondary)]/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[var(--foreground-muted)]">
                    #{floor.sort_order}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[var(--foreground)]">
                    {floor.name}
                  </td>
                  <td className="py-3.5 px-4 text-[var(--foreground-muted)] font-mono text-xs">
                    {floor.floor_number !== null ? `Level ${floor.floor_number}` : "---"}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[var(--foreground-muted)] max-w-xs truncate">
                    {floor.description || "---"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-[var(--primary)] border border-indigo-200">
                      {floor.room_count || 0} Rooms
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(floor)}
                      className="h-8 text-xs"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Floor Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFloor ? `Edit Floor: ${editingFloor.name}` : "Create New Floor"}
        description="Configure building level name, numeric identifier, and sorting index."
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Floor Display Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Ground Floor, 1st Floor, Penthouse Level"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Floor Numeric Value (Optional)
              </label>
              <Input
                type="number"
                placeholder="e.g. 0, 1, 2"
                value={floorNumber}
                onChange={(e) => setFloorNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Sort / Display Order
              </label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Description / Location Notes
            </label>
            <Textarea
              placeholder="e.g. West wing beachfront access..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingFloor ? "Update Floor" : "Create Floor"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
