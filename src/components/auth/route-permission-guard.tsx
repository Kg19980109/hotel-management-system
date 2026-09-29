"use client";

// ============================================================
// STAYHUB ROUTE PERMISSION GUARD COMPONENT
// Client-side barrier preventing unauthorized page rendering & component mount
// ============================================================

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { PermissionKey } from "@/lib/auth/permissions";
import { AccessRestricted } from "./access-restricted";
import { LoadingState } from "@/components/ui/states";

interface RoutePermissionGuardProps {
  permission: PermissionKey;
  moduleName?: string;
  description?: string;
  children: React.ReactNode;
}

export function RoutePermissionGuard({
  permission,
  moduleName,
  description,
  children,
}: RoutePermissionGuardProps) {
  const { loading: authLoading, hasPermission, currentRole } = useAuth();

  if (authLoading) {
    return <LoadingState message="Verifying role permissions..." />;
  }

  // Super Admin & Hotel Owner always have universal access
  if (currentRole === "SUPER_ADMIN" || currentRole === "HOTEL_OWNER") {
    return <>{children}</>;
  }

  const authorized = hasPermission(permission);

  if (!authorized) {
    return (
      <AccessRestricted
        moduleName={moduleName || "Restricted Area"}
        description={description}
      />
    );
  }

  return <>{children}</>;
}
