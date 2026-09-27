"use client";

// ============================================================
// STAYHUB EXECUTIVE STAFF & ROLE MANAGEMENT VIEW
// Complete Staff Directory, Credentials Console, RBAC Matrix & Department Hub
// ============================================================

import * as React from "react";
import { useState, useMemo } from "react";
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
  KeyRound,
  LayoutGrid,
  List,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
  Filter,
  X,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { StaffMember, StaffDepartment } from "@/lib/staff/types";
import { toggleStaffActiveAction } from "@/lib/staff/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { AddStaffModal } from "./add-staff-modal";
import { EditStaffModal } from "./edit-staff-modal";
import { RolePermissionMatrix } from "./role-permission-matrix";
import { StaffCredentialsView } from "./staff-credentials-view";
import { cn } from "@/lib/utils";

interface StaffDirectoryViewProps {
  propertyId: string;
  propertyName?: string;
  initialStaff: StaffMember[];
  departments: StaffDepartment[];
  onRefresh: () => void;
}

export function StaffDirectoryView({
  propertyId,
  propertyName = "Grand Azure Resort & Spa",
  initialStaff,
  departments,
  onRefresh,
}: StaffDirectoryViewProps) {
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<"directory" | "credentials" | "roles" | "departments">("directory");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");

  // Modals & Actions
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const filteredStaff = useMemo(() => {
    return initialStaff.filter((s) => {
      if (selectedDept !== "ALL" && s.department_id !== selectedDept) return false;
      if (selectedStatus === "ACTIVE" && !s.is_active) return false;
      if (selectedStatus === "INACTIVE" && s.is_active) return false;
      if (selectedType !== "ALL" && s.employment_type !== selectedType) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
        const code = (s.employee_code || "").toLowerCase();
        const desig = (s.designation || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const dept = (s.department?.name || "").toLowerCase();
        if (
          !fullName.includes(q) &&
          !code.includes(q) &&
          !desig.includes(q) &&
          !email.includes(q) &&
          !dept.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [initialStaff, selectedDept, selectedStatus, selectedType, search]);

  // KPIs
  const totalStaff = initialStaff.length;
  const activeStaff = initialStaff.filter((s) => s.is_active).length;
  const onLeaveStaff = initialStaff.filter((s) => !s.is_active || s.employment_status === "ON_LEAVE").length;
  const totalDepts = departments.length;

  const handleToggleActive = async (staff: StaffMember) => {
    try {
      setTogglingId(staff.id);
      const res = await toggleStaffActiveAction(propertyId, staff.id, staff.is_active);
      if (res.success) {
        success(
          staff.is_active ? "Staff Marked Inactive" : "Staff Activated",
          `${staff.first_name} ${staff.last_name} is now ${staff.is_active ? "inactive / on leave" : "active on duty"}.`
        );
      }
      onRefresh();
    } catch (err: unknown) {
      toastError("Status Update Failed", err instanceof Error ? err.message : "Could not toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Avatar color generator based on initials
  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-amber-500 to-orange-600",
      "from-emerald-500 to-teal-600",
      "from-sky-500 to-blue-600",
      "from-purple-500 to-indigo-600",
      "from-rose-500 to-pink-600",
      "from-teal-500 to-emerald-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className="space-y-6">
      {/* ── 1. EXECUTIVE METRIC KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Headcount */}
        <div className="p-4.5 rounded-2xl bg-card border shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Headcount
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{totalStaff}</span>
            <span className="text-xs text-muted-foreground font-medium">Registered Staff</span>
          </div>
        </div>

        {/* Active & On Duty */}
        <div className="p-4.5 rounded-2xl bg-card border border-emerald-500/30 shadow-xs space-y-2 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active On Duty
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeStaff}</span>
            <span className="text-xs text-muted-foreground font-medium">
              ({totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 0}% Operational)
            </span>
          </div>
        </div>

        {/* On Leave / Standby */}
        <div className="p-4.5 rounded-2xl bg-card border border-amber-500/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              On Leave / Standby
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{onLeaveStaff}</span>
            <span className="text-xs text-muted-foreground font-medium">Off-Duty Employees</span>
          </div>
        </div>

        {/* Operational Departments */}
        <div className="p-4.5 rounded-2xl bg-card border border-sky-500/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Departments
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400">{totalDepts}</span>
            <span className="text-xs text-muted-foreground font-medium">Operational Units</span>
          </div>
        </div>
      </div>

      {/* ── 2. PRIMARY TAB NAVIGATION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
              activeTab === "directory"
                ? "bg-card text-foreground shadow-xs font-black border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <span>Staff Directory</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-bold">
              {filteredStaff.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("credentials")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
              activeTab === "credentials"
                ? "bg-card text-foreground shadow-xs font-black border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
            <span>Portal Logins & Passcodes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
              activeTab === "roles"
                ? "bg-card text-foreground shadow-xs font-black border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Roles & Permissions Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("departments")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
              activeTab === "departments"
                ? "bg-card text-foreground shadow-xs font-black border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="w-3.5 h-3.5 text-sky-500" />
            <span>Departments ({departments.length})</span>
          </button>
        </div>

        {/* Action Button & View Switcher */}
        <div className="flex items-center gap-2">
          {activeTab === "directory" && (
            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-md transition",
                  viewMode === "grid" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded-md transition",
                  viewMode === "table" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <Button
            onClick={() => setIsAddOpen(true)}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Staff Member
          </Button>

          <Button variant="outline" size="sm" onClick={onRefresh} title="Refresh Staff">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── 3. TAB 1: STAFF DIRECTORY ── */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* Smart Filter Toolbar */}
          <div className="p-4 rounded-xl bg-card border shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
              {/* Search Box */}
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, employee code, designation..."
                  className="pl-9 h-9.5 text-xs bg-muted/20"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Department Filter */}
              <div className="lg:col-span-3">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  aria-label="Filter by Department"
                  className="w-full h-9.5 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground"
                >
                  <option value="ALL">All Departments ({departments.length})</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.department_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="lg:col-span-3">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  aria-label="Filter by Status"
                  className="w-full h-9.5 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground"
                >
                  <option value="ALL">All Statuses ({totalStaff})</option>
                  <option value="ACTIVE">Active On Duty ({activeStaff})</option>
                  <option value="INACTIVE">Inactive / On Leave ({onLeaveStaff})</option>
                </select>
              </div>

              {/* Employment Type */}
              <div className="lg:col-span-2">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  aria-label="Filter by Employment Type"
                  className="w-full h-9.5 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground"
                >
                  <option value="ALL">All Types</option>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(search || selectedDept !== "ALL" || selectedStatus !== "ALL" || selectedType !== "ALL") && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-[11px] text-muted-foreground">
                <span className="font-semibold">Filtered Results ({filteredStaff.length}):</span>
                {search && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                    &quot;{search}&quot;
                    <button onClick={() => setSearch("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedDept("ALL");
                    setSelectedStatus("ALL");
                    setSelectedType("ALL");
                  }}
                  className="text-amber-600 hover:text-amber-700 font-bold underline ml-2"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* ── Empty State ── */}
          {filteredStaff.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-card border border-dashed space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Staff Members Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No staff members match your current filter selection. Try changing the department or search criteria.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSelectedDept("ALL");
                    setSelectedStatus("ALL");
                    setSelectedType("ALL");
                  }}
                >
                  Clear Filters
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAddOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Staff Member
                </Button>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW (LUXURY STAFF CARDS) ── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((staff) => {
                const fullName = `${staff.first_name} ${staff.last_name}`;
                const initials = `${staff.first_name[0] || ""}${staff.last_name[0] || ""}`.toUpperCase();
                const avatarBg = getAvatarGradient(fullName);

                return (
                  <div
                    key={staff.id}
                    className="p-5 rounded-2xl bg-card border shadow-xs hover:border-amber-500/40 transition space-y-4 relative group"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className={cn(
                            "w-11 h-11 rounded-2xl bg-gradient-to-br text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0",
                            avatarBg
                          )}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-foreground text-sm truncate">{fullName}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] border border-amber-500/20">
                              {staff.employee_code}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium truncate">
                              {staff.designation || "Hotel Staff"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Toggle Switch */}
                      <button
                        onClick={() => handleToggleActive(staff)}
                        disabled={togglingId === staff.id}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black transition border shadow-xs",
                          staff.is_active
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                        )}
                        title="Toggle on-duty status"
                      >
                        {staff.is_active ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Off Duty</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Department & Role Badge */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {staff.department ? (
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-muted text-foreground border">
                          {staff.department.name}
                        </span>
                      ) : (
                        <span className="text-[10.5px] text-muted-foreground italic">General Hotel Staff</span>
                      )}

                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {staff.employment_type.replace("_", " ")}
                      </span>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-1.5 pt-2 border-t text-xs text-muted-foreground">
                      {staff.email && (
                        <div className="flex items-center justify-between gap-2 group/copy">
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate text-[11px] font-medium text-foreground">{staff.email}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(staff.email!, staff.id + "-email")}
                            className="text-muted-foreground hover:text-amber-500 transition p-1"
                            title="Copy email"
                          >
                            {copiedId === staff.id + "-email" ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}

                      {staff.phone && (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="font-mono text-[11px] font-medium text-foreground">{staff.phone}</span>
                          </div>
                          <a
                            href={`tel:${staff.phone}`}
                            className="text-muted-foreground hover:text-emerald-500 transition p-1"
                            title="Call phone"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Joined: {new Date(staff.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                      </span>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                        onClick={() => setEditingStaff(staff)}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── TABLE VIEW (DENSE DATA TABLE) ── */
            <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full bg-gradient-to-br text-white font-black flex items-center justify-center text-xs shadow-xs",
                                getAvatarGradient(`${staff.first_name} ${staff.last_name}`)
                              )}
                            >
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
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <code className="text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                            {staff.employee_code}
                          </code>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {staff.department ? (
                            <Badge variant="default" className="text-[11px] font-semibold">
                              {staff.department.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-foreground">
                          {staff.designation || "Staff"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap space-y-0.5">
                          {staff.email && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span>{staff.email}</span>
                            </div>
                          )}
                          {staff.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span>{staff.phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {staff.employment_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleToggleActive(staff)}
                            disabled={togglingId === staff.id}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black transition border shadow-xs",
                              staff.is_active
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                            )}
                            title="Click to toggle on-duty status"
                          >
                            {staff.is_active ? "Active" : "Off Duty"}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
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

      {/* ── 4. TAB 2: STAFF LOGINS & CREDENTIALS ── */}
      {activeTab === "credentials" && (
        <StaffCredentialsView
          propertyId={propertyId}
          staffList={initialStaff}
          onRefresh={onRefresh}
        />
      )}

      {/* ── 5. TAB 3: ROLES & PERMISSIONS MATRIX ── */}
      {activeTab === "roles" && <RolePermissionMatrix />}

      {/* ── 6. TAB 4: DEPARTMENTS & UNITS ── */}
      {activeTab === "departments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const memberCount = initialStaff.filter((s) => s.department_id === dept.id).length;
            return (
              <div
                key={dept.id}
                className="p-5 rounded-2xl border bg-card shadow-xs space-y-3 hover:border-amber-500/40 transition"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="warning" className="font-mono font-bold text-xs">
                    {dept.department_code}
                  </Badge>
                  <Badge variant={dept.is_active ? "success" : "default"}>
                    {dept.is_active ? "Active Unit" : "Archived"}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-black text-base text-foreground">{dept.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {dept.description || "Operational hotel department for daily guest servicing and management."}
                  </p>
                </div>
                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Assigned Staff:</span>
                  <span className="font-black text-foreground">{memberCount} Employees</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
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
