// ============================================================
// STAYHUB KITCHEN DISPLAY SYSTEM (KDS) QUERIES (Phase 13)
// ============================================================

import { createClient } from "@/lib/supabase/client";
import type {
  KitchenStation,
  MenuItemKitchenStation,
  KitchenTicket,
  KitchenTicketItem,
  KitchenTicketEvent,
  KdsKpiSummary,
  KitchenTicketStatus,
  KitchenTicketItemStatus,
  KitchenEventType,
  KitchenPriority,
} from "./types";
import { OrderType } from "@/lib/restaurant/types";

export interface KitchenTicketFilterParams {
  restaurantId?: string;
  stationId?: string;
  status?: KitchenTicketStatus | "ALL";
  search?: string;
  date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch all kitchen stations for a restaurant outlet
 */
export async function getKitchenStations(
  restaurantId: string,
  activeOnly: boolean = true
): Promise<KitchenStation[]> {
  const supabase = createClient();
  let query = supabase
    .from("kitchen_stations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching kitchen stations:", error);
    return [];
  }
  return (data || []) as KitchenStation[];
}

/**
 * Fetch a single kitchen station by ID
 */
export async function getKitchenStationById(
  stationId: string
): Promise<KitchenStation | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kitchen_stations")
    .select("*")
    .eq("id", stationId)
    .single();

  if (error || !data) {
    return null;
  }
  return data as KitchenStation;
}

/**
 * Fetch all menu item routings for a restaurant
 */
export async function getMenuItemKitchenStations(
  restaurantId: string
): Promise<MenuItemKitchenStation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("menu_item_kitchen_stations")
    .select(`
      id,
      menu_item_id,
      kitchen_station_id,
      is_primary,
      display_order,
      created_at,
      updated_at,
      kitchen_stations!inner (
        name,
        code,
        restaurant_id
      )
    `)
    .eq("kitchen_stations.restaurant_id", restaurantId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching menu item station routings:", error);
    return [];
  }

  type StationRoutingRow = {
    id: string;
    menu_item_id: string;
    kitchen_station_id: string;
    is_primary: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
    kitchen_stations?: { name: string; code: string; restaurant_id: string } | null;
  };

  return ((data as unknown as StationRoutingRow[]) || []).map((row) => ({
    id: row.id,
    menu_item_id: row.menu_item_id,
    kitchen_station_id: row.kitchen_station_id,
    is_primary: row.is_primary,
    display_order: row.display_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    station_name: row.kitchen_stations?.name,
    station_code: row.kitchen_stations?.code,
  }));
}

/**
 * Fetch unrouted menu items for a restaurant (items without primary kitchen station)
 */
export async function getUnroutedMenuItems(
  restaurantId: string
): Promise<{ id: string; name: string; category_name?: string }[]> {
  const supabase = createClient();
  const { data: menuItems, error: itemsError } = await supabase
    .from("menu_items")
    .select(`
      id,
      name,
      menu_categories (
        name
      )
    `)
    .eq("restaurant_id", restaurantId)
    .eq("is_available", true);

  if (itemsError || !menuItems) {
    return [];
  }

  const { data: routings, error: routingsError } = await supabase
    .from("menu_item_kitchen_stations")
    .select("menu_item_id");

  if (routingsError) return [];

  const routedItemIds = new Set((routings || []).map((r) => r.menu_item_id));

  type MenuItemRow = {
    id: string;
    name: string;
    menu_categories?: { name: string } | null;
  };

  return (menuItems as unknown as MenuItemRow[])
    .filter((item) => !routedItemIds.has(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      category_name: item.menu_categories?.name,
    }));
}

/**
 * Fetch active Kitchen Tickets for live KDS display (QUEUED, IN_PROGRESS, READY)
 */
