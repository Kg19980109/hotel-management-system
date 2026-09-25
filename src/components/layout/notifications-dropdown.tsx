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
          "relative h-9 w-9 rounded-[var(--radius)] flex items-center justify-center",
          "text-[var(--foreground-muted)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-colors",
          isOpen && "bg-[var(--secondary)] text-[var(--foreground)]"
        )}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--danger)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--danger)] ring-2 ring-white" />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[var(--radius-xl)] bg-white border border-[var(--border)] shadow-[var(--shadow-xl)] z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-indigo-50 text-[var(--primary)] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[12px] font-medium text-[var(--primary)] hover:text-indigo-700 transition-colors flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--border)]">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-[var(--foreground-subtle)] mx-auto mb-2 opacity-50" />
                <p className="text-[13px] font-medium text-[var(--foreground)]">
                  No notifications
                </p>
                <p className="text-[12px] text-[var(--foreground-muted)]">
                  You are all caught up!
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 cursor-pointer transition-colors text-left hover:bg-[var(--secondary)]",
                    !item.read ? "bg-indigo-50/30" : "bg-white"
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-[var(--secondary)] flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-[13px] leading-tight truncate", !item.read ? "font-semibold text-[var(--foreground)]" : "font-medium text-[var(--foreground)]")}>
                        {item.title}
                      </p>
                      <span className="text-[11px] text-[var(--foreground-subtle)] shrink-0">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--foreground-muted)] mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  {!item.read && (
                    <span className="h-2 w-2 rounded-full bg-[var(--primary)] shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--foreground-muted)]">
              Operational alerts
            </span>
            <a
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              View all &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
