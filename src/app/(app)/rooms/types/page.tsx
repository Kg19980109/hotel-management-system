"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { fetchRoomTypes } from "@/lib/rooms/queries";
import { createRoomTypeAction, updateRoomTypeAction } from "@/lib/rooms/actions";
import type { RoomType } from "@/lib/rooms/types";
import { formatCurrency } from "@/lib/dashboard/formatters";
import { PageHeader } from "@/components/shared/page-header";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState, LoadingState } from "@/components/ui/states";
import {
  ArrowLeft,
  Plus,
  BedDouble,
  Edit,
  Users,
  Maximize2,
  AlertCircle,
} from "lucide-react";

export default function RoomTypesPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [types, setTypes] = React.useState<RoomType[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingType, setEditingType] = React.useState<RoomType | null>(null);

  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [baseRate, setBaseRate] = React.useState("");
  const [maxOccupancy, setMaxOccupancy] = React.useState("2");
  const [bedConfig, setBedConfig] = React.useState("");
  const [sizeSqft, setSizeSqft] = React.useState("");
  const [amenitiesInput, setAmenitiesInput] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const activePropertyId = currentProperty?.property_id;
  const currency = currentProperty?.currency || "INR";

  const loadTypes = React.useCallback(async () => {
    if (!activePropertyId) return;
    setLoading(true);
    try {
      const data = await fetchRoomTypes(supabase, activePropertyId);
      setTypes(data);
    } catch (err) {
      console.error("Error loading room types:", err);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && activePropertyId) {
      void Promise.resolve().then(() => {
        if (isMounted) loadTypes();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadTypes]);

  const openCreateModal = () => {
    setEditingType(null);
    setName("");
    setCode("");
    setDescription("");
    setBaseRate("");
    setMaxOccupancy("2");
    setBedConfig("");
    setSizeSqft("");
    setAmenitiesInput("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: RoomType) => {
    setEditingType(t);
    setName(t.name);
    setCode(t.code);
    setDescription(t.description || "");
    setBaseRate(t.base_rate.toString());
    setMaxOccupancy(t.max_occupancy.toString());
    setBedConfig(t.bed_configuration || "");
    setSizeSqft(t.size_sqft ? t.size_sqft.toString() : "");
    setAmenitiesInput(t.amenities.join(", "));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePropertyId) return;

    if (!name.trim() || !code.trim()) {
      setFormError("Name and Code are required.");
      return;
    }

    const rateNum = parseFloat(baseRate);
    if (isNaN(rateNum) || rateNum < 0) {
      setFormError("Please enter a valid base rate.");
      return;
    }

    const occNum = parseInt(maxOccupancy, 10);
    if (isNaN(occNum) || occNum <= 0) {
      setFormError("Max occupancy must be at least 1.");
      return;
    }

    const amenitiesList = amenitiesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingType) {
        const res = await updateRoomTypeAction(activePropertyId, editingType.id, {
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || null,
          base_rate: rateNum,
          max_occupancy: occNum,
          bed_configuration: bedConfig.trim() || null,
          size_sqft: sizeSqft ? parseFloat(sizeSqft) : null,
          amenities: amenitiesList,
        });

        if (res.success) {
          setIsModalOpen(false);
          loadTypes();
        } else {
          setFormError(res.error || "Failed to update room type.");
        }
      } else {
        const res = await createRoomTypeAction(activePropertyId, {
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || null,
          base_rate: rateNum,
          currency,
          max_occupancy: occNum,
          bed_configuration: bedConfig.trim() || null,
          size_sqft: sizeSqft ? parseFloat(sizeSqft) : null,
          amenities: amenitiesList,
        });

        if (res.success) {
          setIsModalOpen(false);
          loadTypes();
        } else {
          setFormError(res.error || "Failed to create room type.");
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
    return <LoadingState message="Loading room categories..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Room Types & Categories"
        description="Define standard room classes, default rack rates, occupancy limits, and amenities."
        breadcrumbs={[
          { label: "Operations", href: "/rooms" },
          { label: "Rooms", href: "/rooms" },
          { label: "Room Types" },
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
              Add Room Type
            </Button>
          </div>
        }
      />

      {/* Grid of Room Types */}
      {types.length === 0 ? (
        <div className="stayhub-card p-10">
          <EmptyState
            icon={<BedDouble className="h-10 w-10 text-[var(--foreground-subtle)]" />}
            title="No room types configured yet"
            description="Create categories such as Standard King, Deluxe Suite, or Ocean Villa to organize room inventory."
            action={{
              label: "Create First Room Type",
              onClick: openCreateModal,
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {types.map((type) => (
            <div key={type.id} className="stayhub-card p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-[var(--primary)] border border-indigo-200">
                    {type.code}
                  </span>
                  <span className="text-xs text-[var(--foreground-muted)]">
                    {type.room_count || 0} active room{type.room_count === 1 ? "" : "s"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[var(--foreground)]">{type.name}</h3>

                {type.description && (
                  <p className="text-xs text-[var(--foreground-muted)] mt-1 line-clamp-2 leading-relaxed">
                    {type.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[var(--border)] text-xs">
                  <div>
                    <span className="text-[11px] text-[var(--foreground-muted)] block">Base Rate</span>
                    <span className="font-bold text-sm text-[var(--foreground)]">
                      {formatCurrency(type.base_rate, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--foreground-muted)] block">Max Capacity</span>
                    <span className="font-semibold text-[var(--foreground)] flex items-center gap-1">
                      <Users className="h-3 w-3 text-[var(--foreground-subtle)]" />
                      {type.max_occupancy} Guests
                    </span>
                  </div>
                </div>

                {type.bed_configuration && (
                  <p className="text-xs text-[var(--foreground-muted)] mt-2 flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5 text-[var(--primary)]" />
                    {type.bed_configuration}
                  </p>
                )}

                {type.size_sqft && (
                  <p className="text-xs text-[var(--foreground-muted)] mt-1 flex items-center gap-1">
                    <Maximize2 className="h-3 w-3 text-[var(--foreground-subtle)]" />
                    {type.size_sqft} sq ft
                  </p>
                )}

                {type.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {type.amenities.slice(0, 4).map((a, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)]"
                      >
                        {a}
                      </span>
                    ))}
                    {type.amenities.length > 4 && (
                      <span className="text-[10px] text-[var(--foreground-subtle)] self-center">
                        +{type.amenities.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--border)] mt-4 flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditModal(type)}
                  className="w-full text-xs"
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Edit Category
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Room Type Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingType ? `Edit Room Type: ${editingType.name}` : "Create New Room Type"}
        description="Set standard category parameters, rack pricing, and features."
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Deluxe King"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Unique Code <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. DLX-K"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Base Nightly Rate ({currency}) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 4500"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Max Guests <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={maxOccupancy}
                onChange={(e) => setMaxOccupancy(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Bed Configuration
              </label>
              <Input
                placeholder="e.g. 1 King Bed, 2 Single Beds"
                value={bedConfig}
                onChange={(e) => setBedConfig(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Room Size (sq ft)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 350"
                value={sizeSqft}
                onChange={(e) => setSizeSqft(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Description
            </label>
            <Textarea
              placeholder="Marketing description of room highlights..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Amenities (comma separated)
            </label>
            <Input
              placeholder="WiFi, AC, Balcony, Mini Bar, Smart TV"
              value={amenitiesInput}
              onChange={(e) => setAmenitiesInput(e.target.value)}
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
              {isSubmitting ? "Saving..." : editingType ? "Update Type" : "Create Type"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
