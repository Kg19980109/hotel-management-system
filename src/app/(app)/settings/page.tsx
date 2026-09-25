"use client";

import * as React from "react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function Page() {
  return (
    <PlaceholderPage
      title="Property & System Settings"
      description="Hotel profile, tax rules, user permissions, and integrations."
      breadcrumbs={[{"label":"System","href":"/settings"},{"label":"Settings"}]}
      phase="Phase 5 — Multi-Property Configuration"
    />
  );
}
