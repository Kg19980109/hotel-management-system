"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { ReservationStatus, BookingSource } from "@/lib/bookings/types";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  CheckCheck,
  Globe,
  Phone,
  Mail,
  Building,
  UserCheck,
} from "lucide-react";

interface BookingStatusBadgeProps {
  status: ReservationStatus;
  className?: string;
}

export function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
  switch (status) {
    case "CONFIRMED":
      return (
        <Badge
          variant="confirmed"
          size="sm"
          showDot={false}
          className={className}
          aria-label="Status: Confirmed"
        >
          <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600 inline-block" />
          Confirmed
        </Badge>
      );
    case "PENDING":
      return (
        <Badge
          variant="pending"
          size="sm"
          showDot={false}
          className={className}
          aria-label="Status: Pending Confirmation"
        >
          <Clock className="h-3 w-3 mr-1 text-amber-600 inline-block" />
          Pending
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge
          variant="cancelled"
          size="sm"
          showDot={false}
          className={className}
          aria-label="Status: Cancelled"
        >
          <XCircle className="h-3 w-3 mr-1 text-rose-600 inline-block" />
          Cancelled
        </Badge>
      );
    case "NO_SHOW":
      return (
        <Badge
          variant="no_show"
          size="sm"
          showDot={false}
          className={className}
          aria-label="Status: No Show"
        >
          <AlertCircle className="h-3 w-3 mr-1 text-slate-500 inline-block" />
          No Show
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge
          variant="default"
          size="sm"
          showDot={false}
          className={className}
          aria-label="Status: Completed"
        >
          <CheckCheck className="h-3 w-3 mr-1 text-slate-500 inline-block" />
          Completed
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

interface BookingSourceBadgeProps {
  source: BookingSource;
  className?: string;
}

export function BookingSourceBadge({ source, className }: BookingSourceBadgeProps) {
  const getIcon = () => {
    switch (source) {
      case "WEBSITE":
      case "OTA":
        return <Globe className="h-3 w-3 mr-1 text-blue-500 inline-block" />;
      case "PHONE":
        return <Phone className="h-3 w-3 mr-1 text-emerald-500 inline-block" />;
      case "EMAIL":
        return <Mail className="h-3 w-3 mr-1 text-amber-500 inline-block" />;
      case "CORPORATE":
        return <Building className="h-3 w-3 mr-1 text-purple-500 inline-block" />;
      case "WALK_IN":
      case "DIRECT":
      default:
        return <UserCheck className="h-3 w-3 mr-1 text-indigo-500 inline-block" />;
    }
  };

  const getLabel = () => {
    switch (source) {
      case "WALK_IN":
        return "Walk-in";
      case "TRAVEL_AGENT":
        return "Travel Agent";
      default:
        return source.charAt(0) + source.slice(1).toLowerCase();
    }
  };

  return (
    <Badge
      variant="default"
      size="sm"
      showDot={false}
      className={`text-xs font-normal text-slate-700 bg-slate-50 border border-slate-200 ${className || ""}`}
    >
      {getIcon()}
      {getLabel()}
    </Badge>
  );
}