export async function getActiveKitchenTickets(
  propertyId: string,
  restaurantId?: string,
  stationId?: string
): Promise<KitchenTicket[]> {
  const supabase = createClient();

  let ticketsQuery = supabase
    .from("kitchen_tickets")
    .select(`
      id,
      property_id,
      restaurant_id,
      restaurant_order_id,
      ticket_number,
      status,
      priority,
      fired_at,
      started_at,
      ready_at,
      completed_at,
      created_at,
      updated_at,
      restaurants (
        name
      ),
      restaurant_orders (
        order_number,
        order_type,
        notes,
        restaurant_tables (
          table_number,
          display_name
        )
      )
    `)
    .eq("property_id", propertyId)
    .in("status", ["QUEUED", "IN_PROGRESS", "READY"])
    .order("fired_at", { ascending: true });

  if (restaurantId && restaurantId !== "ALL") {
    ticketsQuery = ticketsQuery.eq("restaurant_id", restaurantId);
  }

  const { data: ticketsData, error: ticketsError } = await ticketsQuery;
  if (ticketsError || !ticketsData) {
    console.error("Error fetching active kitchen tickets:", ticketsError);
    return [];
  }

  if (ticketsData.length === 0) {
    return [];
  }

  const ticketIds = ticketsData.map((t) => t.id);

  let itemsQuery = supabase
    .from("kitchen_ticket_items")
    .select(`
      id,
      kitchen_ticket_id,
      restaurant_order_item_id,
      station_id,
      item_name,
      quantity,
      notes,
      status,
      remake_count,
      remake_reason,
      started_at,
      ready_at,
      completed_at,
      created_at,
      updated_at,
      kitchen_stations (
        name,
        code
      )
    `)
    .in("kitchen_ticket_id", ticketIds);

  if (stationId && stationId !== "ALL") {
    if (stationId === "UNROUTED") {
      itemsQuery = itemsQuery.is("station_id", null);
    } else {
      itemsQuery = itemsQuery.eq("station_id", stationId);
    }
  }

  const { data: itemsData, error: itemsError } = await itemsQuery;
  if (itemsError) {
    console.error("Error fetching kitchen ticket items:", itemsError);
  }

  type DbTicketItemRow = {
    id: string;
    kitchen_ticket_id: string;
    restaurant_order_item_id: string;
    station_id: string | null;
    item_name: string;
    quantity: number;
    notes: string | null;
    status: KitchenTicketItemStatus;
    remake_count?: number | null;
    remake_reason?: string | null;
    started_at?: string | null;
    ready_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
    kitchen_stations?: { name: string; code: string } | null;
  };

  const itemsByTicket: Record<string, KitchenTicketItem[]> = {};
  ((itemsData as unknown as DbTicketItemRow[]) || []).forEach((item) => {
    if (!itemsByTicket[item.kitchen_ticket_id]) {
      itemsByTicket[item.kitchen_ticket_id] = [];
    }
    itemsByTicket[item.kitchen_ticket_id].push({
      id: item.id,
      kitchen_ticket_id: item.kitchen_ticket_id,
      restaurant_order_item_id: item.restaurant_order_item_id,
      station_id: item.station_id ?? null,
      item_name: item.item_name,
      quantity: item.quantity,
      notes: item.notes ?? null,
      status: item.status,
      remake_count: item.remake_count || 0,
      remake_reason: item.remake_reason ?? null,
      started_at: item.started_at ?? null,
      ready_at: item.ready_at ?? null,
      completed_at: item.completed_at ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      station_name: item.kitchen_stations?.name || "Unrouted",
      station_code: item.kitchen_stations?.code || "UNROUTED",
    });
  });

  const nowMs = Date.now();

  type DbTicketRow = {
    id: string;
    property_id: string;
    restaurant_id: string;
    restaurant_order_id: string;
    ticket_number: string;
    status: KitchenTicketStatus;
    priority: KitchenPriority;
    fired_at: string;
    started_at?: string | null;
    ready_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
    restaurants?: { name: string } | null;
    restaurant_orders?: {
      order_number: string;
      order_type: OrderType;
      notes?: string | null;
      restaurant_tables?: { table_number: string; display_name?: string | null } | null;
    } | null;
  };

  const formatted: KitchenTicket[] = [];

  ((ticketsData as unknown as DbTicketRow[]) || []).forEach((t) => {
    const items = itemsByTicket[t.id] || [];
    // If filtering by station and ticket has 0 matching items, filter ticket out
    if (stationId && stationId !== "ALL" && items.length === 0) {
      return;
    }

    const firedMs = new Date(t.fired_at).getTime();
    const startedMs = t.started_at ? new Date(t.started_at).getTime() : null;
    const waitingSeconds = Math.max(0, Math.floor((nowMs - firedMs) / 1000));
    const prepSeconds = startedMs ? Math.max(0, Math.floor((nowMs - startedMs) / 1000)) : 0;
    const isDelayed = waitingSeconds > 900; // > 15 minutes waiting

    formatted.push({
      id: t.id,
      property_id: t.property_id,
      restaurant_id: t.restaurant_id,
      restaurant_order_id: t.restaurant_order_id,
      ticket_number: t.ticket_number,
      status: t.status,
      priority: t.priority,
      fired_at: t.fired_at,
      started_at: t.started_at ?? null,
      ready_at: t.ready_at ?? null,
      completed_at: t.completed_at ?? null,
      created_at: t.created_at,
      updated_at: t.updated_at,
      restaurant_name: t.restaurants?.name,
      order_number: t.restaurant_orders?.order_number,
      order_type: t.restaurant_orders?.order_type as OrderType,
      order_notes: t.restaurant_orders?.notes ?? null,
      table_number: t.restaurant_orders?.restaurant_tables?.table_number ?? null,
      table_display_name: t.restaurant_orders?.restaurant_tables?.display_name ?? null,
      items,
      waiting_seconds: waitingSeconds,
      prep_seconds: prepSeconds,
      is_delayed: isDelayed,
    });
  });

  return formatted;
}

