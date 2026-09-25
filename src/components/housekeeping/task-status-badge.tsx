"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  HousekeepingTaskStatus,
  HousekeepingPriority,
  HousekeepingTaskType,
} from "@/lib/housekeeping/types";

interface TaskStatusBadgeProps {
  status: HousekeepingTaskStatus;
  size?: "sm" | "md";
}

export function TaskStatusBadge({ status, size = "sm" }: TaskStatusBadgeProps) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="pending" size={size}>
          Pending
        </Badge>
      );
    case "ASSIGNED":
      return (
        <Badge variant="info" size={size}>
          Assigned
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge variant="cleaning" size={size}>
          Cleaning
        </Badge>
      );
    case "INSPECTION_PENDING":
      return (
        <Badge variant="warning" size={size}>
          Inspection Pending
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="confirmed" size={size}>
          Completed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="cancelled" size={size}>
          Cancelled
        </Badge>
      );
    default:
      return <Badge size={size}>{status}</Badge>;
  }
}

interface PriorityBadgeProps {
  priority: HousekeepingPriority;
  size?: "sm" | "md";
}

export function PriorityBadge({ priority, size = "sm" }: PriorityBadgeProps) {
  switch (priority) {
    case "URGENT":
      return (
        <Badge variant="danger" size={size} className="animate-pulse font-semibold">
          Urgent
        </Badge>
      );
    case "HIGH":
      return (
        <Badge variant="danger" size={size}>
          High
        </Badge>
      );
    case "NORMAL":
      return (
        <Badge variant="default" size={size}>
          Normal
        </Badge>
      );
    case "LOW":
      return (
        <Badge variant="default" size={size} className="opacity-70">
          Low
        </Badge>
      );
    default:
      return <Badge size={size}>{priority}</Badge>;
  }
}

interface TaskTypeBadgeProps {
  type: HousekeepingTaskType;
  size?: "sm" | "md";
}

export function TaskTypeBadge({ type, size = "sm" }: TaskTypeBadgeProps) {
  const formatted = type.replace(/_/g, " ");
  switch (type) {
    case "CLEANING":
      return (
        <Badge variant="info" size={size}>
          Cleaning
        </Badge>
      );
    case "DEEP_CLEAN":
      return (
        <Badge variant="blocked" size={size}>
          Deep Clean
        </Badge>
      );
    case "TURNDOWN":
      return (
        <Badge variant="warning" size={size}>
          Turndown
        </Badge>
      );
    case "INSPECTION":
      return (
        <Badge variant="warning" size={size}>
          Inspection
        </Badge>
      );
    case "LINEN_CHANGE":
      return (
        <Badge variant="default" size={size}>
          Linen Change
        </Badge>
      );
    case "TOUCHUP":
      return (
        <Badge variant="default" size={size}>
          Touchup
        </Badge>
      );
    default:
      return <Badge size={size}>{formatted}</Badge>;
  }
}
