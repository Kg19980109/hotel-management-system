"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StaffGuestServiceRequest } from "@/lib/guest-services/types";
import { staffAssignGuestRequestAction } from "@/lib/guest-services/actions";
import { UserCheck, Loader2, Filter } from "lucide-react";

export interface AssignableStaffMember {
  id: string;
  full_name: string;
  email?: string;
  department_code?: string;
  department_name?: string;
  designation?: string;
}

interface AssignRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: StaffGuestServiceRequest;
  propertyId: string;
  staffMembers: AssignableStaffMember[];
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
  { value: "RESTAURANT", label: "Restaurant / F&B" },
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
  const [showAllStaff, setShowAllStaff] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filter out any synthetic/mock test users
  const cleanStaff = React.useMemo(() => {
    return staffMembers.filter((s) => {
      const name = (s.full_name || "").toLowerCase();
      const email = (s.email || "").toLowerCase();
      if (name.startsWith("billing-") || name.startsWith("test-") || email.startsWith("billing-") || email.startsWith("test-")) {
        return false;
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(name) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(email)) {
        return false;
      }
      return true;
    });
  }, [staffMembers]);

  // Filter by selected department if active and not showing all
  const displayedStaff = React.useMemo(() => {
    if (!department || showAllStaff) return cleanStaff;

    const deptUpper = department.toUpperCase();
    const filtered = cleanStaff.filter((s) => {
      const sDeptCode = (s.department_code || "").toUpperCase();
      const sDeptName = (s.department_name || "").toUpperCase();
      return (
        sDeptCode === deptUpper ||
        sDeptName === deptUpper ||
        (deptUpper === "HOUSEKEEPING" && (sDeptCode.includes("HK") || sDeptName.includes("HOUSEKEEP"))) ||
        (deptUpper === "MAINTENANCE" && (sDeptCode.includes("MAINT") || sDeptCode.includes("ENG") || sDeptName.includes("ENG"))) ||
        (deptUpper === "FRONT_DESK" && (sDeptCode.includes("FD") || sDeptName.includes("FRONT")))
      );
    });

    // If no staff match the department, fallback to showing all so the user is not stuck
    if (filtered.length === 0) {
      return cleanStaff;
    }
    return filtered;
  }, [cleanStaff, department, showAllStaff]);

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
        <div className="p-3 bg-slate-50 border border-[var(--border)] rounded-[var(--radius-md)] text-sm space-y-1">
          <p className="font-semibold text-[var(--foreground)]">{request.title}</p>
          <p className="text-xs text-[var(--foreground-muted)]">
            Room {request.room?.room_number} • Category: {request.category}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
            Target Department
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="stayhub-input-base h-10 text-sm"
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
              Assign Staff Member
            </label>
            {department && cleanStaff.length > displayedStaff.length && (
              <button
                type="button"
                onClick={() => setShowAllStaff(!showAllStaff)}
                className="text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
              >
                <Filter className="w-3 h-3" />
                {showAllStaff ? "Filter by Department" : `Show all staff (${cleanStaff.length})`}
              </button>
            )}
          </div>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="stayhub-input-base h-10 text-sm"
          >
            <option value="UNASSIGNED">-- Unassigned (Department Only) --</option>
            {displayedStaff.map((s) => {
              const designationStr = s.designation ? ` (${s.designation})` : s.department_name ? ` (${s.department_name})` : "";
              return (
                <option key={s.id} value={s.id}>
                  {s.full_name}{designationStr}
                </option>
              );
            })}
          </select>
          {department && !showAllStaff && displayedStaff.length > 0 && displayedStaff.length < cleanStaff.length && (
            <p className="text-[11px] text-slate-500 mt-1">
              Showing {displayedStaff.length} staff members in {department.replace("_", " ")}.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
            Assignment Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal instruction or notes for assigned staff..."
            className="stayhub-input-base resize-none text-sm"
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