/**
 * Fetch full ticket details by ID including items and audit events
 */
export async function getKitchenTicketById(
  ticketId: string
): Promise<KitchenTicket | null> {
  const supabase = createClient();
  const { data: t, error } = await supabase
    .from("kitchen_tickets")
    .select(`
      id,
      property_id,
      restaurant_id,
      restaurant_order_id,
      ticket_number,
      status,
      priority,
      fired_at,
      started_at,
      ready_at,
      completed_at,
      created_at,
      updated_at,
      restaurants (
        name
      ),
      restaurant_orders (
        order_number,
        order_type,
        notes,
        restaurant_tables (
          table_number,
          display_name
        )
      )
    `)
    .eq("id", ticketId)
    .single();

  if (error || !t) {
    return null;
  }

  // Fetch Items
  const { data: itemsData } = await supabase
    .from("kitchen_ticket_items")
    .select(`
      id,
      kitchen_ticket_id,
      restaurant_order_item_id,
      station_id,
      item_name,
      quantity,
      notes,
      status,
      remake_count,
      remake_reason,
      started_at,
      ready_at,
      completed_at,
      created_at,
      updated_at,
      kitchen_stations (
        name,
        code
      )
    `)
    .eq("kitchen_ticket_id", ticketId);

  // Fetch Events
  const { data: eventsData } = await supabase
    .from("kitchen_ticket_events")
    .select(`
      id,
      property_id,
      ticket_id,
      ticket_item_id,
      event_type,
      from_status,
      to_status,
      performed_by,
      notes,
      created_at,
      profiles (
        full_name
      )
    `)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  type DbItemDetail = {
    id: string;
    kitchen_ticket_id: string;
    restaurant_order_item_id: string;
    station_id: string | null;
    item_name: string;
    quantity: number;
    notes: string | null;
    status: KitchenTicketItemStatus;
    remake_count?: number | null;
    remake_reason?: string | null;
    started_at?: string | null;
    ready_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
    kitchen_stations?: { name: string; code: string } | null;
  };

  type DbEventDetail = {
    id: string;
    property_id: string;
    ticket_id: string;
    ticket_item_id?: string | null;
    event_type: KitchenEventType;
    from_status?: string | null;
    to_status?: string | null;
    performed_by?: string | null;
    notes?: string | null;
    created_at: string;
    profiles?: { full_name: string } | null;
  };

  const items: KitchenTicketItem[] = ((itemsData as unknown as DbItemDetail[]) || []).map((item) => ({
    id: item.id,
    kitchen_ticket_id: item.kitchen_ticket_id,
    restaurant_order_item_id: item.restaurant_order_item_id,
    station_id: item.station_id ?? null,
    item_name: item.item_name,
    quantity: item.quantity,
    notes: item.notes ?? null,
    status: item.status,
    remake_count: item.remake_count || 0,
    remake_reason: item.remake_reason ?? null,
    started_at: item.started_at ?? null,
    ready_at: item.ready_at ?? null,
    completed_at: item.completed_at ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at,
    station_name: item.kitchen_stations?.name || "Unrouted",
    station_code: item.kitchen_stations?.code || "UNROUTED",
  }));

  const events: KitchenTicketEvent[] = ((eventsData as unknown as DbEventDetail[]) || []).map((ev) => ({
    id: ev.id,
    property_id: ev.property_id,
    ticket_id: ev.ticket_id,
    ticket_item_id: ev.ticket_item_id ?? null,
    event_type: ev.event_type,
    from_status: ev.from_status ?? null,
    to_status: ev.to_status ?? null,
    performed_by: ev.performed_by ?? null,
    notes: ev.notes ?? null,
    created_at: ev.created_at,
    performer_name: ev.profiles?.full_name ?? null,
  }));

  type DbTicketDetailRow = {
    id: string;
    property_id: string;
    restaurant_id: string;
    restaurant_order_id: string;
    ticket_number: string;
    status: KitchenTicketStatus;
    priority: KitchenPriority;
    fired_at: string;
    started_at?: string | null;
    ready_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
    restaurants?: { name: string } | null;
    restaurant_orders?: {
      order_number: string;
      order_type: OrderType;
      notes?: string | null;
      restaurant_tables?: {
        table_number: string;
        display_name?: string | null;
      } | null;
    } | null;
  };

  const tObj = t as unknown as DbTicketDetailRow;

  return {
    id: tObj.id,
    property_id: tObj.property_id,
    restaurant_id: tObj.restaurant_id,
    restaurant_order_id: tObj.restaurant_order_id,
    ticket_number: tObj.ticket_number,
    status: tObj.status,
    priority: tObj.priority,
    fired_at: tObj.fired_at,
    started_at: tObj.started_at ?? null,
    ready_at: tObj.ready_at ?? null,
    completed_at: tObj.completed_at ?? null,
    created_at: tObj.created_at,
    updated_at: tObj.updated_at,
    restaurant_name: tObj.restaurants?.name,
    order_number: tObj.restaurant_orders?.order_number,
    order_type: tObj.restaurant_orders?.order_type,
    order_notes: tObj.restaurant_orders?.notes ?? null,
    table_number: tObj.restaurant_orders?.restaurant_tables?.table_number ?? null,
    table_display_name: tObj.restaurant_orders?.restaurant_tables?.display_name ?? null,
    items,
    events,
  };
}

