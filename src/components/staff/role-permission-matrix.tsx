"use client";

// ============================================================
// STAYHUB ROLE-BASED ACCESS CONTROL (RBAC) MATRIX
// ============================================================

import * as React from "react";
import { Check, X, Shield, Search, Info, ShieldCheck, Lock, Sparkles, ChevronRight } from "lucide-react";
import { ROLE_CAPABILITIES, MODULE_PERMISSIONS } from "@/lib/staff/permissions-data";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function RolePermissionMatrix() {
  const [activeTab, setActiveTab] = React.useState<"by_role" | "by_module">("by_role");
  const [selectedRoleCode, setSelectedRoleCode] = React.useState<string>("FRONT_DESK");
  const [searchModule, setSearchModule] = React.useState<string>("");

  const currentRole = React.useMemo(() => {
    return (
      ROLE_CAPABILITIES.find((r) => r.roleCode === selectedRoleCode) ||
      ROLE_CAPABILITIES[0]
    );
  }, [selectedRoleCode]);

  const filteredModules = React.useMemo(() => {
    if (!searchModule.trim()) return MODULE_PERMISSIONS;
    const q = searchModule.toLowerCase().trim();
    return MODULE_PERMISSIONS.filter(
      (m) =>
        m.module.toLowerCase().includes(q) ||
        m.feature.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [searchModule]);

  return (
    <div className="space-y-6">
      {/* Informational Governance Banner */}
      <div className="p-5 rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent text-foreground flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-black text-sm flex items-center gap-2">
            <span>Role-Based Access Control (RBAC) Governance</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-600 dark:text-sky-400">
              Active Security Layer
            </span>
          </h3>
          <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
            Staff designations grant strict operational access across front desk stays, housekeeping task assignments, KDS kitchen orders, maintenance work orders, and billing folios.
          </p>
        </div>
      </div>

      {/* Sub-tabs: By Role vs By Module Matrix */}
      <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("by_role")}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
            activeTab === "by_role"
              ? "bg-card text-foreground shadow-xs font-black border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Shield className="w-3.5 h-3.5 text-amber-500" />
          <span>Staff Roles & Responsibilities</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("by_module")}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
            activeTab === "by_module"
              ? "bg-card text-foreground shadow-xs font-black border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Lock className="w-3.5 h-3.5 text-indigo-500" />
          <span>Operational Permissions Matrix</span>
        </button>
      </div>

      {/* TAB 1: By Role Deep Dive */}
      {activeTab === "by_role" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Roles Selector Sidebar */}
          <div className="md:col-span-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Select Role ({ROLE_CAPABILITIES.length})
            </p>
            <div className="space-y-1.5">
              {ROLE_CAPABILITIES.map((role) => {
                const isSelected = role.roleCode === selectedRoleCode;
                return (
                  <button
                    key={role.roleCode}
                    onClick={() => setSelectedRoleCode(role.roleCode)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group",
                      isSelected
                        ? "bg-amber-500/15 border-amber-500 text-foreground shadow-xs"
                        : "bg-card hover:bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div>
                      <p className={cn("font-black text-sm", isSelected ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                        {role.roleName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{role.department}</p>
                    </div>
                    <Badge
                      variant={isSelected ? "warning" : "default"}
                      className="text-[10px] font-mono font-bold"
                    >
                      {role.roleCode}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Capabilities Details */}
          <div className="md:col-span-8 space-y-6">
            <div className="p-6 rounded-2xl border bg-card shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2 text-foreground">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span>{currentRole.roleName}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Department: <span className="font-bold text-foreground">{currentRole.department}</span> • Security Code: <code className="text-amber-600 dark:text-amber-400 font-bold font-mono">{currentRole.roleCode}</code>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Active Security Profile
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentRole.summary}
              </p>

              {/* What this role CAN do */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Authorized Capabilities & Actions ({currentRole.canDo.length})</span>
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {currentRole.canDo.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-foreground flex items-start gap-2.5 font-medium"
                    >
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What this role CANNOT do */}
              {currentRole.cannotDo.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    <span>Restricted / Prohibited Boundaries ({currentRole.cannotDo.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {currentRole.cannotDo.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs text-foreground flex items-start gap-2.5 font-medium"
                      >
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: By Module Feature Matrix */}
      {activeTab === "by_module" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchModule}
                onChange={(e) => setSearchModule(e.target.value)}
                placeholder="Search module or operational feature..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Showing <span className="font-bold text-foreground">{filteredModules.length}</span> operational features
            </p>
          </div>

          <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Operational Module</th>
                    <th className="py-3 px-4">Action / Feature</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Authorized Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredModules.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-black whitespace-nowrap text-amber-600 dark:text-amber-400 text-xs">
                        {item.module}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground whitespace-nowrap text-xs">
                        {item.feature}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground max-w-sm text-xs leading-relaxed">
                        {item.description}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.allowedRoles.map((role) => (
                            <Badge
                              key={role}
                              variant={role.includes("ADMIN") || role.includes("OWNER") ? "warning" : "default"}
                              className="text-[10px] font-mono"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
