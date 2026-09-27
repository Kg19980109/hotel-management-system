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
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardGuestRequestsProps {
  propertyId: string;
}

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
  if (c === "HOUSEKEEPING" || c === "LAUNDRY")
    return <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />;
  if (c === "MAINTENANCE")
    return <Wrench className="w-3.5 h-3.5" style={{ color: "var(--info)" }} />;
  if (c === "ROOM_SERVICE" || c === "FOOD")
    return <Utensils className="w-3.5 h-3.5" style={{ color: "var(--warning)" }} />;
  return <BedDouble className="w-3.5 h-3.5" style={{ color: "var(--purple)" }} />;
};

const getPriorityConfig = (p: string) => {
  switch (p) {
    case "URGENT":
      return {
        dot: "ops-alert-dot-urgent",
        label: "URGENT",
        badge: "danger" as const,
        borderColor: "var(--danger)",
      };
    case "HIGH":
      return {
        dot: "ops-alert-dot-high",
        label: "HIGH",
        badge: "warning" as const,
        borderColor: "var(--warning)",
      };
    case "LOW":
      return {
        dot: "ops-alert-dot-low",
        label: "LOW",
        badge: "default" as const,
        borderColor: "var(--border)",
      };
    default:
      return {
        dot: "ops-alert-dot-normal",
        label: "NORMAL",
        badge: "info" as const,
        borderColor: "var(--info)",
      };
  }
};

