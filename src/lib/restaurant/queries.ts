// ============================================================
// STAYHUB RESTAURANT QUERIES (Phase 12)
// ============================================================

import { createClient } from "@/lib/supabase/client";
import type {
  Restaurant,
  RestaurantArea,
  RestaurantTable,
  MenuCategory,
  MenuItem,
  RestaurantOrder,
  RestaurantOrderItem,
  RestaurantOrderEvent,
  RestaurantKPIs,
  OrderFilterParams,
} from "./types";

/**
 * Fetch all restaurants belonging to a property
 */
export async function getRestaurants(
  propertyId: string,
  includeInactive = false
): Promise<Restaurant[]> {
  const supabase = createClient();
  let query = supabase
    .from("restaurants")
    .select("*")
    .eq("property_id", propertyId)
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching restaurants:", error);
    return [];
  }
  return data as Restaurant[];
}

/**
 * Fetch a single restaurant by ID
 */
export async function getRestaurantById(
  restaurantId: string
): Promise<Restaurant | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .single();

  if (error) {
    console.error("Error fetching restaurant by ID:", error);
    return null;
  }
  return data as Restaurant;
}

/**
 * Fetch all areas for a restaurant
 */
export async function getRestaurantAreas(
  restaurantId: string,
  includeInactive = false
): Promise<RestaurantArea[]> {
  const supabase = createClient();
  let query = supabase
    .from("restaurant_areas")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching restaurant areas:", error);
    return [];
  }
  return data as RestaurantArea[];
}

/**
 * Fetch tables for a restaurant with joined area name and active order status
 */
export async function getRestaurantTables(
  restaurantId: string,
  includeInactive = false
): Promise<RestaurantTable[]> {
  const supabase = createClient();
  let query = supabase
    .from("restaurant_tables")
    .select(`
      *,
      restaurant_areas:area_id ( name )
    `)
    .eq("restaurant_id", restaurantId)
    .order("table_number", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching restaurant tables:", error);
    return [];
  }

  // Fetch any active orders for these tables
  const { data: activeOrders } = await supabase
    .from("restaurant_orders")
    .select("id, order_number, table_id")
    .eq("restaurant_id", restaurantId)
    .in("status", ["OPEN", "CONFIRMED", "PREPARING", "READY", "SERVED"])
    .not("table_id", "is", null);

  const activeOrderMap = new Map<string, { id: string; order_number: string }>();
  if (activeOrders) {
    for (const ord of activeOrders) {
      if (ord.table_id) {
        activeOrderMap.set(ord.table_id, { id: ord.id, order_number: ord.order_number });
      }
    }
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    restaurant_id: row.restaurant_id as string,
    area_id: (row.area_id as string) || null,
    table_number: row.table_number as string,
    display_name: (row.display_name as string) || null,
    capacity: (row.capacity as number) || 4,
    status: row.status as RestaurantTable["status"],
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    area_name: (row.restaurant_areas as { name?: string })?.name || null,
    active_order_id: activeOrderMap.get(row.id as string)?.id || null,
    active_order_number: activeOrderMap.get(row.id as string)?.order_number || null,
  })) as RestaurantTable[];
}

/**
 * Fetch menu categories with item counts
 */
export async function getMenuCategories(
  restaurantId: string,
  includeInactive = false
): Promise<MenuCategory[]> {
  const supabase = createClient();
  let query = supabase
    .from("menu_categories")
    .select(`
      *,
      menu_items:menu_items ( id, is_active )
    `)
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching menu categories:", error);
    return [];
  }

  return (data || []).map((cat: Record<string, unknown>) => ({
    id: cat.id as string,
    restaurant_id: cat.restaurant_id as string,
    name: cat.name as string,
    description: (cat.description as string) || null,
    display_order: (cat.display_order as number) || 0,
    is_active: Boolean(cat.is_active),
    created_at: cat.created_at as string,
    updated_at: cat.updated_at as string,
    item_count: ((cat.menu_items as Array<{ id: string; is_active: boolean }>) || []).filter(
      (item) => includeInactive || item.is_active
    ).length,
  })) as MenuCategory[];
}

/**
 * Fetch menu items for a restaurant with category information
 */
export async function getMenuItems(
  restaurantId: string,
  includeInactive = false,
  categoryId?: string
): Promise<MenuItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("menu_items")
    .select(`
      *,
      menu_categories:category_id ( name )
    `)
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching menu items:", error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    restaurant_id: row.restaurant_id as string,
    category_id: row.category_id as string,
    name: row.name as string,
    short_name: (row.short_name as string) || null,
    sku: (row.sku as string) || null,
    description: (row.description as string) || null,
    price: Number(row.price),
    currency: (row.currency as string) || "USD",
    is_available: Boolean(row.is_available),
    is_active: Boolean(row.is_active),
    display_order: (row.display_order as number) || 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    category_name: (row.menu_categories as { name?: string })?.name || null,
  })) as MenuItem[];
}

