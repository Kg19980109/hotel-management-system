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

      {/* Sub-Navigation Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <a
          href="/qr-services"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-2 shrink-0"
        >
          <span>All Access Points</span>
        </a>
        <a
          href="/qr-services/rooms"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-2 shrink-0"
        >
          <span>Room Batch Manager</span>
        </a>
        <a
          href="/qr-services/dining"
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-sm flex items-center gap-2 shrink-0"
        >
          <span>QR Dining Publisher</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10.5px]">
            Live Menu
          </span>
        </a>
      </div>

      <React.Suspense fallback={<div className="text-xs text-muted-foreground p-6">Loading publisher…</div>}>
        <QrDiningPublisher />
      </React.Suspense>
    </div>
  );
}
