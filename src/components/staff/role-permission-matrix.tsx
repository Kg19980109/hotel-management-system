"use client";

// ============================================================
// STAYHUB MANAGER ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION MATRIX
// Interactive Granular Permission Customization per Property
// ============================================================

import * as React from "react";
import {
  Shield,
  ShieldCheck,
  Lock,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Save,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Sliders,
  Info,
  Layers,
  Users,
  Eye,
  Settings,
  Briefcase,
  KeyRound,
  Filter,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { LoadingState } from "@/components/ui/states";
import {
  StaffRole,
  PermissionItem,
  PropertyRolePermissionRecord,
} from "@/lib/staff/types";
import {
  getMasterPermissions,
  getRoles,
  getRoleDefaultPermissions,
  getPropertyRolePermissions,
} from "@/lib/staff/queries";
import {
  updatePropertyRolePermissionsAction,
  resetPropertyRolePermissionsAction,
} from "@/lib/staff/actions";
import { ROLE_CAPABILITIES } from "@/lib/staff/permissions-data";
import { cn } from "@/lib/utils";

interface RolePermissionMatrixProps {
  propertyId: string;
  initialSelectedRoleCode?: string;
  onPermissionsUpdated?: () => void;
}

interface ModuleGroup {
  module: string;
  title: string;
  iconName?: string;
  permissions: PermissionItem[];
}

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  dashboard: "Overview & Dashboard",
  front_desk: "Front Desk & Stays",
  rooms: "Room Inventory & Floors",
  bookings: "Reservations & Bookings",
  guests: "Guests & CRM Database",
  housekeeping: "Housekeeping Operations",
  maintenance: "Engineering & Maintenance",
  guest_requests: "Guest Service Requests",
  pos: "Point of Sale (POS)",
  menu: "Dining Menu Configuration",
  kitchen: "Kitchen Display System (KDS)",
  qr_services: "QR Guest Services Hub",
  staff: "Staff & Role Administration",
  attendance: "Attendance & Shifts",
  billing: "Billing & Guest Folios",
  expenses: "Hotel Expenses & Outgoings",
  reports: "Reports & Financial Intelligence",
  inventory: "Inventory & Stock Assets",
  settings: "Property & System Settings",
};

