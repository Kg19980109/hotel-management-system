"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StaffGuestServiceRequest } from "@/lib/guest-services/types";
import { staffAssignGuestRequestAction } from "@/lib/guest-services/actions";
import { UserCheck, Loader2 } from "lucide-react";

interface AssignRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: StaffGuestServiceRequest;
  propertyId: string;
  staffMembers: { id: string; full_name: string; email: string }[];
  onAssigned: () => void;
}

const DEPARTMENTS = [
  { value: "HOUSEKEEPING", label: "Housekeeping" },
  { value: "FRONT_DESK", label: "Front Desk" },
  { value: "CONCIERGE", label: "Concierge" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "LAUNDRY", label: "Laundry" },
  { value: "SPA", label: "Spa" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "OTHER", label: "Other" },
];

export function AssignRequestModal({
  isOpen,
  onClose,
  request,
  propertyId,
  staffMembers,
  onAssigned,
}: AssignRequestModalProps) {
  const [assignedTo, setAssignedTo] = React.useState<string>(request.assigned_to || "");
  const [department, setDepartment] = React.useState<string>(
    request.assigned_department || request.category || ""
  );
  const [notes, setNotes] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleAssign = async () => {
    setLoading(true);
    setError(null);

    const res = await staffAssignGuestRequestAction(
      propertyId,
      request.id,
      assignedTo === "UNASSIGNED" ? undefined : assignedTo || undefined,
      department || undefined,
      notes || undefined
    );

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to assign request.");
      return;
    }

    onAssigned();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Assign Guest Request"
      description={`Assign request for "${request.title}" (Room ${request.room?.room_number || "N/A"}).`}
      size="md"
    >
      <div className="space-y-4 pt-2">
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-lg text-sm space-y-1">
          <p className="font-semibold text-[var(--foreground)]">{request.title}</p>
          <p className="text-xs text-[var(--foreground-muted)]">
            Room {request.room?.room_number} • Category: {request.category}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Target Department
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
          >
            <option value="">Select Department...</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept.value} value={dept.value}>
                {dept.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Assign Staff Member
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
          >
            <option value="UNASSIGNED">-- Unassigned (Department Only) --</option>
            {staffMembers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Assignment Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal instruction or notes for assigned staff..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)] resize-none"
          />
        </div>

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAssign}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-500 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <UserCheck className="w-4 h-4 mr-1.5" />}
            Confirm Assignment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
