"use client";

import * as React from "react";
import { Bell, Check, Sparkles, CalendarDays, Wrench, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "booking" | "housekeeping" | "maintenance" | "billing";
}

const initialNotifications: Notification[] = [
  {
    id: "notif-1",
    title: "New Booking Received",
    description: "Priya Sharma booked Deluxe Suite 304 for 3 nights.",
    time: "5 min ago",
    read: false,
    type: "booking",
  },
  {
    id: "notif-2",
    title: "Housekeeping Completed",
    description: "Room 201 has been inspected and marked clean.",
    time: "24 min ago",
    read: false,
    type: "housekeeping",
  },
  {
    id: "notif-3",
    title: "Maintenance Alert",
    description: "AC unit issue reported in Room 412 (High priority).",
    time: "1 hour ago",
    read: false,
    type: "maintenance",
  },
  {
    id: "notif-4",
    title: "Payment Processed",
    description: "Invoice #INV-2024-089 paid in full via UPI (₹14,500).",
    time: "2 hours ago",
    read: true,
    type: "billing",
  },
];

export function NotificationsDropdown() {
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications);
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

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

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "booking":
        return <CalendarDays className="h-4 w-4 text-indigo-600" />;
      case "housekeeping":
        return <Sparkles className="h-4 w-4 text-emerald-600" />;
      case "maintenance":
        return <Wrench className="h-4 w-4 text-amber-600" />;
      case "billing":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notifications, ${unreadCount} unread`}
        className={cn(
          "relative h-9.5 w-9.5 rounded-xl flex items-center justify-center border",
          "bg-white/[0.07] border-white/[0.12] text-slate-300 hover:text-white hover:bg-white/[0.12] transition-colors shadow-inner",
          isOpen && "bg-white/[0.14] text-white border-indigo-400"
        )}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-[#08111F]" />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0A1124] border border-white/[0.12] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-slate-100">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[12px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.04]">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-[13px] font-medium text-slate-200">
                  No notifications
                </p>
                <p className="text-[12px] text-slate-400">
                  You are all caught up!
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 cursor-pointer transition-colors text-left hover:bg-white/[0.08]",
                    !item.read ? "bg-white/[0.04]" : "bg-transparent"
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-[13px] leading-tight truncate", !item.read ? "font-semibold text-slate-100" : "font-medium text-slate-300")}>
                        {item.title}
                      </p>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  {!item.read && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 self-center shadow-xs shadow-indigo-500" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-black/20 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Live operational alerts
            </span>
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Mark all as read
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
