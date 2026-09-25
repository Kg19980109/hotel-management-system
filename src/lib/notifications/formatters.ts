// ============================================================
// STAYHUB NOTIFICATION FORMATTERS (Phase 21)
// ============================================================

import type { NotificationCategory } from "./types";

export function formatNotificationTime(isoTimestamp: string): string {
  if (!isoTimestamp) return "Just now";
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getCategoryBadgeColor(category: NotificationCategory): string {
  switch (category) {
    case "BOOKING":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "PAYMENT":
    case "INVOICE":
    case "FOLIO":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "HOUSEKEEPING":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "MAINTENANCE":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "RESTAURANT":
    case "KITCHEN":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "GUEST_SERVICE":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "INVENTORY":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}
