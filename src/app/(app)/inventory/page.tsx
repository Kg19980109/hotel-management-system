"use client";

import * as React from "react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function Page() {
  return (
    <PlaceholderPage
      title="Inventory & Stock"
      description="Linen, toiletries, kitchen supplies, and purchase orders."
      breadcrumbs={[{"label":"Business","href":"/inventory"},{"label":"Inventory"}]}
      phase="Phase 15 — Inventory & Supplies"
    />
  );
}
