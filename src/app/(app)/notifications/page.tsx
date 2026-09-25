"use client";

// ============================================================
// STAYHUB NOTIFICATIONS CENTER (Phase 21)
// ============================================================

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  fetchNotificationPreferencesAction,
} from "@/lib/notifications/actions";
import { formatNotificationTime, getCategoryBadgeColor } from "@/lib/notifications/formatters";
import type { NotificationItem, NotificationCategory, NotificationPreference } from "@/lib/notifications/types";
import {
  Bell,
  CheckCheck,
  CalendarDays,
  Sparkles,
  Wrench,
  UtensilsCrossed,
  CreditCard,
  Package,
  UsersRound,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const CATEGORY_TABS: Array<{ label: string; value: NotificationCategory | "ALL" }> = [
  { label: "All Alerts", value: "ALL" },
  { label: "Bookings", value: "BOOKING" },
  { label: "Front Desk", value: "CHECK_IN" },
  { label: "Housekeeping", value: "HOUSEKEEPING" },
  { label: "Maintenance", value: "MAINTENANCE" },
  { label: "Dining & KDS", value: "RESTAURANT" },
  { label: "Billing & Folios", value: "PAYMENT" },
  { label: "Inventory", value: "INVENTORY" },
  { label: "Staff", value: "STAFF" },
  { label: "Guest Services", value: "GUEST_SERVICE" },
];

export default function NotificationsCenterPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [selectedCategory, setSelectedCategory] = React.useState<NotificationCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);
  const [showPreferences, setShowPreferences] = React.useState(false);
  const [preferences, setPreferences] = React.useState<NotificationPreference[]>([]);

  const loadNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchNotificationsAction(propertyId, {
        category: selectedCategory === "ALL" ? undefined : selectedCategory,
        unreadOnly,
        limit: 50,
      });
      if (res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, selectedCategory, unreadOnly]);

  React.useEffect(() => {
    let active = true;
    fetchNotificationsAction(propertyId, {
      category: selectedCategory === "ALL" ? undefined : selectedCategory,
      unreadOnly,
      limit: 50,
    })
      .then((res) => {
        if (!active) return;
        if (res.notifications) {
          setNotifications(res.notifications);
          setUnreadCount(res.unreadCount);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load notifications:", err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [propertyId, selectedCategory, unreadOnly]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationReadAction(id, propertyId);
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsReadAction(propertyId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const loadPreferences = async () => {
    const res = await fetchNotificationPreferencesAction(propertyId);
    if (res.preferences) {
      setPreferences(res.preferences);
    }
    setShowPreferences(true);
  };

  const filteredNotifications = notifications.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "BOOKING":
      case "CHECK_IN":
      case "CHECK_OUT":
        return <CalendarDays className="w-4 h-4 text-indigo-600" />;
      case "HOUSEKEEPING":
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case "MAINTENANCE":
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case "RESTAURANT":
      case "KITCHEN":
        return <UtensilsCrossed className="w-4 h-4 text-orange-600" />;
      case "PAYMENT":
      case "INVOICE":
      case "FOLIO":
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case "INVENTORY":
        return <Package className="w-4 h-4 text-rose-600" />;
      case "STAFF":
        return <UsersRound className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <Badge className="bg-indigo-600 text-white font-semibold">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time operational alerts, guest events, and department tasks for{" "}
            <span className="font-medium text-slate-800">{propertyName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPreferences}
            className="text-xs gap-1.5 h-9"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Preferences
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || isMarkingAll}
            className="text-xs gap-1.5 h-9"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            Mark All as Read
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadNotifications}
            disabled={isLoading}
            className="h-9 w-9 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Preferences Modal View */}
      {showPreferences && (
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              Notification Delivery Channels
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreferences(false)}
              className="text-xs text-indigo-700 hover:text-indigo-900 h-7"
            >
              Close
            </Button>
          </div>
          <p className="text-xs text-indigo-700">
            In-app and email notifications are active for all critical operational categories. SMS and WhatsApp alerts are dispatched for booking confirmations and guest requests.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 bg-white rounded-xl border border-indigo-100/80 text-xs">
              <span className="font-semibold text-slate-800">In-App Feed</span>
              <p className="text-[11px] text-emerald-600 font-medium">Active (Real-time)</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-indigo-100/80 text-xs">
              <span className="font-semibold text-slate-800">Email Delivery</span>
              <p className="text-[11px] text-emerald-600 font-medium">Enabled (System/Guest)</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-indigo-100/80 text-xs">
              <span className="font-semibold text-slate-800">SMS Alerts</span>
              <p className="text-[11px] text-indigo-600 font-medium">Bookings & Arrivals</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-indigo-100/80 text-xs">
              <span className="font-semibold text-slate-800">WhatsApp Concierge</span>
              <p className="text-[11px] text-indigo-600 font-medium">Guest QR Requests</p>
            </div>
          </div>
          {preferences.length > 0 && (
            <div className="pt-2 border-t border-indigo-100/60 grid grid-cols-2 md:grid-cols-4 gap-2">
              {preferences.slice(0, 4).map((p) => (
                <div key={p.id || p.category} className="p-2 bg-white/80 rounded-lg text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">{p.category.replace(/_/g, " ")}: </span>
                  {p.inAppEnabled ? "In-App" : "Off"}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedCategory(tab.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Unread Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter alerts..."
              className="pl-8 text-xs h-8 bg-slate-50 rounded-xl"
            />
          </div>

          <Button
            variant={unreadOnly ? "primary" : "outline"}
            size="sm"
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`text-xs h-8 px-3 ${
              unreadOnly ? "bg-indigo-600 text-white" : "text-slate-600"
            }`}
          >
            Unread Only
          </Button>
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading operational alerts...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-2">
              <CheckCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">All Caught Up!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No notifications matching your filter. New operational events will automatically appear here.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 bg-white ${
                !item.read
                  ? "border-indigo-200 shadow-2xs bg-gradient-to-r from-indigo-50/20 via-white to-white"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              {/* Category Icon */}
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                {getCategoryIcon(item.category)}
              </div>

              {/* Notification Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${!item.read ? "font-bold text-slate-900" : "font-medium text-slate-800"}`}>
                      {item.title}
                    </span>
                    <Badge className={`text-[10px] uppercase font-bold tracking-wider ${getCategoryBadgeColor(item.category)}`}>
                      {item.category.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 font-medium">
                    {formatNotificationTime(item.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.message}
                </p>

                {/* Footer Badges and Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span>Channels: {item.channels?.join(", ") || "IN_APP"}</span>
                    {item.priority === "HIGH" || item.priority === "URGENT" ? (
                      <span className="text-rose-600 font-semibold">• High Priority</span>
                    ) : null}
                  </div>

                  {!item.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkRead(item.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-7 px-2.5"
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
