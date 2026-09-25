// ============================================================
// STAYHUB KITCHEN DISPLAY SYSTEM (KDS) TYPES (Phase 13)
// ============================================================

import { OrderType } from "@/lib/restaurant/types";

export type KitchenStationCode =
  | "HOT_KITCHEN"
  | "COLD_KITCHEN"
  | "BAR"
  | "DESSERT"
  | "BAKERY"
  | string;

export type KitchenTicketStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type KitchenTicketItemStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"
  | "REMAKE";

export type KitchenPriority =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "URGENT";

export type KitchenEventType =
  | "TICKET_CREATED"
  | "TICKET_STARTED"
  | "ITEM_STARTED"
  | "ITEM_READY"
  | "TICKET_READY"
  | "ITEM_COMPLETED"
  | "TICKET_COMPLETED"
  | "ITEM_REQUEUED"
  | "ITEM_REMADE"
  | "TICKET_CANCELLED"
  | "PRIORITY_CHANGED"
  | "STATION_CHANGED";

export interface KitchenStation {
  id: string;
  restaurant_id: string;
  name: string;
  code: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItemKitchenStation {
  id: string;
  menu_item_id: string;
  kitchen_station_id: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  station_name?: string;
  station_code?: string;
}

export interface KitchenTicketItem {
  id: string;
  kitchen_ticket_id: string;
  restaurant_order_item_id: string;
  station_id: string | null;
  item_name: string;
  quantity: number;
  notes: string | null;
  status: KitchenTicketItemStatus;
  remake_count: number;
  remake_reason: string | null;
  started_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  station_name?: string | null;
  station_code?: string | null;
}

export interface KitchenTicket {
  id: string;
  property_id: string;
  restaurant_id: string;
  restaurant_order_id: string;
  ticket_number: string;
  status: KitchenTicketStatus;
  priority: KitchenPriority;
  fired_at: string;
  started_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined / computed fields
  order_number?: string;
  order_type?: OrderType;
  table_number?: string | null;
  table_display_name?: string | null;
  order_notes?: string | null;
  restaurant_name?: string;
  items?: KitchenTicketItem[];
  events?: KitchenTicketEvent[];
  // Durations (computed)
  waiting_seconds?: number;
  prep_seconds?: number;
  is_delayed?: boolean;
}

export interface KitchenTicketEvent {
  id: string;
  property_id: string;
  ticket_id: string;
  ticket_item_id: string | null;
  event_type: KitchenEventType;
  from_status: string | null;
  to_status: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  performer_name?: string | null;
}

export interface KdsKpiSummary {
  queuedTickets: number;
  inProgressTickets: number;
  readyTickets: number;
  completedTodayTickets: number;
  delayedTickets: number;
  unroutedItemsCount: number;
  remakeCount: number;
  avgPrepMinutes: number;
}
