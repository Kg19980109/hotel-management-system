"use client";

import * as React from "react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function Page() {
  return (
    <PlaceholderPage
      title="Staff & Attendance"
      description="Employee records, shifts, roles, and shift handovers."
      breadcrumbs={[{"label":"Business","href":"/staff"},{"label":"Staff"}]}
      phase="Phase 16 — Staff & Payroll"
    />
  );
}
