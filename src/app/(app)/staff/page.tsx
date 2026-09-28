"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { getStaffMembers, getStaffDepartments } from "@/lib/staff/queries";
import { StaffMember, StaffDepartment } from "@/lib/staff/types";
import { StaffDirectoryView } from "@/components/staff/staff-directory-view";

export default function StaffPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;
  const propertyName = currentProperty?.property_name || "StayHub Hotel";

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [staff, setStaff] = React.useState<StaffMember[]>([]);
  const [departments, setDepartments] = React.useState<StaffDepartment[]>([]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [staffData, deptsData] = await Promise.all([
        getStaffMembers(activePropertyId),
        getStaffDepartments(activePropertyId),
      ]);

      setStaff(staffData);
      setDepartments(deptsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load staff management records.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      if (activePropertyId) {
        void Promise.resolve().then(() => {
          if (!isMounted) return;
          loadData();
        });
      } else {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

  if (authLoading || (loading && staff.length === 0 && departments.length === 0)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Staff & Role Permissions"
          description="Manage property employees, operational designations, and access privileges."
          breadcrumbs={[{ label: "Business", href: "/staff" }, { label: "Staff" }]}
        />
        <LoadingState message="Loading staff directory & operational roles..." />
      </div>
    );
  }

  if (error && staff.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Staff & Role Permissions"
          description="Manage property employees, operational designations, and access privileges."
          breadcrumbs={[{ label: "Business", href: "/staff" }, { label: "Staff" }]}
        />
        <ErrorState
          title="Failed to Load Staff Directory"
          description={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── LUXURY STAFF HERO BANNER ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10 shadow-2xl"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Ambient radial glows */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.10) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            {/* Tag */}
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.30)",
                background: "rgba(214,168,90,0.10)",
              }}
            >
              <Users className="h-3.5 w-3.5" />
              Staff Roster &amp; Access Control
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Staff &amp; Role Permissions
              <span className="block text-white/60 text-sm font-normal mt-1">
                Employee Directory, Operational Roles, Credentials Console &amp; Department RBAC Hub
              </span>
            </h1>

            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-white/80">
              <div>
                <span className="font-bold text-white">{staff.length}</span> team members
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span><span className="font-bold text-white">{staff.filter((s) => s.is_active).length}</span> active on duty</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span><span className="font-bold text-white">{departments.length}</span> departments</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                <span><span>{propertyName}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StaffDirectoryView
        propertyId={activePropertyId || ""}
        propertyName={propertyName}
        initialStaff={staff}
        departments={departments}
        onRefresh={loadData}
      />
    </div>
  );
}
