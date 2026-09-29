"use client";

import * as React from "react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

export default function Page() {
  return (
    <RoutePermissionGuard permission="settings.view" moduleName="Property & System Settings">
      <PlaceholderPage
        title="Property & System Settings"
        description="Hotel profile, tax rules, user permissions, and integrations."
        breadcrumbs={[{ label: "System", href: "/settings" }, { label: "Settings" }]}
        phase="Phase 5 — Multi-Property Configuration"
      />
    </RoutePermissionGuard>
  );
}
