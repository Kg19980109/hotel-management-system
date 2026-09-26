"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { getStaffGuestServiceRequests } from "@/lib/guest-services/queries";
import { StaffGuestServiceRequest } from "@/lib/guest-services/types";
import { GuestRequestsBoard } from "@/components/guest-requests/guest-requests-board";
import { getPropertyStaff } from "@/lib/maintenance/queries";

export default function GuestRequestsPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [requests, setRequests] = React.useState<StaffGuestServiceRequest[]>([]);
  const [staff, setStaff] = React.useState<{ id: string; full_name: string; email: string }[]>([]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const [reqData, staffData] = await Promise.all([
        getStaffGuestServiceRequests(activePropertyId),
        getPropertyStaff(supabase, activePropertyId),
      ]);

      setRequests(reqData);
      setStaff(
        staffData.map((s) => ({
          id: s.id,
          full_name: s.fullName || s.email,
          email: s.email,
        }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load guest requests.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      if (activePropertyId) {
        void Promise.resolve().then(() => {
          if (!isMounted) return;
          loadData();
        });
      } else {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

  // Real-time subscription to auto-update board on any request change
  React.useEffect(() => {
    if (!activePropertyId) return;

    const supabase = createClient();
    const channelName = `stayhub:guest-requests-board:${activePropertyId}:${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guest_service_requests",
        },
        (payload) => {
          const rec = (payload.new || payload.old) as { property_id?: string };
          if (rec?.property_id && rec.property_id !== activePropertyId) return;
          void loadData();
        }
      )
      .subscribe();

    // 3-second fallback heartbeat while viewing operational board
    const pollInterval = setInterval(() => {
      void loadData();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      void supabase.removeChannel(channel);
    };
  }, [activePropertyId, loadData]);

  if (authLoading || (loading && !requests.length)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Guest Service Requests"
          description="Manage and process live guest requests across housekeeping, maintenance, and concierge."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Guest Requests" }]}
        />
        <LoadingState message="Loading guest requests..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Guest Service Requests"
          description="Manage and process live guest requests across housekeeping, maintenance, and concierge."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Guest Requests" }]}
        />
        <ErrorState description={error} onRetry={() => void loadData()} />
      </div>
    );
  }

  const submittedCount = requests.filter((r) => r.status === "SUBMITTED").length;
  const activeCount = requests.filter((r) => r.status === "IN_PROGRESS" || r.status === "ASSIGNED" || r.status === "ACKNOWLEDGED").length;

  return (
    <div className="space-y-6">
      {/* Luxury Command Center Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#08111F] via-[#0D172E] to-[#111A3C] p-6 lg:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_50%)]" />
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#E5C158] text-xs font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
              Guest Concierge & Service Command
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
              Guest Service Requests
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time operational dispatch center for in-stay guest QR orders, housekeeping items, repair tickets, and concierge services.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-center">
              <div className="text-xs text-slate-400 font-medium">Pending Triage</div>
              <div className="text-xl font-black text-amber-400">{submittedCount}</div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-center">
              <div className="text-xs text-slate-400 font-medium">In Dispatch</div>
              <div className="text-xl font-black text-blue-400">{activeCount}</div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-center">
              <div className="text-xs text-slate-400 font-medium">Total Volume</div>
              <div className="text-xl font-black text-white">{requests.length}</div>
            </div>
          </div>
        </div>
      </div>

      <GuestRequestsBoard
        propertyId={activePropertyId || ""}
        requests={requests}
        staffMembers={staff}
        onRefresh={loadData}
      />
    </div>
  );
}