/**
 * Fetch kitchen ticket by Restaurant Order ID (for POS order details)
 */
export async function getKitchenTicketByOrderId(
  orderId: string
): Promise<KitchenTicket | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kitchen_tickets")
    .select("id")
    .eq("restaurant_order_id", orderId)
    .single();

  if (error || !data) {
    return null;
  }

  return getKitchenTicketById(data.id);
}

/**
 * Fetch Kitchen History (completed / cancelled tickets)
 */
export async function getKitchenTicketHistory(
  propertyId: string,
  params: KitchenTicketFilterParams = {}
): Promise<{ tickets: KitchenTicket[]; count: number }> {
  const supabase = createClient();
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  let query = supabase
    .from("kitchen_tickets")
    .select(`
      id,
      property_id,
      restaurant_id,
      restaurant_order_id,
      ticket_number,
      status,
      priority,
      fired_at,
      started_at,
      ready_at,
      completed_at,
      created_at,
      updated_at,
      restaurants (
        name
      ),
      restaurant_orders (
        order_number,
        order_type,
        restaurant_tables (
          table_number
        )
      )
    `, { count: "exact" })
    .eq("property_id", propertyId);

  if (params.restaurantId && params.restaurantId !== "ALL") {
    query = query.eq("restaurant_id", params.restaurantId);
  }

  if (params.status && params.status !== "ALL") {
    query = query.eq("status", params.status);
  } else {
    query = query.in("status", ["COMPLETED", "CANCELLED", "READY"]);
  }

  if (params.search) {
    query = query.ilike("ticket_number", `%${params.search}%`);
  }

  if (params.date) {
    const start = `${params.date}T00:00:00.000Z`;
    const end = `${params.date}T23:59:59.999Z`;
    query = query.gte("created_at", start).lte("created_at", end);
  }

  query = query.order("completed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("Error fetching kitchen ticket history:", error);
    return { tickets: [], count: 0 };
  }

  type DbHistoryRow = {
    id: string;
    property_id: string;
    restaurant_id: string;
    restaurant_order_id: string;
    ticket_number: string;
    status: KitchenTicketStatus;
    priority: KitchenPriority;
    fired_at: string;
    started_at?: string | null;
    ready_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
    restaurants?: { name: string } | null;
    restaurant_orders?: {
      order_number: string;
      order_type: OrderType;
      restaurant_tables?: { table_number: string } | null;
    } | null;
  };

  const tickets: KitchenTicket[] = ((data as unknown as DbHistoryRow[]) || []).map((t) => ({
    id: t.id,
    property_id: t.property_id,
    restaurant_id: t.restaurant_id,
    restaurant_order_id: t.restaurant_order_id,
    ticket_number: t.ticket_number,
    status: t.status,
    priority: t.priority,
    fired_at: t.fired_at,
    started_at: t.started_at ?? null,
    ready_at: t.ready_at ?? null,
    completed_at: t.completed_at ?? null,
    created_at: t.created_at,
    updated_at: t.updated_at,
    restaurant_name: t.restaurants?.name,
    order_number: t.restaurant_orders?.order_number,
    order_type: t.restaurant_orders?.order_type,
    table_number: t.restaurant_orders?.restaurant_tables?.table_number ?? null,
  }));

  return { tickets, count: count || 0 };
}

