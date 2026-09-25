"use client";

import * as React from "react";
import { GuestQrCode, GuestSession } from "@/lib/guest-portal/types";
import { QrKpiGrid } from "./qr-kpi-grid";
import { QrCodeList } from "./qr-code-list";
import { CreateQrModal } from "./create-qr-modal";
import { PrintQrModal } from "./print-qr-modal";

interface RoomOption {
  id: string;
  room_number: string;
  room_type_name?: string;
}

interface QrManagerViewProps {
  propertyId: string;
  propertyName?: string;
  initialQrCodes: GuestQrCode[];
  initialSessions: GuestSession[];
  rooms: RoomOption[];
}

export function QrManagerView({
  propertyId,
  propertyName,
  initialQrCodes,
  initialSessions,
  rooms,
}: QrManagerViewProps) {
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [printModalOpen, setPrintModalOpen] = React.useState(false);
  const [newlyCreatedQr, setNewlyCreatedQr] = React.useState<GuestQrCode | null>(null);
  const [newlyCreatedRawToken, setNewlyCreatedRawToken] = React.useState<string | null>(null);

  const handleCreated = (qr: GuestQrCode, rawToken: string) => {
    setNewlyCreatedQr(qr);
    setNewlyCreatedRawToken(rawToken);
    setPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <QrKpiGrid qrCodes={initialQrCodes} sessions={initialSessions} />

      {/* Main QR Code List */}
      <QrCodeList
        qrCodes={initialQrCodes}
        propertyId={propertyId}
        propertyName={propertyName}
        onOpenCreate={() => setCreateModalOpen(true)}
      />

      {/* Create Modal */}
      <CreateQrModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        propertyId={propertyId}
        rooms={rooms}
        onCreated={handleCreated}
      />

      {/* Newly Created Print Modal */}
      <PrintQrModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        qrCode={newlyCreatedQr}
        rawToken={newlyCreatedRawToken}
        propertyName={propertyName}
      />
    </div>
  );
}
