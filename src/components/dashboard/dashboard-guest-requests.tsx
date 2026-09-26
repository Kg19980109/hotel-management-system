"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getStaffGuestServiceRequests } from "@/lib/guest-services/queries";
import { staffAcknowledgeGuestRequestAction } from "@/lib/guest-services/actions";
import { StaffGuestServiceRequest } from "@/lib/guest-services/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BellRing,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Wrench,
  Utensils,
  BedDouble,
  Clock,
  Loader2,
  Check,
} from "lucide-react";

interface DashboardGuestRequestsProps {
  propertyId: string;
}

export function DashboardGuestRequests({ propertyId }: DashboardGuestRequestsProps) {
  const [requests, setRequests] = React.useState<StaffGuestServiceRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [acknowledgingId, setAcknowledgingId] = React.useState<string | null>(null);

  const loadRequests = React.useCallback(async () => {
    if (!propertyId) return;
    try {
      const data = await getStaffGuestServiceRequests(propertyId);
      setRequests(data);
    } catch (err) {
      console.error("Failed to load dashboard guest requests:", err);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  React.useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  // Real-time listener for incoming QR requests & status changes
  React.useEffect(() => {
    if (!propertyId) return;

    const supabase = createClient();
    const channelName = `stayhub:dashboard-guest-requests:${propertyId}:${Math.random().toString(36).slice(2, 7)}`;
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
          if (rec?.property_id && rec.property_id !== propertyId) return;
          void loadRequests();
        }
      )
      .subscribe();

    // 4-second backup heartbeat while dashboard is open
    const interval = setInterval(() => {
      void loadRequests();
    }, 4000);

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [propertyId, loadRequests]);

  const handleAcknowledge = async (requestId: string) => {
    setAcknowledgingId(requestId);
    try {
      const res = await staffAcknowledgeGuestRequestAction(propertyId, requestId);
      if (res.success) {
        await loadRequests();
      }
    } finally {
      setAcknowledgingId(null);
    }
  };

  const pendingRequests = React.useMemo(() => {
    return requests.filter(
      (r) =>
        r.status === "SUBMITTED" ||
        r.status === "ACKNOWLEDGED" ||
        r.status === "ASSIGNED" ||
        r.status === "IN_PROGRESS"
    );
  }, [requests]);

  const recentList = pendingRequests.slice(0, 5);

  const formatElapsed = (iso: string) => {
    const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 60) return "Just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    return `${hrs}h ago`;
  };

  const getCategoryIcon = (cat: string) => {
    const c = cat.toUpperCase();
    if (c === "HOUSEKEEPING" || c === "LAUNDRY") return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />;
    if (c === "MAINTENANCE") return <Wrench className="w-3.5 h-3.5 text-blue-500" />;
    if (c === "ROOM_SERVICE" || c === "FOOD") return <Utensils className="w-3.5 h-3.5 text-amber-500" />;
    return <BedDouble className="w-3.5 h-3.5 text-purple-500" />;
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="danger" className="text-[10px] font-black animate-pulse">URGENT</Badge>;
      case "HIGH":
        return <Badge variant="warning" className="text-[10px] font-bold">HIGH</Badge>;
      case "LOW":
        return <Badge variant="default" className="text-[10px]">LOW</Badge>;
      default:
        return <Badge variant="info" className="text-[10px]">NORMAL</Badge>;
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="stayhub-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="h-28 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="stayhub-card p-5 space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 font-bold">
              <BellRing className="w-4 h-4" />
            </div>
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Live Guest QR Requests</h3>
              {pendingRequests.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500 text-slate-950">
                  {pendingRequests.length} Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600">
                  All Clear
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Real-time in-room guest requests across Housekeeping, Maintenance & Dining
            </p>
          </div>
        </div>

        <Link href="/guest-requests">
          <Button variant="ghost" size="sm" className="text-xs gap-1 font-semibold text-amber-600 hover:text-amber-700">
            <span>View All ({requests.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Empty State */}
      {recentList.length === 0 ? (
        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-1.5">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-foreground">No Pending Guest Requests</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All in-room requests from guest QR scans have been acknowledged and resolved.
          </p>
        </div>
      ) : (
        /* Active Requests List */
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {recentList.map((req) => {
            const isSubmitting = req.status === "SUBMITTED";
            const guestName = req.guest
              ? `${req.guest.first_name || ""} ${req.guest.last_name || ""}`.trim()
              : "In-Room Guest";

            return (
              <div
                key={req.id}
                className="p-3.5 bg-card hover:bg-muted/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left details */}
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 font-black text-amber-600 text-xs shrink-0 text-center">
                    <span className="block text-[9px] uppercase font-bold text-muted-foreground">ROOM</span>
                    <span>{req.room?.room_number || "—"}</span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground line-clamp-1">
                        {req.title}
                      </span>
                      {getPriorityBadge(req.priority)}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {getCategoryIcon(req.category)}
                        <span>{req.category}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{guestName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {formatElapsed(req.created_at)}
                      </span>
                      {req.description && (
                        <>
                          <span>•</span>
                          <span className="line-clamp-1 italic text-slate-500 max-w-xs">{req.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {isSubmitting && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acknowledgingId === req.id}
                      onClick={() => handleAcknowledge(req.id)}
                      className="h-8 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/30 gap-1.5"
                    >
                      {acknowledgingId === req.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Acknowledging...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </>
                      )}
                    </Button>
                  )}

                  <Link href={`/guest-requests/${req.id}`}>
                    <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold gap-1">
                      <span>Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
