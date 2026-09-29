"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Sparkles,
  CalendarDays,
  Wrench,
  CreditCard,
  UtensilsCrossed,
  RefreshCw,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import {
  fetchLiveNotificationsAction,
  LiveNotificationItem,
} from "@/lib/notifications/actions";
import { cn } from "@/lib/utils";

type FilterTab = "ALL" | "UNREAD" | "BOOKINGS" | "SERVICES" | "OPERATIONS";

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    if (isNaN(diffMs)) return "Recent";

    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 45) return "Just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

export function NotificationsDropdown() {
  const router = useRouter();
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [notifications, setNotifications] = React.useState<LiveNotificationItem[]>([]);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("ALL");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Load read notification IDs from local storage for current property
  React.useEffect(() => {
    if (!propertyId) return;
    try {
      const stored = localStorage.getItem(`stayhub_read_notifs_${propertyId}`);
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore
    }
  }, [propertyId]);

  // Fetch live notifications
  const loadNotifications = React.useCallback(async (showLoading = false) => {
    if (!propertyId) return;
    if (showLoading) setLoading(true);

    try {
      const res = await fetchLiveNotificationsAction(propertyId);
      if (res.notifications) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [propertyId]);

  // Initial fetch and property change
  React.useEffect(() => {
    void loadNotifications(true);
  }, [loadNotifications]);

  // Real-time subscription & heartbeat polling
  React.useEffect(() => {
    if (!propertyId) return;

    const supabase = createClient();
    const channelName = `stayhub:live-notifs:${propertyId}`;
    const channel = supabase.channel(channelName);

    const handleRealtimeChange = () => {
      void loadNotifications(false);
    };

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `property_id=eq.${propertyId}` }, handleRealtimeChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "guest_service_requests", filter: `property_id=eq.${propertyId}` }, handleRealtimeChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_orders", filter: `property_id=eq.${propertyId}` }, handleRealtimeChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_work_orders", filter: `property_id=eq.${propertyId}` }, handleRealtimeChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "housekeeping_tasks", filter: `property_id=eq.${propertyId}` }, handleRealtimeChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `property_id=eq.${propertyId}` }, handleRealtimeChange)
      .subscribe();

    // Heartbeat backup: 45s is sufficient since realtime subscription delivers
    // instant updates for all critical tables above. Polling is only a safety net.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadNotifications(false);
      }
    }, 45000);

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [propertyId, loadNotifications]);

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !readIds.has(n.id) && !n.read).length;
  }, [notifications, readIds]);

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    if (propertyId) {
      try {
        localStorage.setItem(`stayhub_read_notifs_${propertyId}`, JSON.stringify(Array.from(allIds)));
      } catch {
        // ignore
      }
    }
  };

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (propertyId) {
        try {
          localStorage.setItem(`stayhub_read_notifs_${propertyId}`, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const handleItemClick = (item: LiveNotificationItem) => {
    markAsRead(item.id);
    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  // Filter items
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((item) => {
      const isRead = readIds.has(item.id) || item.read;
      if (activeFilter === "UNREAD") return !isRead;
      if (activeFilter === "BOOKINGS") return item.category === "booking";
      if (activeFilter === "SERVICES") return item.category === "service" || item.category === "restaurant";
      if (activeFilter === "OPERATIONS") return item.category === "housekeeping" || item.category === "maintenance" || item.category === "billing";
      return true;
    });
  }, [notifications, activeFilter, readIds]);

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const getIcon = (category: LiveNotificationItem["category"]) => {
    switch (category) {
      case "booking":
        return <CalendarDays className="h-4 w-4 text-indigo-400" />;
      case "service":
        return <Bell className="h-4 w-4 text-amber-400" />;
      case "restaurant":
        return <UtensilsCrossed className="h-4 w-4 text-emerald-400" />;
      case "housekeeping":
        return <Sparkles className="h-4 w-4 text-cyan-400" />;
      case "maintenance":
        return <Wrench className="h-4 w-4 text-rose-400" />;
      case "billing":
        return <CreditCard className="h-4 w-4 text-blue-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-slate-400" />;
    }
  };

  const getCategoryBadgeClass = (category: LiveNotificationItem["category"]) => {
    switch (category) {
      case "booking":
        return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
      case "service":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "restaurant":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "housekeeping":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "maintenance":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      case "billing":
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
      default:
        return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            void loadNotifications(false);
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notifications, ${unreadCount} unread`}
        className={cn(
          "relative h-9.5 w-9.5 rounded-xl flex items-center justify-center border transition-all duration-150",
          "bg-white/[0.07] border-white/[0.12] text-slate-300 hover:text-white hover:bg-white/[0.12] shadow-inner",
          isOpen && "bg-white/[0.14] text-white border-indigo-400 ring-2 ring-indigo-500/30"
        )}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-[#08111F]" />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-84 sm:w-[420px] rounded-2xl bg-[#0A1124] border border-white/[0.14] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden backdrop-blur-2xl"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-bold text-slate-100 tracking-tight">
                    Live Notifications
                  </h3>
                  {unreadCount > 0 ? (
                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10.5px] font-bold px-2 py-0.2 rounded-full">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10.5px] font-semibold px-2 py-0.2 rounded-full">
                      Up to date
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadNotifications(true)}
                title="Refresh notifications"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-indigo-400")} />
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11.5px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/[0.06]"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.06] bg-black/20 overflow-x-auto text-[11px] font-semibold scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap",
                activeFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("UNREAD")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap",
                activeFilter === "UNREAD"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
              )}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("BOOKINGS")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap",
                activeFilter === "BOOKINGS"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
              )}
            >
              Bookings
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("SERVICES")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap",
                activeFilter === "SERVICES"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
              )}
            >
              Requests & Food
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("OPERATIONS")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap",
                activeFilter === "OPERATIONS"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
              )}
            >
              Ops & Billing
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[390px] overflow-y-auto divide-y divide-white/[0.04]">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mx-auto opacity-75" />
                <p className="text-[12.5px] font-medium text-slate-400">
                  Fetching latest hotel events...
                </p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center space-y-1.5">
                <Bell className="h-8 w-8 text-slate-500 mx-auto mb-1 opacity-40" />
                <p className="text-[13px] font-bold text-slate-200">
                  No notifications
                </p>
                <p className="text-[11.5px] text-slate-400 max-w-[220px] mx-auto">
                  {activeFilter === "UNREAD"
                    ? "You have marked all recent notifications as read."
                    : "No events recorded for this filter category."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isItemRead = readIds.has(item.id) || item.read;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "group flex items-start gap-3 p-3.5 cursor-pointer transition-all text-left relative",
                      !isItemRead
                        ? "bg-white/[0.05] hover:bg-white/[0.09]"
                        : "bg-transparent hover:bg-white/[0.04]"
                    )}
                  >
                    {/* Category Icon */}
                    <div className="h-8 w-8 rounded-xl bg-white/[0.07] border border-white/[0.1] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                      {getIcon(item.category)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p
                            className={cn(
                              "text-[12.5px] leading-snug truncate",
                              !isItemRead
                                ? "font-bold text-slate-100"
                                : "font-medium text-slate-300"
                            )}
                          >
                            {item.title}
                          </p>
                          {item.statusBadge && (
                            <span
                              className={cn(
                                "text-[9.5px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0",
                                getCategoryBadgeClass(item.category)
                              )}
                            >
                              {item.statusBadge}
                            </span>
                          )}
                        </div>

                        <span className="text-[10.5px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 opacity-60" />
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-slate-400 mt-1 line-clamp-2 leading-relaxed group-hover:text-slate-300 transition-colors">
                        {item.description}
                      </p>
                    </div>

                    {/* Unread indicator dot */}
                    {!isItemRead ? (
                      <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 self-center shadow-xs shadow-indigo-500 ring-2 ring-indigo-500/20" />
                    ) : (
                      <ArrowRight className="h-3 w-3 text-slate-600 opacity-0 group-hover:opacity-100 shrink-0 self-center transition-opacity" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-black/40 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live property activity
            </span>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Mark all as read
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">
                All caught up
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