const getStatusConfig = (s: string) => {
  switch (s) {
    case "SUBMITTED":
      return { label: "NEW", badge: "pending" as const };
    case "ACKNOWLEDGED":
      return { label: "ACKNOWLEDGED", badge: "warning" as const };
    case "ASSIGNED":
      return { label: "ASSIGNED", badge: "info" as const };
    case "IN_PROGRESS":
      return { label: "IN PROGRESS", badge: "info" as const };
    case "CANCELLED":
      return { label: "CANCELLED", badge: "danger" as const };
    case "REJECTED":
      return { label: "REJECTED", badge: "danger" as const };
    default:
      return { label: s, badge: "default" as const };
  }
};

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

  // Real-time listener (primary). 30s visible-only backup poll replaces
  // the old 4s aggressive poll that kept mobile radios awake.
  React.useEffect(() => {
    if (!propertyId) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // Authenticate realtime socket so staff RLS passes (was missing → silent no-events)
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel(`stayhub:dashboard-guest-requests:${propertyId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "guest_service_requests",
            filter: `property_id=eq.${propertyId}`,
          },
          (payload) => {
            const rec = (payload.new || payload.old) as { property_id?: string };
            if (rec?.property_id && rec.property_id !== propertyId) return;
            void loadRequests();
          }
        )
        .subscribe();
    });

    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadRequests();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [propertyId, loadRequests]);

  const handleAcknowledge = async (requestId: string) => {
    setAcknowledgingId(requestId);
    try {
      const res = await staffAcknowledgeGuestRequestAction(propertyId, requestId);
      if (res.success) await loadRequests();
    } finally {
      setAcknowledgingId(null);
    }
  };

  const pendingRequests = React.useMemo(
    () =>
      requests.filter((r) => {
        const status = (r.status || "").toUpperCase();
        return (
          status !== "COMPLETED" &&
          status !== "CANCELLED" &&
          status !== "CLOSED" &&
          status !== "REJECTED"
        );
      }),
    [requests]
  );

  const recentList = pendingRequests.slice(0, 5);

  // --- Loading skeleton ---
  if (loading && requests.length === 0) {
    return (
      <div
        className="rounded-[var(--radius-xl)] border animate-pulse"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 100%)",
          borderColor: "rgba(255,255,255,0.08)",
          padding: "20px",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-52 rounded-md" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="h-5 w-20 rounded-md" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>
        <div className="h-28 rounded-[var(--radius-lg)]" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--radius-xl)] border relative overflow-hidden"
      style={{
        background: "linear-gradient(155deg, #08111F 0%, #0D1830 60%, #0F1635 100%)",
        borderColor: pendingRequests.length > 0
          ? "rgba(224,82,82,0.25)"
          : "rgba(255,255,255,0.08)",
        boxShadow: pendingRequests.length > 0
          ? "0 0 0 1px rgba(224,82,82,0.12), 0 12px 32px rgba(13,24,48,0.30)"
          : "0 12px 32px rgba(13,24,48,0.30)",
      }}
    >
      {/* Ambient glow when urgent/active */}
      {pendingRequests.length > 0 && (
        <div
          className="absolute -top-12 -right-12 h-40 w-40 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(224,82,82,0.12) 0%, transparent 70%)" }}
        />
      )}

      <div className="relative z-10 p-5">
        {/* Widget Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Bell icon with pulse ring */}
            <div className="relative">
              <div
                className="p-2.5 rounded-[var(--radius-md)] border"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderColor: "rgba(255,255,255,0.12)",
                  color: pendingRequests.length > 0 ? "var(--warning)" : "rgba(255,255,255,0.40)",
                }}
              >
                <BellRing className="w-4 h-4" />
              </div>
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--danger)" }} />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5" style={{ background: "var(--danger)" }} />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-[14.5px] font-bold text-white leading-tight">
                  Live Guest QR Requests
                </h3>
                {pendingRequests.length > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10.5px] font-bold text-white"
                    style={{ background: "var(--danger)" }}
                  >
                    {pendingRequests.length} Active
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-white/40 mt-0.5">
                Real-time in-room guest requests · Housekeeping, Maintenance &amp; Dining
              </p>
            </div>
          </div>

          <Link href="/guest-requests">
            <Button
              variant="ghost"
              size="sm"
              className="text-[11.5px] gap-1.5 font-semibold"
              style={{ color: "rgba(255,255,255,0.40)" }}
            >
              View All ({pendingRequests.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Empty state */}
        {recentList.length === 0 ? (
          <div
            className="p-5 rounded-[var(--radius-lg)] text-center space-y-2 border"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="w-10 h-10 rounded-[var(--radius-xl)] mx-auto flex items-center justify-center"
              style={{ background: "rgba(22,163,106,0.18)", color: "var(--success)" }}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-[13.5px] font-semibold text-white/80">No Active Guest Requests</h4>
            <p className="text-[11.5px] text-white/35 max-w-xs mx-auto leading-relaxed">
              All in-room requests from guest QR scans have been completed.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentList.map((req) => {
              const isSubmitting = req.status === "SUBMITTED";
              const guestName = req.guest
                ? `${req.guest.first_name || ""} ${req.guest.last_name || ""}`.trim()
                : "In-Room Guest";
              const priorityCfg = getPriorityConfig(req.priority);
              const statusCfg = getStatusConfig(req.status);

              return (
                <div
                  key={req.id}
                  className={cn(
                    "rounded-[var(--radius-lg)] border-l-[3px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-colors"
                  )}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderLeftColor: priorityCfg.borderColor,
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderLeft: `3px solid ${priorityCfg.borderColor}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                >
                  {/* Left: details */}
                  <div className="flex items-start gap-3.5">
                    {/* Priority dot + room */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                      <div className={priorityCfg.dot} />
                      <div
                        className="px-2.5 py-1.5 rounded-[var(--radius-md)] text-center min-w-[44px]"
                        style={{
                          background: "rgba(214,168,90,0.12)",
                          border: "1px solid rgba(214,168,90,0.20)",
                        }}
                      >
                        <span className="block text-[8.5px] uppercase font-bold tracking-widest" style={{ color: "rgba(214,168,90,0.60)" }}>
                          ROOM
                        </span>
                        <span className="text-[15px] font-black" style={{ color: "var(--brand-gold)" }}>
                          {req.room?.room_number || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[14px] text-white/90 leading-tight group-hover:text-white transition-colors line-clamp-1">
                          {req.title}
                        </span>
                        <Badge variant={priorityCfg.badge} showDot={false} size="sm">
                          {priorityCfg.label}
                        </Badge>
                        <Badge variant={statusCfg.badge} showDot={false} size="sm">
                          {statusCfg.label}
                        </Badge>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border"
                          style={{
                            color: "rgba(172,148,255,0.80)",
                            background: "rgba(108,92,231,0.18)",
                            borderColor: "rgba(108,92,231,0.25)",
                          }}
                        >
                          {getCategoryIcon(req.category)}
                          <span>{req.category}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                        <span className="flex items-center gap-1.5 font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>
                          <Users className="w-3.5 h-3.5" />
                          {guestName}
                        </span>
                        {req.assigned_staff?.full_name && (
                          <>
                            <span>·</span>
                            <span className="font-semibold" style={{ color: "rgba(255,255,255,0.70)" }}>
                              Assigned: {req.assigned_staff.full_name}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatElapsed(req.created_at)}
                        </span>
                        {req.description && (
                          <>
                            <span>·</span>
                            <span className="line-clamp-1 italic max-w-[180px]">{req.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {isSubmitting && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={acknowledgingId === req.id}
                        onClick={() => handleAcknowledge(req.id)}
                        className="h-8 text-[11.5px] font-bold gap-1.5"
                        style={{
                          background: "rgba(214,168,90,0.12)",
                          borderColor: "rgba(214,168,90,0.25)",
                          color: "var(--brand-gold)",
                        }}
                      >
                        {acknowledgingId === req.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Accepting...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </>
                        )}
                      </Button>
                    )}
                    <Link href={`/guest-requests/${req.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[11.5px] font-semibold gap-1.5"
                        style={{
                          color: "rgba(255,255,255,0.50)",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
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
    </div>
  );
}
