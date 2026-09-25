"use client";

import * as React from "react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function Page() {
  return (
    <PlaceholderPage
      title="Table QR Codes"
      description="Generate QR codes for restaurant dining tables and pool cabanas."
      breadcrumbs={[{"label":"QR Services","href":"/qr-services"},{"label":"Table QR"}]}
      phase="Phase 14 — QR Guest Portal"
    />
  );
}