/**
 * Fetch KDS Dashboard KPIs
 */
export async function getKdsKpis(
  propertyId: string,
  restaurantId?: string
): Promise<KdsKpiSummary> {
  const supabase = createClient();

  let query = supabase
    .from("kitchen_tickets")
    .select("id, status, fired_at, started_at, ready_at, completed_at")
    .eq("property_id", propertyId);

  if (restaurantId && restaurantId !== "ALL") {
    query = query.eq("restaurant_id", restaurantId);
  }

  const { data: tickets, error } = await query;
  if (error || !tickets) {
    return {
      queuedTickets: 0,
      inProgressTickets: 0,
      readyTickets: 0,
      completedTodayTickets: 0,
      delayedTickets: 0,
      unroutedItemsCount: 0,
      remakeCount: 0,
      avgPrepMinutes: 0,
    };
  }

  const nowMs = Date.now();
  let queued = 0;
  let inProgress = 0;
  let ready = 0;
  let completedToday = 0;
  let delayed = 0;
  let totalPrepSeconds = 0;
  let prepCalculatedCount = 0;

  const todayStr = new Date().toISOString().split("T")[0];

  tickets.forEach((t) => {
    if (t.status === "QUEUED") {
      queued += 1;
      const waitingSecs = (nowMs - new Date(t.fired_at).getTime()) / 1000;
      if (waitingSecs > 900) delayed += 1;
    } else if (t.status === "IN_PROGRESS") {
      inProgress += 1;
      const waitingSecs = (nowMs - new Date(t.fired_at).getTime()) / 1000;
      if (waitingSecs > 900) delayed += 1;
    } else if (t.status === "READY") {
      ready += 1;
    } else if (t.status === "COMPLETED") {
      if (t.completed_at && t.completed_at.startsWith(todayStr)) {
        completedToday += 1;
      }
      if (t.started_at && t.completed_at) {
        const prepSecs = (new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 1000;
        if (prepSecs > 0) {
          totalPrepSeconds += prepSecs;
          prepCalculatedCount += 1;
        }
      }
    }
  });

  // Query unrouted items count
  let unroutedCount = 0;
  if (restaurantId && restaurantId !== "ALL") {
    const unrouted = await getUnroutedMenuItems(restaurantId);
    unroutedCount = unrouted.length;
  }

  // Query total remakes
  const { count: remakesCount } = await supabase
    .from("kitchen_ticket_items")
    .select("id", { count: "exact", head: true })
    .gt("remake_count", 0);

  const avgPrepMinutes = prepCalculatedCount > 0
    ? Math.round(totalPrepSeconds / prepCalculatedCount / 60)
    : 0;

  return {
    queuedTickets: queued,
    inProgressTickets: inProgress,
    readyTickets: ready,
    completedTodayTickets: completedToday,
    delayedTickets: delayed,
    unroutedItemsCount: unroutedCount,
    remakeCount: remakesCount || 0,
    avgPrepMinutes,
  };
}
