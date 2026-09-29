"use client";

// ============================================================
// STAYHUB STAFF ACCESS CONTROL & ROLE ASSIGNMENT MODAL
// ============================================================

import * as React from "react";
import {
  Shield,
  KeyRound,
  Building2,
  Briefcase,
  Users,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
  Lock,
} from "lucide-react";
import { StaffMember, StaffRole } from "@/lib/staff/types";
import { updateStaffRoleAction } from "@/lib/staff/actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

interface ManageAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  propertyId: string;
  roles: StaffRole[];
  onRoleUpdated: () => void;
  onOpenPermissionMatrix: (roleCode: string) => void;
}

export function ManageAccessModal({
  isOpen,
  onClose,
  staff,
  propertyId,
  roles,
  onRoleUpdated,
  onOpenPermissionMatrix,
}: ManageAccessModalProps) {
  const { currentRole: userRole } = useAuth();
  const { success, error: toastError } = useToast();

  const isManager =
    userRole === "SUPER_ADMIN" ||
    userRole === "HOTEL_OWNER" ||
    userRole === "GENERAL_MANAGER";

  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (staff && staff.assigned_role) {
      setSelectedRoleId(staff.assigned_role.id);
    } else if (staff && roles.length > 0) {
      // Default to first matching or front desk
      const defaultRole = roles.find((r) => r.code === "FRONT_DESK") || roles[0];
      setSelectedRoleId(defaultRole.id);
    }
  }, [staff, roles]);

  if (!staff) return null;

  const currentRole = roles.find((r) => r.id === selectedRoleId) || staff.assigned_role;

  const handleSaveRole = async () => {
    if (!selectedRoleId || !isManager) return;

    try {
      setSaving(true);
      const res = await updateStaffRoleAction(propertyId, staff.id, selectedRoleId);
      if (res.success) {
        success(
          "Staff Role Assigned",
          `${staff.first_name} ${staff.last_name} has been assigned the ${currentRole?.name || "selected"} role.`
        );
        onRoleUpdated();
        onClose();
      } else {
        toastError("Role Assignment Failed", res.error || "Could not update staff role.");
      }
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "Failed to assign role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Staff Access Control & Role Assignment"
      description={`Manage operational privileges and system role for ${staff.first_name} ${staff.last_name}.`}
      size="lg"
    >
      <div className="space-y-5 py-2">
        {/* Staff Profile Overview Card */}
        <div className="p-4 rounded-2xl bg-muted/30 border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center font-black text-base shadow-sm">
              {staff.first_name[0]}
              {staff.last_name[0]}
            </div>
            <div>
              <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                <span>{staff.first_name} {staff.last_name}</span>
                <Badge variant={staff.is_active ? "success" : "default"} className="text-[10px]">
                  {staff.is_active ? "Active" : "Inactive"}
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{staff.designation || "Staff Member"}</span>
                <span>•</span>
                <span>{staff.department?.name || "General Department"}</span>
                <span>•</span>
                <code className="text-muted-foreground font-mono font-bold">{staff.employee_code}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Role Selector Form */}
        <div className="space-y-3">
          <label htmlFor="staff-role-select" className="text-xs font-black text-foreground uppercase tracking-wider block">
            Assigned System Role
          </label>
          <select
            id="staff-role-select"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            disabled={!isManager || saving}
            className="w-full h-11 px-3.5 rounded-xl border bg-card text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code}) — {r.description || r.code}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Changing this role updates the employee's authorization perimeter across front desk, housekeeping, maintenance, KDS, and billing modules.
          </p>
        </div>

        {/* Current Role Details & Permission Matrix Link */}
        {currentRole && (
          <div className="p-4.5 rounded-2xl border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-foreground">
                  Active Security Capabilities for <span className="font-black">{currentRole.name}</span>
                </span>
              </div>
              <Badge variant="warning" className="text-[10px] font-mono">
                {currentRole.code}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {currentRole.description || "Grants property-specific operational capabilities based on RBAC matrix."}
            </p>

            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Need to fine-tune individual actions?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPermissionMatrix(currentRole.code);
                }}
                className="text-xs font-black text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Customize in Permissions Matrix</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="text-xs font-bold"
          >
            Cancel
          </Button>
          {isManager && (
            <Button
              type="button"
              onClick={handleSaveRole}
              disabled={saving}
              className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <span>{saving ? "Saving..." : "Save Role Assignment"}</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
