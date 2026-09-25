"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  WorkOrderStatus,
  MaintenancePriority,
  MaintenanceCategory,
} from "@/lib/maintenance/types";

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  size?: "sm" | "md";
}

export function WorkOrderStatusBadge({ status, size = "sm" }: WorkOrderStatusBadgeProps) {
  switch (status) {
    case "OPEN":
      return (
        <Badge variant="pending" size={size} showDot>
          Open
        </Badge>
      );
    case "ASSIGNED":
      return (
        <Badge variant="info" size={size} showDot>
          Assigned
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge variant="cleaning" size={size} showDot>
          In Progress
        </Badge>
      );
    case "ON_HOLD":
      return (
        <Badge variant="warning" size={size} showDot>
          On Hold
        </Badge>
      );
    case "RESOLVED":
      return (
        <Badge variant="confirmed" size={size} showDot>
          Resolved
        </Badge>
      );
    case "CLOSED":
      return (
        <Badge variant="default" size={size} showDot={false}>
          Closed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="cancelled" size={size} showDot={false}>
          Cancelled
        </Badge>
      );
    default:
      return <Badge size={size}>{status}</Badge>;
  }
}

interface MaintenancePriorityBadgeProps {
  priority: MaintenancePriority;
  size?: "sm" | "md";
}

export function MaintenancePriorityBadge({ priority, size = "sm" }: MaintenancePriorityBadgeProps) {
  switch (priority) {
    case "URGENT":
      return (
        <Badge variant="danger" size={size} showDot>
          Urgent
        </Badge>
      );
    case "HIGH":
      return (
        <Badge variant="warning" size={size} showDot>
          High
        </Badge>
      );
    case "NORMAL":
      return (
        <Badge variant="default" size={size} showDot={false}>
          Normal
        </Badge>
      );
    case "LOW":
      return (
        <Badge variant="default" size={size} showDot={false}>
          Low
        </Badge>
      );
    default:
      return <Badge size={size}>{priority}</Badge>;
  }
}

interface MaintenanceCategoryBadgeProps {
  category: MaintenanceCategory;
  size?: "sm" | "md";
}

export function MaintenanceCategoryBadge({ category, size = "sm" }: MaintenanceCategoryBadgeProps) {
  const label = category.replace(/_/g, " ");
  return (
    <Badge variant="default" size={size} showDot={false}>
      {label}
    </Badge>
  );
}
