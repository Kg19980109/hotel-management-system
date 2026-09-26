"use client";

import * as React from "react";
import {
  Users,
  UserCheck,
  Building2,
  Shield,
  Search,
  Plus,
  Edit2,
  Phone,
  Mail,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Briefcase,
} from "lucide-react";
import { StaffMember, StaffDepartment } from "@/lib/staff/types";
import { toggleStaffActiveAction } from "@/lib/staff/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddStaffModal } from "./add-staff-modal";
import { EditStaffModal } from "./edit-staff-modal";
import { RolePermissionMatrix } from "./role-permission-matrix";

interface StaffDirectoryViewProps {
  propertyId: string;
  propertyName?: string;
  initialStaff: StaffMember[];
  departments: StaffDepartment[];
  onRefresh: () => void;
}

export function StaffDirectoryView({
  propertyId,
  initialStaff,
  departments,
  onRefresh,
}: StaffDirectoryViewProps) {
  const [activeTab, setActiveTab] = React.useState<"directory" | "roles" | "departments">("directory");
  const [search, setSearch] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState("ALL");

  // Modals
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  // Filters
  const filteredStaff = React.useMemo(() => {
    return initialStaff.filter((s) => {
      if (selectedDept !== "ALL" && s.department_id !== selectedDept) return false;
      if (selectedStatus === "ACTIVE" && !s.is_active) return false;
      if (selectedStatus === "INACTIVE" && s.is_active) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
        const code = (s.employee_code || "").toLowerCase();
        const desig = (s.designation || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        if (
          !fullName.includes(q) &&
          !code.includes(q) &&
          !desig.includes(q) &&
          !email.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [initialStaff, selectedDept, selectedStatus, search]);

  // KPIs
  const totalStaff = initialStaff.length;
  const activeStaff = initialStaff.filter((s) => s.is_active).length;
  const onLeaveStaff = initialStaff.filter((s) => !s.is_active || s.employment_status === "ON_LEAVE").length;
  const totalDepts = departments.length;

  const handleToggleActive = async (staff: StaffMember) => {
    setTogglingId(staff.id);
    await toggleStaffActiveAction(propertyId, staff.id, staff.is_active);
    setTogglingId(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* 1. Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Total Staff
            </p>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-black">{totalStaff}</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-emerald-500/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">
              Active / On Duty
            </p>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeStaff}</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-amber-500/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-500 uppercase font-bold tracking-wider">
              On Leave / Inactive
            </p>
            <Briefcase className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500">{onLeaveStaff}</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-blue-500/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-500 uppercase font-bold tracking-wider">
              Departments
            </p>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-500">{totalDepts}</p>
        </div>
      </div>

      {/* 2. Primary Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)]">
        <div className="flex gap-6 text-sm">
          <button
            onClick={() => setActiveTab("directory")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "directory"
                ? "border-amber-500 text-amber-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            Staff Directory ({filteredStaff.length})
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "roles"
                ? "border-amber-500 text-amber-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="w-4 h-4" />
            Roles & Permissions Matrix
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "departments"
                ? "border-amber-500 text-amber-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Departments ({departments.length})
          </button>
        </div>

        {activeTab === "directory" && (
          <div className="pb-2">
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Staff Member
            </Button>
          </div>
        )}
      </div>

      {/* 3. TAB 1: Staff Directory */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-xl bg-card border shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff name, code, designation..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center justify-end">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-10 px-3 rounded-lg border border-[var(--border)] bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.department_code})
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-10 px-3 rounded-lg border border-[var(--border)] bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive / On Leave</option>
              </select>

              <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh Staff">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Staff Table */}
          {filteredStaff.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-card border border-dashed space-y-2">
              <Users className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold">No staff members found</h3>
              <p className="text-xs text-muted-foreground">
                Try modifying your search or department filter.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b text-muted-foreground uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-muted/30 transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-black flex items-center justify-center text-xs">
                              {staff.first_name[0]}
                              {staff.last_name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">
                                {staff.first_name} {staff.last_name}
                              </p>
                              {staff.notes && (
                                <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs">
                                  {staff.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <code className="text-amber-600 dark:text-amber-400 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/20">
                            {staff.employee_code}
                          </code>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {staff.department ? (
                            <Badge variant="default" className="text-[11px] font-semibold">
                              {staff.department.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                          {staff.designation || "Staff"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap space-y-0.5">
                          {staff.email && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <Mail className="w-3 h-3" />
                              <span>{staff.email}</span>
                            </div>
                          )}
                          {staff.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <Phone className="w-3 h-3" />
                              <span>{staff.phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-[11px] text-muted-foreground">
                            {staff.employment_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(staff)}
                            disabled={togglingId === staff.id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition border ${
                              staff.is_active
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20"
                            }`}
                            title="Click to toggle active status"
                          >
                            {staff.is_active ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" /> Inactive
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setEditingStaff(staff)}
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: Roles & Permissions Matrix */}
      {activeTab === "roles" && <RolePermissionMatrix />}

      {/* 5. TAB 3: Departments */}
      {activeTab === "departments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const memberCount = initialStaff.filter((s) => s.department_id === dept.id).length;
            return (
              <div
                key={dept.id}
                className="p-5 rounded-xl border bg-card shadow-sm space-y-3 hover:border-amber-500/30 transition"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="warning" className="font-mono font-bold">
                    {dept.department_code}
                  </Badge>
                  <Badge variant={dept.is_active ? "success" : "default"}>
                    {dept.is_active ? "Active" : "Archived"}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-bold text-base">{dept.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {dept.description || "Operational hotel department"}
                  </p>
                </div>
                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Assigned Staff:</span>
                  <span className="font-bold text-foreground">{memberCount} Employees</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddStaffModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        propertyId={propertyId}
        departments={departments}
        onSuccess={onRefresh}
      />

      {editingStaff && (
        <EditStaffModal
          isOpen={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          staff={editingStaff}
          propertyId={propertyId}
          departments={departments}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
