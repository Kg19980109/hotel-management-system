"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { createClient } from "@/lib/supabase/client";
import { GuestQrCode, GuestSession } from "@/lib/guest-portal/types";
import { getGuestQrCodes, getGuestSessions } from "@/lib/guest-portal/queries";
import { QrManagerView } from "@/components/qr/qr-manager-view";

interface RoomRow {
  id: string;
  room_number: string;
  room_type?: { name: string } | null;
}

export default function QrServicesPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;
  const propertyName = currentProperty?.property_name || "StayHub Hotel";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<GuestQrCode[]>([]);
  const [sessions, setSessions] = useState<GuestSession[]>([]);
  const [rooms, setRooms] = useState<{ id: string; room_number: string; room_type_name?: string }[]>([]);

  const loadData = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const [qrsData, sessionsData, roomsRes] = await Promise.all([
        getGuestQrCodes(propertyId),
        getGuestSessions(propertyId),
        supabase
          .from("rooms")
          .select("id, room_number, room_type:room_type_id(name)")
          .eq("property_id", propertyId)
          .eq("is_active", true)
          .order("room_number", { ascending: true }),
      ]);

      setQrCodes(qrsData);
      setSessions(sessionsData);

      const formattedRooms = ((roomsRes.data || []) as unknown as RoomRow[]).map((r) => ({
        id: r.id,
        room_number: r.room_number,
        room_type_name: r.room_type?.name,
      }));
      setRooms(formattedRooms);
    } catch (err: unknown) {
      console.error("Error loading QR management data:", err);
      const msg = err instanceof Error ? err.message : "Failed to load QR access points.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    let isMounted = true;
    if (!authLoading && propertyId) {
      const run = async () => {
        if (isMounted) await loadData();
      };
      run();
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, propertyId, loadData]);

  if (authLoading || (loading && qrCodes.length === 0)) {
    return <LoadingState message="Loading Guest QR Access Points..." />;
  }

  if (error && qrCodes.length === 0) {
    return (
      <ErrorState
        title="Failed to Load QR Services"
        description={error}
        onRetry={loadData}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Guest QR Portal & Access Points"
        description="Manage digital guest access points, generate printable bedside QR cards, and publish dining menus straight to Kitchen KDS."
        breadcrumbs={[
          { label: "Guest Experience", href: "/qr-services" },
          { label: "QR Access Points" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Sub-Navigation Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <a
          href="/qr-services"
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-sm flex items-center gap-2 shrink-0"
        >
          <span>All Access Points</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10.5px]">
            {qrCodes.length}
          </span>
        </a>
        <a
          href="/qr-services/rooms"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-2 shrink-0"
        >
          <span>Room Batch Manager</span>
          <span className="px-1.5 py-0.2 rounded-full bg-secondary text-[10.5px]">
            {rooms.length} Rooms
          </span>
        </a>
        <a
          href="/qr-services/dining"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-2 shrink-0"
        >
          <span>QR Dining Publisher</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10.5px] font-bold">
            Live Menu
          </span>
        </a>
      </div>

      {propertyId && (
        <QrManagerView
          propertyId={propertyId}
          propertyName={propertyName}
          initialQrCodes={qrCodes}
          initialSessions={sessions}
          rooms={rooms}
        />
      )}
    </div>
  );
}
