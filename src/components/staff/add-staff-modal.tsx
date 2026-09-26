"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StaffDepartment, EmploymentType } from "@/lib/staff/types";
import { createStaffMemberAction } from "@/lib/staff/actions";
import { Loader2 } from "lucide-react";

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  departments: StaffDepartment[];
  onSuccess: () => void;
}

export function AddStaffModal({
  isOpen,
  onClose,
  propertyId,
  departments,
  onSuccess,
}: AddStaffModalProps) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [employeeCode, setEmployeeCode] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>("FULL_TIME");
  const [notes, setNotes] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createStaffMemberAction(propertyId, {
      property_id: propertyId,
      first_name: firstName,
      last_name: lastName,
      employee_code: employeeCode.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      department_id: departmentId || undefined,
      designation: designation.trim() || undefined,
      employment_type: employmentType,
      notes: notes.trim() || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to add employee.");
      return;
    }

    // Reset and close
    setFirstName("");
    setLastName("");
    setEmployeeCode("");
    setEmail("");
    setPhone("");
    setDepartmentId("");
    setDesignation("");
    setNotes("");
    onSuccess();
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Add New Staff Member">
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
              placeholder="e.g. Liam"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Last Name *</label>
            <Input
              required
              placeholder="e.g. Vance"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Employee ID / Code</label>
            <Input
              placeholder="e.g. EMP-104 (Auto if blank)"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Designation / Title</label>
            <Input
              placeholder="e.g. Front Desk Lead"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Email Address</label>
            <Input
              type="email"
              placeholder="liam@hotel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Phone Number</label>
            <Input
              placeholder="+91-832-555-0112"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Operational Notes</label>
          <Input
            placeholder="Special skills, certifications, shift availability..."
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
            Register Staff Member
          </Button>
        </div>
      </form>
    </Modal>
  );
}
