"use client";

import * as React from "react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function Page() {
  return (
    <PlaceholderPage
      title="Expenses & Petty Cash"
      description="Operating expenditures, vendor payments, and utility receipts."
      breadcrumbs={[{"label":"Business","href":"/expenses"},{"label":"Expenses"}]}
      phase="Phase 18 — Accounting & Expenses"
    />
  );
}
