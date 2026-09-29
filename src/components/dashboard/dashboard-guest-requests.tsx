"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getStaffGuestServiceRequests } from "@/lib/guest-services/queries";
import { 
  staffAcknowledgeGuestRequestAction,
  staffStartGuestRequestAction,
  staffCompleteGuestRequestAction,
  staffCancelGuestRequestAction,
} from "@/lib/guest-services/actions";
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
  Car,
  Shirt,
  Flower2,
  Compass,
  Clock,
  Loader2,
  Check,
  Users,
  Play,
  CheckCheck,
  XCircle
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
  const c = cat?.toUpperCase() || "";
  if (c === "HOUSEKEEPING")
    return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
  if (c === "MAINTENANCE")
    return <Wrench className="w-3.5 h-3.5 text-blue-400" />;
  if (c === "ROOM_SERVICE" || c === "FOOD" || c === "DINING")
    return <Utensils className="w-3.5 h-3.5 text-amber-400" />;
  if (c === "LAUNDRY")
    return <Shirt className="w-3.5 h-3.5 text-indigo-400" />;
  if (c === "SPA")
    return <Flower2 className="w-3.5 h-3.5 text-pink-400" />;
  if (c === "TRANSPORT")
    return <Car className="w-3.5 h-3.5 text-teal-400" />;
  if (c === "CONCIERGE")
    return <Compass className="w-3.5 h-3.5 text-purple-400" />;
  return <BedDouble className="w-3.5 h-3.5 text-amber-400" />;
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
    case "COMPLETED":
      return { label: "COMPLETED", badge: "success" as const };
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
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

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

  // Real-time listener
  React.useEffect(() => {
    if (!propertyId) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

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

    // Realtime subscription above handles instant updates. Polling every 60s is
    // purely a safety fallback to recover from any missed realtime events.
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadRequests();
    }, 60000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void loadRequests();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [propertyId, loadRequests]);

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    setUpdatingId(requestId);
    try {
      if (newStatus === "ACKNOWLEDGED") {
        await staffAcknowledgeGuestRequestAction(propertyId, requestId);
      } else if (newStatus === "IN_PROGRESS") {
        await staffStartGuestRequestAction(propertyId, requestId);
      } else if (newStatus === "COMPLETED") {
        await staffCompleteGuestRequestAction(propertyId, requestId, "Completed by staff");
      } else if (newStatus === "CANCELLED") {
        await staffCancelGuestRequestAction(propertyId, requestId, "Cancelled from dashboard");
      }
      await loadRequests();
    } catch (err) {
      console.error("Failed to update status from dashboard:", err);
    } finally {
      setUpdatingId(null);
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
      className="rounded-2xl border relative overflow-hidden transition-all duration-300 shadow-xl"
      style={{
        background: "linear-gradient(145deg, #091224 0%, #0E1B38 50%, #12224A 100%)",
        borderColor: pendingRequests.length > 0
          ? "rgba(214, 168, 90, 0.35)"
          : "rgba(255, 255, 255, 0.12)",
        boxShadow: pendingRequests.length > 0
          ? "0 12px 30px -10px rgba(7, 13, 27, 0.5), 0 0 0 1px rgba(214, 168, 90, 0.2)"
          : "0 12px 30px -10px rgba(7, 13, 27, 0.4)",
      }}
    >
      {/* Top subtle golden shimmer line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(214,168,90,0.6) 50%, transparent 100%)",
        }}
      />

      {/* Ambient background glows */}
      <div
        className="absolute -top-12 -right-12 h-36 w-36 rounded-full pointer-events-none blur-2xl opacity-25"
        style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full pointer-events-none blur-2xl opacity-20"
        style={{ background: "radial-gradient(circle, #5146E5 0%, transparent 70%)" }}
      />

      <div className="relative z-10 p-4 sm:p-4.5">
        {/* Widget Header */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            {/* Bell icon with glowing pulse */}
            <div className="relative">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-md backdrop-blur-md transition-all"
                style={{
                  background: pendingRequests.length > 0 ? "rgba(214, 168, 90, 0.2)" : "rgba(255, 255, 255, 0.08)",
                  borderColor: pendingRequests.length > 0 ? "rgba(214, 168, 90, 0.45)" : "rgba(255, 255, 255, 0.15)",
                  color: pendingRequests.length > 0 ? "#E8CD8A" : "rgba(255, 255, 255, 0.60)",
                }}
              >
                <BellRing className={`w-4 h-4 ${pendingRequests.length > 0 ? "animate-bounce" : ""}`} />
              </div>
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-sm shadow-rose-950" />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14.5px] font-black text-white tracking-tight flex items-center gap-2">
                  Live In-Room Requests
                </h3>
                {pendingRequests.length > 0 ? (
                  <span className="px-2 py-0.2 rounded-full text-[10.5px] font-black text-white bg-gradient-to-r from-rose-500 to-red-600 shadow-xs shadow-rose-950/60 animate-pulse">
                    {pendingRequests.length} Active
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded-full text-[10.5px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30">
                    All Clear
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50">
                Real-time concierge dispatch · Housekeeping, Maintenance &amp; Dining
              </p>
            </div>
          </div>

          <Link href="/guest-requests">
            <Button
              variant="ghost"
              size="sm"
              className="h-7.5 px-2.5 rounded-lg text-[11px] font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition gap-1"
            >
              <span>View All ({pendingRequests.length})</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {/* Empty state */}
        {recentList.length === 0 ? (
          <div
            className="py-5 px-4 rounded-xl text-center space-y-1.5 border backdrop-blur-md"
            style={{ background: "rgba(255, 255, 255, 0.03)", borderColor: "rgba(255, 255, 255, 0.08)" }}
          >
            <div
              className="w-9 h-9 rounded-xl mx-auto flex items-center justify-center border shadow-inner"
              style={{
                background: "rgba(22, 163, 106, 0.18)",
                borderColor: "rgba(22, 163, 106, 0.35)",
                color: "#34D399",
              }}
            >
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <h4 className="text-[13.5px] font-bold text-white/90">No Active Guest Requests</h4>
            <p className="text-[11.5px] text-white/45 max-w-sm mx-auto leading-relaxed">
              All in-room QR requests have been serviced. New requests stream in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {recentList.map((req) => {
              const guestName = req.guest
                ? `${req.guest.first_name || ""} ${req.guest.last_name || ""}`.trim()
                : "In-Room Guest";
              const priorityCfg = getPriorityConfig(req.priority);
              const statusCfg = getStatusConfig(req.status);

              return (
                <div
                  key={req.id}
                  className="rounded-xl border p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group transition-all duration-150"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    borderColor: "rgba(255, 255, 255, 0.09)",
                    borderLeft: `3.5px solid ${priorityCfg.borderColor}`,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)")}
                >
                  {/* Left: details */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Room Badge Capsule */}
                    <div
                      className="px-2 py-1 rounded-lg text-center min-w-[42px] shadow-2xs border shrink-0"
                      style={{
                        background: "linear-gradient(135deg, rgba(214,168,90,0.2) 0%, rgba(214,168,90,0.08) 100%)",
                        borderColor: "rgba(214,168,90,0.35)",
                      }}
                    >
                      <span className="block text-[7.5px] uppercase font-black tracking-widest text-[#E8CD8A]/70">
                        ROOM
                      </span>
                      <span className="text-[13px] font-black text-[#E8CD8A] leading-none">
                        {req.room?.room_number || "—"}
                      </span>
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold text-[13px] text-white tracking-tight group-hover:text-amber-200 transition-colors line-clamp-1">
                          {req.title}
                        </span>

                        <Badge variant={priorityCfg.badge} showDot={false} size="sm" className="text-[9.5px] py-0 px-1.5">
                          {priorityCfg.label}
                        </Badge>

                        <Badge variant={statusCfg.badge} showDot={false} size="sm" className="text-[9.5px] py-0 px-1.5">
                          {statusCfg.label}
                        </Badge>

                        <span
                          className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0 rounded-full uppercase tracking-wider border backdrop-blur-sm"
                          style={{
                            color: "#C7D2FE",
                            background: "rgba(99, 102, 241, 0.18)",
                            borderColor: "rgba(99, 102, 241, 0.35)",
                          }}
                        >
                          {getCategoryIcon(req.category)}
                          <span>{req.category}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/50">
                        <span className="flex items-center gap-1 font-semibold text-white/80">
                          <Users className="w-3 h-3 text-[#D4AF37]" />
                          {guestName}
                        </span>
                        {req.assigned_staff?.full_name && (
                          <>
                            <span className="text-white/20">·</span>
                            <span className="font-medium text-white/70">
                              {req.assigned_staff.full_name}
                            </span>
                          </>
                        )}
                        <span className="text-white/20">·</span>
                        <span className="flex items-center gap-1 text-white/60">
                          <Clock className="w-3 h-3 text-white/40" />
                          {formatElapsed(req.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions & status update */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <select
                      value={req.status}
                      disabled={updatingId === req.id}
                      onChange={(e) => handleUpdateStatus(req.id, e.target.value)}
                      className="h-7 text-[11px] font-bold rounded-lg px-2 bg-slate-900/90 border border-white/20 text-white focus:outline-none focus:border-amber-400 cursor-pointer shadow-2xs"
                    >
                      <option value="SUBMITTED">New</option>
                      <option value="ACKNOWLEDGED">Acknowledged</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>

                    {req.status === "SUBMITTED" && (
                      <Button
                        size="sm"
                        disabled={updatingId === req.id}
                        onClick={() => handleUpdateStatus(req.id, "ACKNOWLEDGED")}
                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#E8CD8A] border border-[#D4AF37]/40 shadow-2xs"
                      >
                        {updatingId === req.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3 h-3 text-[#E8CD8A]" />
                            <span>Accept</span>
                          </>
                        )}
                      </Button>
                    )}

                    {(req.status === "ACKNOWLEDGED" || req.status === "ASSIGNED") && (
                      <Button
                        size="sm"
                        disabled={updatingId === req.id}
                        onClick={() => handleUpdateStatus(req.id, "IN_PROGRESS")}
                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 border border-indigo-400/30 text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 shadow-2xs"
                      >
                        {updatingId === req.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Start</span>
                          </>
                        )}
                      </Button>
                    )}

                    {req.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        disabled={updatingId === req.id}
                        onClick={() => handleUpdateStatus(req.id, "COMPLETED")}
                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 border border-emerald-400/30 text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 shadow-2xs"
                      >
                        {updatingId === req.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <CheckCheck className="w-3 h-3" />
                            <span>Done</span>
                          </>
                        )}
                      </Button>
                    )}

                    <Link href={`/guest-requests/${req.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2.5 rounded-lg text-[11px] font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 gap-1 shadow-2xs"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-2.5 h-2.5 text-white/50" />
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
