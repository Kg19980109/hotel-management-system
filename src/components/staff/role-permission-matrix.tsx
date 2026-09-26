"use client";

import * as React from "react";
import { Check, X, Shield, Search, Info } from "lucide-react";
import { ROLE_CAPABILITIES, MODULE_PERMISSIONS } from "@/lib/staff/permissions-data";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
      {/* Informational banner */}
      <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 text-sky-900 dark:text-sky-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-sm">Role-Based Access Control (RBAC) Governance</p>
          <p className="text-muted-foreground">
            Staff roles grant precise operational permissions across front desk, housekeeping, KDS kitchen orders, maintenance work orders, and billing folios. Financial payroll is managed in a separate compliance ledger.
          </p>
        </div>
      </div>

      {/* Sub-tabs: By Role vs By Module Matrix */}
      <div className="flex border-b border-[var(--border)] gap-6 text-sm">
        <button
          onClick={() => setActiveTab("by_role")}
          className={`pb-3 font-semibold transition border-b-2 ${
            activeTab === "by_role"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Staff Roles & Responsibilities
        </button>
        <button
          onClick={() => setActiveTab("by_module")}
          className={`pb-3 font-semibold transition border-b-2 ${
            activeTab === "by_module"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Operational Permissions Matrix
        </button>
      </div>

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
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-sm"
                        : "bg-card hover:bg-muted/50 border-[var(--border)] text-foreground"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm">{role.roleName}</p>
                      <p className="text-[11px] text-muted-foreground">{role.department}</p>
                    </div>
                    <Badge variant={isSelected ? "warning" : "default"} className="text-[10px]">
                      {role.roleCode}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Capabilities Details */}
          <div className="md:col-span-8 space-y-6">
            <div className="p-6 rounded-xl border bg-card shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    {currentRole.roleName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Department: <span className="font-semibold text-foreground">{currentRole.department}</span> • Code: <code className="text-amber-500">{currentRole.roleCode}</code>
                  </p>
                </div>
                <Badge variant="info" className="text-xs font-bold px-3 py-1">
                  Active Security Profile
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentRole.summary}
              </p>

              {/* What this role CAN do */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4" /> What Staff in this Role CAN Do
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {currentRole.canDo.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-foreground flex items-start gap-2.5"
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <X className="w-4 h-4" /> Restricted / Prohibited Actions
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {currentRole.cannotDo.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs text-foreground flex items-start gap-2.5"
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

      {activeTab === "by_module" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border bg-card">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchModule}
                onChange={(e) => setSearchModule(e.target.value)}
                placeholder="Search module or operational feature..."
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Showing {filteredModules.length} operational features
            </p>
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Operational Module</th>
                    <th className="py-3 px-4">Action / Feature</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Authorized Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredModules.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition">
                      <td className="py-3 px-4 font-bold whitespace-nowrap text-amber-600 dark:text-amber-400">
                        {item.module}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                        {item.feature}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-sm">
                        {item.description}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.allowedRoles.map((role) => (
                            <Badge
                              key={role}
                              variant={role.includes("ADMIN") || role.includes("OWNER") ? "warning" : "default"}
                              className="text-[10px]"
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
