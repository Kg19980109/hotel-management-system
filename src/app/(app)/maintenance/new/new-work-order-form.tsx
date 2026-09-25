"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createWorkOrderAction } from "@/lib/maintenance/actions";
import {
  MaintenanceCategory,
  MaintenancePriority,
  CreateWorkOrderInput,
} from "@/lib/maintenance/types";
import { StaffOption } from "@/lib/maintenance/queries";
import { Wrench } from "lucide-react";

interface RoomOption {
  id: string;
  room_number: string;
  room_type?: { name: string } | null;
}

interface NewWorkOrderFormProps {
  propertyId: string;
  rooms: RoomOption[];
  staff: StaffOption[];
}

const CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: "PLUMBING", label: "Plumbing (Leaks, Drains, Pipes)" },
  { value: "ELECTRICAL", label: "Electrical (Wiring, Sockets, Power)" },
  { value: "HVAC", label: "HVAC (AC, Heating, Ventilation)" },
  { value: "APPLIANCE", label: "Appliance (Fridge, Kettle, Microwave)" },
  { value: "FURNITURE", label: "Furniture (Beds, Chairs, Wardrobes)" },
  { value: "LIGHTING", label: "Lighting (Bulbs, Fixtures, Switches)" },
  { value: "DOOR_LOCK", label: "Door / Locks (Keycards, Handles, Latches)" },
  { value: "TV", label: "TV & Entertainment (Display, Remote, Cable)" },
  { value: "WIFI_NETWORK", label: "Wi-Fi & Network (Access Point, Router)" },
  { value: "CIVIL", label: "Civil / Structure (Tiles, Paint, Glass)" },
  { value: "SAFETY", label: "Safety & Security (Fire Alarm, Smoke Detector)" },
  { value: "OTHER", label: "Other Facilities" },
];

export function NewWorkOrderForm({ propertyId, rooms, staff }: NewWorkOrderFormProps) {
  const router = useRouter();
  const { success, error } = useToast();

  const [roomId, setRoomId] = React.useState<string>("");
  const [title, setTitle] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [category, setCategory] = React.useState<MaintenanceCategory>("HVAC");
  const [priority, setPriority] = React.useState<MaintenancePriority>("NORMAL");
  const [assignedTo, setAssignedTo] = React.useState<string>("");
  const [scheduledFor, setScheduledFor] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      error("Validation Error", "Please enter a work order title or summary.");
      return;
    }

    setLoading(true);
    try {
      const input: CreateWorkOrderInput = {
        propertyId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        roomId: roomId || null,
        assignedTo: assignedTo || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      };

      const result = await createWorkOrderAction(input);
      if (!result.success) {
        error("Failed to Create Work Order", result.error || "An unexpected error occurred.");
        return;
      }

      success("Work Order Created", `Work order "${title}" created successfully.`);

      router.push(`/maintenance/${result.data?.workOrderId}`);
    } catch {
      error("Error", "Failed to submit work order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 md:p-8 bg-white border border-[var(--border)] shadow-xs">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
            Work Order Title <span className="text-rose-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Master bathroom faucet leaking continuously, AC not cooling in room"
            required
          />
          <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
            Provide a clear, brief summary of the maintenance defect or repair required.
          </p>
        </div>

        {/* Room / Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
              Room / Location
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            >
              <option value="">Property-Wide Area (Lobby, Hallway, Central Facility)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} {r.room_type ? `(${r.room_type.name})` : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
              Select a room or leave blank for central facilities (e.g. elevator, lobby, pool).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority & Assignment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
              Priority <span className="text-rose-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            >
              <option value="LOW">Low (Cosmetic / Non-disruptive defect)</option>
              <option value="NORMAL">Normal (Standard repair ticket)</option>
              <option value="HIGH">High (Affects guest stay / significant issue)</option>
              <option value="URGENT">Urgent (Safety hazard, major leak, electrical risk)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
              Assign Technician
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            >
              <option value="">Unassigned (Leave Open in Queue)</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.role.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scheduled Due Date */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
            Scheduled Due Date / Time
          </label>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
          />
          <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
            Optional SLA target or scheduled repair visit time.
          </p>
        </div>

        {/* Detailed Description */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
            Detailed Description & Symptoms
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Provide context, observed symptoms, or special access instructions..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            <Wrench className="h-4 w-4 mr-1.5" />
            Create Work Order
          </Button>
        </div>
      </form>
    </Card>
  );
}