/**
 * Fetch filtered restaurant orders
 */
export async function getRestaurantOrders(
  propertyId: string,
  params: OrderFilterParams = {}
): Promise<{ orders: RestaurantOrder[]; count: number }> {
  const supabase = createClient();
  let query = supabase
    .from("restaurant_orders")
    .select(
      `
      *,
      restaurants:restaurant_id ( name ),
      restaurant_tables:table_id ( table_number, display_name ),
      profiles:created_by ( full_name ),
      guests:guest_id ( first_name, last_name )
    `,
      { count: "exact" }
    )
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (params.restaurantId && params.restaurantId !== "ALL") {
    query = query.eq("restaurant_id", params.restaurantId);
  }

  if (params.status && params.status !== "ALL") {
    query = query.eq("status", params.status);
  }

  if (params.orderType && params.orderType !== "ALL") {
    query = query.eq("order_type", params.orderType);
  }

  if (params.tableId) {
    query = query.eq("table_id", params.tableId);
  }

  if (params.date) {
    const startOfDay = `${params.date}T00:00:00.000Z`;
    const endOfDay = `${params.date}T23:59:59.999Z`;
    query = query.gte("created_at", startOfDay).lte("created_at", endOfDay);
  }

  if (params.search && params.search.trim()) {
    query = query.ilike("order_number", `%${params.search.trim()}%`);
  }

  if (params.limit) {
    const offset = params.offset || 0;
    query = query.range(offset, offset + params.limit - 1);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("Error fetching restaurant orders:", error);
    return { orders: [], count: 0 };
  }

  const orders: RestaurantOrder[] = (data || []).map((row: Record<string, unknown>) => {
    const rest = row.restaurants as { name?: string } | null;
    const table = row.restaurant_tables as { table_number?: string; display_name?: string } | null;
    const profile = row.profiles as { full_name?: string } | null;
    const guest = row.guests as { first_name?: string; last_name?: string } | null;

    return {
      id: row.id as string,
      property_id: row.property_id as string,
      restaurant_id: row.restaurant_id as string,
      table_id: (row.table_id as string) || null,
      order_number: row.order_number as string,
      order_type: row.order_type as RestaurantOrder["order_type"],
      status: row.status as RestaurantOrder["status"],
      guest_id: (row.guest_id as string) || null,
      stay_id: (row.stay_id as string) || null,
      created_by: (row.created_by as string) || null,
      assigned_to: (row.assigned_to as string) || null,
      notes: (row.notes as string) || null,
      subtotal: Number(row.subtotal),
      discount_amount: Number(row.discount_amount),
      tax_amount: Number(row.tax_amount),
      service_charge_amount: Number(row.service_charge_amount),
      total_amount: Number(row.total_amount),
      currency: (row.currency as string) || "USD",
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      completed_at: (row.completed_at as string) || null,
      cancelled_at: (row.cancelled_at as string) || null,
      cancelled_by: (row.cancelled_by as string) || null,
      cancellation_reason: (row.cancellation_reason as string) || null,
      restaurant_name: rest?.name || undefined,
      table_number: table?.table_number || null,
      table_display_name: table?.display_name || null,
      creator_name: profile?.full_name || null,
      guest_name: guest ? `${guest.first_name} ${guest.last_name}` : null,
    };
  });

  return { orders, count: count || 0 };
}

/**
 * Fetch a single order with items and audit timeline
 */