export function RolePermissionMatrix({
  propertyId,
  initialSelectedRoleCode = "FRONT_DESK",
  onPermissionsUpdated,
}: RolePermissionMatrixProps) {
  const { currentRole: userRole, refreshAuth } = useAuth();
  const { success, error: toastError } = useToast();

  const isManager =
    userRole === "SUPER_ADMIN" ||
    userRole === "HOTEL_OWNER" ||
    userRole === "GENERAL_MANAGER";

  // Data states
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [roles, setRoles] = React.useState<StaffRole[]>([]);
  const [allPermissions, setAllPermissions] = React.useState<PermissionItem[]>([]);
  const [roleDefaults, setRoleDefaults] = React.useState<{ role_id: string; permission_id: string }[]>([]);
  const [propertyOverrides, setPropertyOverrides] = React.useState<PropertyRolePermissionRecord[]>([]);

  // Selection & UI
  const [selectedRoleCode, setSelectedRoleCode] = React.useState<string>(initialSelectedRoleCode);
  const [activeTab, setActiveTab] = React.useState<"matrix" | "overview">("matrix");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [selectedModuleFilter, setSelectedModuleFilter] = React.useState<string>("ALL");
  const [expandedModules, setExpandedModules] = React.useState<Record<string, boolean>>({});

  // Active working set of granted permission IDs for the currently selected role
  const [workingGrantedIds, setWorkingGrantedIds] = React.useState<Set<string>>(new Set());
  const [initialGrantedIds, setInitialGrantedIds] = React.useState<Set<string>>(new Set());

  // Load all permissions and role metadata
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [rolesData, permsData, defaultsData, overridesData] = await Promise.all([
        getRoles(),
        getMasterPermissions(),
        getRoleDefaultPermissions(),
        getPropertyRolePermissions(propertyId),
      ]);

      setRoles(rolesData);
      setAllPermissions(permsData);
      setRoleDefaults(defaultsData);
      setPropertyOverrides(overridesData);

      // Expand all modules by default
      const initialExpanded: Record<string, boolean> = {};
      permsData.forEach((p) => {
        initialExpanded[p.module] = true;
      });
      setExpandedModules(initialExpanded);
    } catch (err) {
      console.error("Failed to load permission matrix data:", err);
      toastError("Load Error", "Failed to retrieve role permission records.");
    } finally {
      setLoading(false);
    }
  }, [propertyId, toastError]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  // Selected role object
  const selectedRole = React.useMemo(() => {
    return roles.find((r) => r.code === selectedRoleCode) || roles[0] || null;
  }, [roles, selectedRoleCode]);

  // Compute the current effective permissions for the selected role in this property
  React.useEffect(() => {
    if (!selectedRole || allPermissions.length === 0) return;

    // 1. Get role defaults
    const defaultsForRole = new Set(
      roleDefaults
        .filter((d) => d.role_id === selectedRole.id)
        .map((d) => d.permission_id)
    );

    // 2. Apply property overrides
    const overridesForRole = propertyOverrides.filter(
      (o) => o.role_id === selectedRole.id
    );

    const effective = new Set(defaultsForRole);
    overridesForRole.forEach((o) => {
      if (o.granted) {
        effective.add(o.permission_id);
      } else {
        effective.delete(o.permission_id);
      }
    });

    setWorkingGrantedIds(new Set(effective));
    setInitialGrantedIds(new Set(effective));
  }, [selectedRole, roleDefaults, propertyOverrides, allPermissions]);

  // Track if there are unsaved changes
  const isDirty = React.useMemo(() => {
    if (workingGrantedIds.size !== initialGrantedIds.size) return true;
    for (const id of workingGrantedIds) {
      if (!initialGrantedIds.has(id)) return true;
    }
    return false;
  }, [workingGrantedIds, initialGrantedIds]);

  // Group master permissions by module
  const moduleGroups = React.useMemo(() => {
    const map = new Map<string, PermissionItem[]>();

    allPermissions.forEach((perm) => {
      if (!map.has(perm.module)) {
        map.set(perm.module, []);
      }
      map.get(perm.module)!.push(perm);
    });

    const groups: ModuleGroup[] = [];
    map.forEach((perms, mod) => {
      // Filter by search
      const q = searchQuery.toLowerCase().trim();
      const filtered = perms.filter((p) => {
        if (selectedModuleFilter !== "ALL" && p.module !== selectedModuleFilter) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      });

      if (filtered.length > 0) {
        groups.push({
          module: mod,
          title: MODULE_DISPLAY_NAMES[mod] || mod.replace(/_/g, " ").toUpperCase(),
          permissions: filtered,
        });
      }
    });

    return groups;
  }, [allPermissions, searchQuery, selectedModuleFilter]);

  // Default permission lookup map for the selected role
  const defaultPermissionIdsForSelectedRole = React.useMemo(() => {
    if (!selectedRole) return new Set<string>();
    return new Set(
      roleDefaults
        .filter((d) => d.role_id === selectedRole.id)
        .map((d) => d.permission_id)
    );
  }, [selectedRole, roleDefaults]);

  // Toggle single permission checkbox
  const handleTogglePermission = (permission: PermissionItem) => {
    if (!isManager) return;

    setWorkingGrantedIds((prev) => {
      const next = new Set(prev);
      const isCurrentlyGranted = next.has(permission.id);

      if (isCurrentlyGranted) {
        next.delete(permission.id);
      } else {
        next.add(permission.id);

        // Dependency Rule: If granting an action permission, ensure module .view permission is enabled
        const viewPermission = allPermissions.find(
          (p) => p.module === permission.module && p.key.endsWith(".view")
        );
        if (viewPermission) {
          next.add(viewPermission.id);
        }
      }

      return next;
    });
  };

  // Toggle all permissions for a module
  const handleToggleModuleAll = (moduleGroup: ModuleGroup) => {
    if (!isManager) return;

    const modulePermIds = moduleGroup.permissions.map((p) => p.id);
    const allModuleGranted = modulePermIds.every((id) => workingGrantedIds.has(id));

    setWorkingGrantedIds((prev) => {
      const next = new Set(prev);
      if (allModuleGranted) {
        // Deselect all in this module
        modulePermIds.forEach((id) => next.delete(id));
      } else {
        // Select all in this module
        modulePermIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Save changes
  const handleSavePermissions = async () => {
    if (!selectedRole || !isManager) return;

    try {
      setSaving(true);
      const res = await updatePropertyRolePermissionsAction(
        propertyId,
        selectedRole.id,
        Array.from(workingGrantedIds)
      );

      if (res.success) {
        success(
          "Role Permissions Saved",
          `Custom access control for ${selectedRole.name} updated for this property.`
        );
        setInitialGrantedIds(new Set(workingGrantedIds));
        await refreshAuth();
        if (onPermissionsUpdated) {
          onPermissionsUpdated();
        }
        await loadData();
      } else {
        toastError("Save Failed", res.error || "Could not save permission changes.");
      }
    } catch (err: unknown) {
      toastError(
        "Save Error",
        err instanceof Error ? err.message : "Failed to update permissions"
      );
    } finally {
      setSaving(false);
    }
  };

  // Reset to role defaults
  const handleResetToDefaults = async () => {
    if (!selectedRole || !isManager) return;

    try {
      setResetting(true);
      const res = await resetPropertyRolePermissionsAction(propertyId, selectedRole.id);

      if (res.success) {
        success(
          "Role Defaults Restored",
          `${selectedRole.name} has been reset to global baseline permissions.`
        );
        await refreshAuth();
        if (onPermissionsUpdated) {
          onPermissionsUpdated();
        }
        await loadData();
      } else {
        toastError("Reset Failed", res.error || "Could not reset to defaults.");
      }
    } catch (err: unknown) {
      toastError(
        "Reset Error",
        err instanceof Error ? err.message : "Failed to reset permissions"
      );
    } finally {
      setResetting(false);
    }
  };

  // Discard unsaved changes
  const handleDiscardChanges = () => {
    setWorkingGrantedIds(new Set(initialGrantedIds));
  };

  // Toggle module accordion
  const toggleModuleAccordion = (module: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  if (loading) {
    return <LoadingState message="Loading granular permissions registry & role templates..." />;
  }

  // Selected role capabilities overview
  const roleCapability = ROLE_CAPABILITIES.find((r) => r.roleCode === selectedRoleCode) || null;

  return (
    <div className="space-y-6">
      {/* ── 1. GOVERNANCE BANNER & CONTEXT ── */}
      <div className="p-5 rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent text-foreground flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-sm flex items-center gap-2">
              <span>Granular Role-Based Access Control (RBAC) Matrix</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-600 dark:text-sky-400">
                Property Context Scoped
              </span>
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Configure fine-grained module view and action privileges per role for this property. Modifications take effect immediately for all assigned staff upon save.
            </p>
          </div>
        </div>

        {/* Action button toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border",
              activeTab === "matrix"
                ? "bg-card text-foreground shadow-xs font-black border-border"
                : "text-muted-foreground hover:text-foreground bg-muted/40 border-transparent"
            )}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>Interactive Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border",
              activeTab === "overview"
                ? "bg-card text-foreground shadow-xs font-black border-border"
                : "text-muted-foreground hover:text-foreground bg-muted/40 border-transparent"
            )}
          >
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>Role Responsibilities</span>
          </button>
        </div>
      </div>

      {/* ── 2. STICKY UNSAVED CHANGES BAR ── */}
      {isDirty && (
        <div className="sticky top-4 z-30 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 backdrop-blur-md shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">
                You have unsaved permission changes for <span className="font-black text-amber-600 dark:text-amber-400">{selectedRole?.name}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Save to apply these modifications to all staff members assigned to this role in this property.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardChanges}
              disabled={saving}
              className="text-xs font-bold h-8"
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSavePermissions}
              disabled={saving}
              className="text-xs font-bold h-8 bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Permissions"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. MAIN INTERFACE GRID (ROLES LIST + PERMISSION MATRIX) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: SYSTEM ROLES SELECTOR */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              System Roles ({roles.length})
            </p>
            <span className="text-[11px] text-muted-foreground font-medium">Select to configure</span>
          </div>

          <div className="space-y-1.5 max-h-[720px] overflow-y-auto pr-1">
            {roles.map((role) => {
              const isSelected = role.code === selectedRoleCode;

              // Count granted permissions for this role
              const roleDefs = new Set(
                roleDefaults.filter((d) => d.role_id === role.id).map((d) => d.permission_id)
              );
              const roleOvr = propertyOverrides.filter((o) => o.role_id === role.id);
              const roleActiveCount = roleOvr.reduce((acc, o) => {
                if (o.granted) return acc + 1;
                return acc;
              }, roleDefs.size);

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    if (isDirty) {
                      if (!confirm("You have unsaved changes. Switch role and discard changes?")) {
                        return;
                      }
                    }
                    setSelectedRoleCode(role.code);
                  }}
                  className={cn(
                    "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group",
                    isSelected
                      ? "bg-amber-500/15 border-amber-500 text-foreground shadow-xs ring-1 ring-amber-500/30"
                      : "bg-card hover:bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="space-y-0.5">
                    <p className={cn("font-black text-sm flex items-center gap-1.5", isSelected ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                      <span>{role.name}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                      {role.description || role.code}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={isSelected ? "warning" : "default"}
                      className="text-[10px] font-mono font-bold"
                    >
                      {role.code}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {isSelected ? workingGrantedIds.size : roleActiveCount} perms
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE PERMISSION MATRIX */}
        <div className="lg:col-span-8 space-y-6">
          {activeTab === "matrix" ? (
            <div className="space-y-5">
              {/* Role Header & Fast Controls */}
              <div className="p-5 rounded-2xl border bg-card shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <h3 className="text-lg font-black flex items-center gap-2 text-foreground">
                      <Shield className="w-5 h-5 text-amber-500" />
                      <span>{selectedRole?.name} Access Control</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Target Role: <code className="text-amber-600 dark:text-amber-400 font-bold font-mono">{selectedRole?.code}</code> • Currently Active:{" "}
                      <span className="font-bold text-foreground">{workingGrantedIds.size} of {allPermissions.length} permissions</span>
                    </p>
                  </div>

                  {/* Reset Defaults Button */}
                  {isManager && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetToDefaults}
                      disabled={resetting}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{resetting ? "Resetting..." : "Reset to Defaults"}</span>
                    </Button>
                  )}
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search permissions by name, key, or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs h-9"
                    />
                  </div>

                  <select
                    value={selectedModuleFilter}
                    onChange={(e) => setSelectedModuleFilter(e.target.value)}
                    className="h-9 px-3 rounded-xl border bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">All Modules ({Object.keys(MODULE_DISPLAY_NAMES).length})</option>
                    {Object.entries(MODULE_DISPLAY_NAMES).map(([mod, title]) => (
                      <option key={mod} value={mod}>
                        {title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Module Groups & Checkbox Lists */}
              <div className="space-y-4">
                {moduleGroups.map((group) => {
                  const isExpanded = expandedModules[group.module] ?? true;
                  const modulePermIds = group.permissions.map((p) => p.id);
                  const grantedCount = modulePermIds.filter((id) => workingGrantedIds.has(id)).length;
                  const allGranted = grantedCount === modulePermIds.length;
                  const someGranted = grantedCount > 0 && !allGranted;

                  return (
                    <div
                      key={group.module}
                      className="rounded-2xl border bg-card shadow-xs overflow-hidden transition-all"
                    >
                      {/* Module Header with Master Toggle */}
                      <div className="p-4 bg-muted/30 border-b flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Module-level Checkbox */}
                          <input
                            type="checkbox"
                            id={`module-${group.module}`}
                            checked={allGranted}
                            ref={(el) => {
                              if (el) el.indeterminate = someGranted;
                            }}
                            onChange={() => handleToggleModuleAll(group)}
                            disabled={!isManager}
                            className="w-4 h-4 rounded border-border text-amber-600 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed"
                            aria-label={`Toggle all permissions for ${group.title}`}
                          />

                          <button
                            type="button"
                            onClick={() => toggleModuleAccordion(group.module)}
                            className="text-left flex items-center gap-2 group"
                          >
                            <span className="font-black text-sm text-foreground group-hover:text-amber-600 transition">
                              {group.title}
                            </span>
                            <Badge variant={grantedCount > 0 ? "default" : "pending"} className="text-[10px]">
                              {grantedCount} / {group.permissions.length} Enabled
                            </Badge>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleModuleAccordion(group.module)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition"
                          aria-label="Toggle module visibility"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Granular Permission Items */}
                      {isExpanded && (
                        <div className="p-3 divide-y divide-border/40">
                          {group.permissions.map((perm) => {
                            const isGranted = workingGrantedIds.has(perm.id);
                            const isDefault = defaultPermissionIdsForSelectedRole.has(perm.id);
                            const isCustomOverride = isGranted !== isDefault;

                            return (
                              <label
                                key={perm.id}
                                htmlFor={`perm-${perm.id}`}
                                className={cn(
                                  "py-3 px-3 rounded-xl transition flex items-start gap-3.5 cursor-pointer hover:bg-muted/30",
                                  isGranted ? "bg-amber-500/[0.03]" : ""
                                )}
                              >
                                <input
                                  type="checkbox"
                                  id={`perm-${perm.id}`}
                                  checked={isGranted}
                                  onChange={() => handleTogglePermission(perm)}
                                  disabled={!isManager}
                                  className="w-4 h-4 mt-0.5 rounded border-border text-amber-600 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed shrink-0"
                                />

                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={cn(
                                        "text-xs font-bold",
                                        isGranted ? "text-foreground font-black" : "text-muted-foreground"
                                      )}
                                    >
                                      {perm.name}
                                    </span>

                                    <code className="text-[10px] font-mono font-medium text-muted-foreground px-1.5 py-0.2 rounded bg-muted/60">
                                      {perm.key}
                                    </code>

                                    {/* Permission type badge */}
                                    <span
                                      className={cn(
                                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full",
                                        perm.permission_type === "MODULE"
                                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {perm.permission_type}
                                    </span>

                                    {/* Custom Override Indicator */}
                                    {isCustomOverride && (
                                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                                        <Sparkles className="w-2.5 h-2.5" />
                                        Custom Property Override
                                      </span>
                                    )}
                                  </div>

                                  {perm.description && (
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Save Action Bar */}
              {isManager && (
                <div className="p-4 rounded-2xl border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={isDirty ? "warning" : "default"} className="text-xs">
                      {isDirty ? "Unsaved Edits" : "Persisted to Property"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {workingGrantedIds.size} of {allPermissions.length} permissions active
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDirty && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDiscardChanges}
                        disabled={saving}
                        className="text-xs font-bold"
                      >
                        Discard
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSavePermissions}
                      disabled={saving || !isDirty}
                      className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? "Saving..." : "Save Role Permissions"}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: ROLE RESPONSIBILITIES OVERVIEW */
            <div className="p-6 rounded-2xl border bg-card shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2 text-foreground">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span>{roleCapability?.roleName || selectedRole?.name}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Department: <span className="font-bold text-foreground">{roleCapability?.department || "Operations"}</span> • Security Code: <code className="text-amber-600 dark:text-amber-400 font-bold font-mono">{selectedRole?.code}</code>
                  </p>
                </div>
                <Badge variant="warning" className="text-xs font-bold font-mono">
                  {selectedRole?.code}
                </Badge>
              </div>

              {roleCapability && (
                <div className="space-y-5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {roleCapability.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Operational Capabilities */}
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] space-y-2.5">
                      <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Authorized Responsibilities
                      </h4>
                      <ul className="space-y-1.5">
                        {roleCapability.canDo.map((item, idx) => (
                          <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Operational Boundaries */}
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/[0.03] space-y-2.5">
                      <h4 className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        Restricted Boundaries
                      </h4>
                      <ul className="space-y-1.5">
                        {roleCapability.cannotDo.map((item, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-red-400 font-bold">✕</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
