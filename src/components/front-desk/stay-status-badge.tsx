"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { StayStatus } from "@/lib/front-desk/types";
import {
  CheckCircle2,
  Clock,
  LogOut,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface StayStatusBadgeProps {
  status: StayStatus;
  className?: string;
}

export function StayStatusBadge({ status, className }: StayStatusBadgeProps) {
  switch (status) {
    case "CHECKED_IN":
      return (
        <Badge
          variant="confirmed"
          size="sm"
          showDot={false}
          className={`bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold ${className || ""}`}
          aria-label="Stay Status: In-House"
        >
          <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600 inline-block" />
          In-House
        </Badge>
      );
    case "CHECKED_OUT":
      return (
        <Badge
          variant="default"
          size="sm"
          showDot={false}
          className={`bg-slate-100 text-slate-700 border border-slate-200 ${className || ""}`}
          aria-label="Stay Status: Checked Out"
        >
          <LogOut className="h-3 w-3 mr-1 text-slate-500 inline-block" />
          Checked Out
        </Badge>
      );
    case "EXPECTED":
      return (
        <Badge
          variant="pending"
          size="sm"
          showDot={false}
          className={`bg-amber-50 text-amber-800 border border-amber-200 ${className || ""}`}
          aria-label="Stay Status: Expected Arrival"
        >
          <Clock className="h-3 w-3 mr-1 text-amber-600 inline-block" />
          Expected
        </Badge>
      );
    case "NO_SHOW":
      return (
        <Badge
          variant="no_show"
          size="sm"
          showDot={false}
          className={`bg-purple-50 text-purple-700 border border-purple-200 ${className || ""}`}
          aria-label="Stay Status: No Show"
        >
          <AlertCircle className="h-3 w-3 mr-1 text-purple-600 inline-block" />
          No Show
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge
          variant="cancelled"
          size="sm"
          showDot={false}
          className={`bg-rose-50 text-rose-700 border border-rose-200 ${className || ""}`}
          aria-label="Stay Status: Cancelled"
        >
          <XCircle className="h-3 w-3 mr-1 text-rose-600 inline-block" />
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="default" size="sm" showDot={false} className={className}>
          {status}
        </Badge>
      );
  }
}
