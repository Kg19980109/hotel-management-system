"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StaffMember, StaffDepartment, EmploymentType, EmploymentStatus } from "@/lib/staff/types";
import { updateStaffMemberAction } from "@/lib/staff/actions";
import { Loader2 } from "lucide-react";

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember;
  propertyId: string;
  departments: StaffDepartment[];
  onSuccess: () => void;
}

export function EditStaffModal({
  isOpen,
  onClose,
  staff,
  propertyId,
  departments,
  onSuccess,
}: EditStaffModalProps) {
  const [firstName, setFirstName] = React.useState(staff.first_name);
  const [lastName, setLastName] = React.useState(staff.last_name);
  const [email, setEmail] = React.useState(staff.email || "");
  const [phone, setPhone] = React.useState(staff.phone || "");
  const [departmentId, setDepartmentId] = React.useState(staff.department_id || "");
  const [designation, setDesignation] = React.useState(staff.designation || "");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>(staff.employment_type || "FULL_TIME");
  const [employmentStatus, setEmploymentStatus] = React.useState<EmploymentStatus>(staff.employment_status || "ACTIVE");
  const [notes, setNotes] = React.useState(staff.notes || "");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFirstName(staff.first_name);
    setLastName(staff.last_name);
    setEmail(staff.email || "");
    setPhone(staff.phone || "");
    setDepartmentId(staff.department_id || "");
    setDesignation(staff.designation || "");
    setEmploymentType(staff.employment_type || "FULL_TIME");
    setEmploymentStatus(staff.employment_status || "ACTIVE");
    setNotes(staff.notes || "");
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await updateStaffMemberAction(propertyId, staff.id, {
      first_name: firstName,
      last_name: lastName,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      department_id: departmentId || undefined,
      designation: designation.trim() || undefined,
      employment_type: employmentType,
      employment_status: employmentStatus,
      notes: notes.trim() || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to update employee.");
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={`Edit Staff: ${staff.employee_code}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">First Name *</label>
            <Input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Last Name *</label>
            <Input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Designation / Title</label>
            <Input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
            >
              <option value="">Select Department...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.department_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Employment Type</label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contractor</option>
              <option value="SEASONAL">Seasonal</option>
              <option value="INTERN">Intern</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Employment Status</label>
            <select
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
            >
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Operational Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
