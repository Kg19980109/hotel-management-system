"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
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

interface NewWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  rooms: RoomOption[];
  staff: StaffOption[];
  preselectedRoomId?: string;
  onSuccess?: () => void;
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

export function NewWorkOrderModal(props: NewWorkOrderModalProps) {
  if (!props.isOpen) return null;
  return <NewWorkOrderModalInner key={props.preselectedRoomId || "new-wo"} {...props} />;
}

function NewWorkOrderModalInner({
  isOpen,
  onClose,
  propertyId,
  rooms,
  staff,
  preselectedRoomId,
  onSuccess,
}: NewWorkOrderModalProps) {
  const { success, error } = useToast();
  const [roomId, setRoomId] = React.useState<string>(preselectedRoomId || "");
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

      // Reset form
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setScheduledFor("");
      onClose();
      if (onSuccess) onSuccess();
    } catch {
      error("Error", "Failed to submit work order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Report Maintenance Work Order"
      description="Create a maintenance work order for a room, facility, or public area."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Work Order Title <span className="text-rose-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. AC leaking water, Bathroom faucet loose, TV not powering on"
            required
          />
        </div>

        {/* Room / Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
              Room / Location
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            >
              <option value="">Property-Wide Area (Lobby, Hallway, etc.)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} {r.room_type ? `(${r.room_type.name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
              Priority <span className="text-rose-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            >
              <option value="LOW">Low (Cosmetic / Minor repair)</option>
              <option value="NORMAL">Normal (Standard work order)</option>
              <option value="HIGH">High (Affects guest comfort)</option>
              <option value="URGENT">Urgent (Safety / Leak / Electrical / Critical)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
              Assign Technician
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            >
              <option value="">Unassigned (Leave Open)</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.role.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scheduled date */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Scheduled Due Date / Time
          </label>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
          />
        </div>

        {/* Description / Notes */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Detailed Description & Symptoms
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe what is wrong, what noise/leak is observed, or special access instructions..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Wrench className="h-4 w-4 mr-1.5" />
            Create Work Order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
