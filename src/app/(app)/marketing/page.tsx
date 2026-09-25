"use client";

import * as React from "react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function Page() {
  return (
    <PlaceholderPage
      title="Marketing & Campaigns"
      description="Promotional SMS, WhatsApp notifications, discounts, and OTA deals."
      breadcrumbs={[{"label":"Business","href":"/marketing"},{"label":"Marketing"}]}
      phase="Phase 20 — Marketing & Loyalty"
    />
  );
}
