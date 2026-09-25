"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  OrderStatus,
  OrderType,
  TableStatus,
  OrderItemStatus,
} from "@/lib/restaurant/types";

export function OrderStatusBadge({
  status,
  size = "sm",
}: {
  status: OrderStatus;
  size?: "sm" | "md";
}) {
  switch (status) {
    case "DRAFT":
      return (
        <Badge variant="default" size={size} showDot={false}>
          Draft
        </Badge>
      );
    case "OPEN":
      return (
        <Badge variant="pending" size={size} showDot>
          Open
        </Badge>
      );
    case "CONFIRMED":
      return (
        <Badge variant="confirmed" size={size} showDot>
          Confirmed
        </Badge>
      );
    case "PREPARING":
      return (
        <Badge variant="warning" size={size} showDot>
          Preparing
        </Badge>
      );
    case "READY":
      return (
        <Badge variant="info" size={size} showDot>
          Ready
        </Badge>
      );
    case "SERVED":
      return (
        <Badge variant="checked_in" size={size} showDot>
          Served
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="available" size={size} showDot={false}>
          Completed
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

export function OrderTypeBadge({
  type,
  size = "sm",
}: {
  type: OrderType;
  size?: "sm" | "md";
}) {
  switch (type) {
    case "DINE_IN":
      return (
        <Badge variant="info" size={size} showDot={false}>
          Dine In
        </Badge>
      );
    case "TAKEAWAY":
      return (
        <Badge variant="warning" size={size} showDot={false}>
          Takeaway
        </Badge>
      );
    case "ROOM_SERVICE":
      return (
        <Badge variant="blocked" size={size} showDot={false}>
          Room Service
        </Badge>
      );
    case "DELIVERY":
      return (
        <Badge variant="default" size={size} showDot={false}>
          Delivery
        </Badge>
      );
    default:
      return <Badge size={size}>{type}</Badge>;
  }
}

export function TableStatusBadge({
  status,
  size = "sm",
}: {
  status: TableStatus;
  size?: "sm" | "md";
}) {
  switch (status) {
    case "AVAILABLE":
      return (
        <Badge variant="available" size={size} showDot>
          Available
        </Badge>
      );
    case "OCCUPIED":
      return (
        <Badge variant="occupied" size={size} showDot>
          Occupied
        </Badge>
      );
    case "RESERVED":
      return (
        <Badge variant="warning" size={size} showDot>
          Reserved
        </Badge>
      );
    case "CLEANING":
      return (
        <Badge variant="cleaning" size={size} showDot>
          Cleaning
        </Badge>
      );
    case "OUT_OF_SERVICE":
      return (
        <Badge variant="maintenance" size={size} showDot={false}>
          Out of Service
        </Badge>
      );
    default:
      return <Badge size={size}>{status}</Badge>;
  }
}

export function OrderItemStatusBadge({
  status,
  size = "sm",
}: {
  status: OrderItemStatus;
  size?: "sm" | "md";
}) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="pending" size={size}>
          Pending
        </Badge>
      );
    case "CONFIRMED":
      return (
        <Badge variant="confirmed" size={size}>
          Confirmed
        </Badge>
      );
    case "SERVED":
      return (
        <Badge variant="checked_in" size={size}>
          Served
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
