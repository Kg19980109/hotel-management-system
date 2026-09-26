"use client";

import * as React from "react";
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
      <PageHeader
        title="Staff & Role Permissions"
        description="Employee directory, operational roles, and department access control."
        breadcrumbs={[{ label: "Business", href: "/staff" }, { label: "Staff" }]}
      />

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