export async function getRestaurantOrderById(
  orderId: string
): Promise<RestaurantOrder | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("restaurant_orders")
    .select(
      `
      *,
      restaurants:restaurant_id ( name ),
      restaurant_tables:table_id ( table_number, display_name ),
      profiles:created_by ( full_name ),
      guests:guest_id ( first_name, last_name )
    `
    )
    .eq("id", orderId)
    .single();

  if (error || !data) {
    console.error("Error fetching order by ID:", error);
    return null;
  }

  // Fetch items
  const { data: itemsData } = await supabase
    .from("restaurant_order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const items: RestaurantOrderItem[] = (itemsData || []).map((it: Record<string, unknown>) => ({
    id: it.id as string,
    order_id: it.order_id as string,
    menu_item_id: (it.menu_item_id as string) || null,
    item_name: it.item_name as string,
    unit_price: Number(it.unit_price),
    quantity: (it.quantity as number) || 1,
    discount_amount: Number(it.discount_amount),
    tax_amount: Number(it.tax_amount),
    line_total: Number(it.line_total),
    notes: (it.notes as string) || null,
    status: it.status as RestaurantOrderItem["status"],
    created_at: it.created_at as string,
    updated_at: it.updated_at as string,
  }));

  // Fetch timeline events
  const { data: eventsData } = await supabase
    .from("restaurant_order_events")
    .select(`
      *,
      profiles:performed_by ( full_name )
    `)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const events: RestaurantOrderEvent[] = (eventsData || []).map((ev: Record<string, unknown>) => ({
    id: ev.id as string,
    property_id: ev.property_id as string,
    order_id: ev.order_id as string,
    event_type: ev.event_type as RestaurantOrderEvent["event_type"],
    from_status: (ev.from_status as string) || null,
    to_status: (ev.to_status as string) || null,
    performed_by: (ev.performed_by as string) || null,
    notes: (ev.notes as string) || null,
    created_at: ev.created_at as string,
    performer_name: (ev.profiles as { full_name?: string })?.full_name || null,
  }));

  return {
    id: data.id,
    property_id: data.property_id,
    restaurant_id: data.restaurant_id,
    table_id: data.table_id,
    order_number: data.order_number,
    order_type: data.order_type,
    status: data.status,
    guest_id: data.guest_id,
    stay_id: data.stay_id,
    created_by: data.created_by,
    assigned_to: data.assigned_to,
    notes: data.notes,
    subtotal: Number(data.subtotal),
    discount_amount: Number(data.discount_amount),
    tax_amount: Number(data.tax_amount),
    service_charge_amount: Number(data.service_charge_amount),
    total_amount: Number(data.total_amount),
    currency: data.currency,
    created_at: data.created_at,
    updated_at: data.updated_at,
    completed_at: data.completed_at,
    cancelled_at: data.cancelled_at,
    cancelled_by: data.cancelled_by,
    cancellation_reason: data.cancellation_reason,
    restaurant_name: data.restaurants?.name || undefined,
    table_number: data.restaurant_tables?.table_number || null,
    table_display_name: data.restaurant_tables?.display_name || null,
    creator_name: data.profiles?.full_name || null,
    guest_name: data.guests ? `${data.guests.first_name} ${data.guests.last_name}` : null,
    items,
    events,
  };
}

/**
 * Fetch Restaurant KPIs
 */
export async function getRestaurantKPIs(
  propertyId: string,
  restaurantId?: string
): Promise<RestaurantKPIs> {
  const supabase = createClient();

  // 1. Open Orders
  let openOrdersQuery = supabase
    .from("restaurant_orders")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .in("status", ["OPEN", "CONFIRMED", "PREPARING", "READY", "SERVED"]);

  if (restaurantId && restaurantId !== "ALL") {
    openOrdersQuery = openOrdersQuery.eq("restaurant_id", restaurantId);
  }
  const { count: openOrdersCount } = await openOrdersQuery;

  // 2. Active Tables vs Available Tables
  let tablesQuery = supabase
    .from("restaurant_tables")
    .select("id, status, restaurant_id, is_active")
    .eq("is_active", true);

  if (restaurantId && restaurantId !== "ALL") {
    tablesQuery = tablesQuery.eq("restaurant_id", restaurantId);
  }
  const { data: tables } = await tablesQuery;

  let activeTablesCount = 0;
  let availableTablesCount = 0;
  if (tables) {
    for (const t of tables) {
      if (t.status === "OCCUPIED") activeTablesCount++;
      if (t.status === "AVAILABLE") availableTablesCount++;
    }
  }

  // 3. Today's Orders & Today's Order Sales
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  let todayOrdersQuery = supabase
    .from("restaurant_orders")
    .select("id, status, total_amount")
    .eq("property_id", propertyId)
    .gte("created_at", todayIso);

  if (restaurantId && restaurantId !== "ALL") {
    todayOrdersQuery = todayOrdersQuery.eq("restaurant_id", restaurantId);
  }

  const { data: todayOrders } = await todayOrdersQuery;

  let todayOrdersCount = 0;
  let todayOrderSales = 0;
  let cancelledOrdersCount = 0;

  if (todayOrders) {
    for (const ord of todayOrders) {
      if (ord.status === "CANCELLED") {
        cancelledOrdersCount++;
      } else {
        todayOrdersCount++;
        todayOrderSales += Number(ord.total_amount || 0);
      }
    }
  }

  return {
    open_orders_count: openOrdersCount || 0,
    active_tables_count: activeTablesCount,
    available_tables_count: availableTablesCount,
    today_orders_count: todayOrdersCount,
    today_order_sales: Number(todayOrderSales.toFixed(2)),
    cancelled_orders_count: cancelledOrdersCount,
  };
}
