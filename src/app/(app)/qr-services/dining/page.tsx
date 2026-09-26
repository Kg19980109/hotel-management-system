import * as React from "react";
import { QrDiningPublisher } from "@/components/qr/qr-dining-publisher";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = {
  title: "StayHub — QR Dining Publisher",
  description: "Publish restaurant menus to the guest QR portal. QR orders flow to Kitchen KDS.",
};

export default function QrDiningPage() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="QR Dining — Menu to Guest to Kitchen"
        description="Choose what guests see after scanning the room QR. Orders placed here fire KDS kitchen tickets automatically."
        breadcrumbs={[
          { label: "Guest Experience", href: "/qr-services" },
          { label: "QR Dining Publisher" },
        ]}
      />
      <React.Suspense fallback={<div className="text-xs text-muted-foreground p-6">Loading publisher…</div>}>
        <QrDiningPublisher />
      </React.Suspense>
    </div>
  );
}
