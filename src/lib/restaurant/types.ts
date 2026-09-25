// ============================================================
// STAYHUB RESTAURANT DOMAIN TYPES (Phase 12)
// ============================================================

export type TableStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "RESERVED"
  | "CLEANING"
  | "OUT_OF_SERVICE";

export type OrderType =
  | "DINE_IN"
  | "TAKEAWAY"
  | "DELIVERY"
  | "ROOM_SERVICE";

export type OrderStatus =
  | "DRAFT"
  | "OPEN"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED";

export type OrderItemStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "SERVED";

export type OrderEventType =
  | "CREATED"
  | "UPDATED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "ITEM_ADDED"
  | "ITEM_REMOVED"
  | "QUANTITY_CHANGED"
  | "DISCOUNT_APPLIED";

export interface Restaurant {
  id: string;
  property_id: string;
  name: string;
  code: string;
  description: string | null;
  currency: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantArea {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  area_id: string | null;
  table_number: string;
  display_name: string | null;
  capacity: number;
  status: TableStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations
  area_name?: string | null;
  active_order_id?: string | null;
  active_order_number?: string | null;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  short_name: string | null;
  sku: string | null;
  description: string | null;
  price: number;
  currency: string;
  is_available: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Joined relation
  category_name?: string | null;
}

export interface RestaurantOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  notes: string | null;
  status: OrderItemStatus;
  created_at: string;
  updated_at: string;
}

export interface RestaurantOrderEvent {
  id: string;
  property_id: string;
  order_id: string;
  event_type: OrderEventType;
  from_status: string | null;
  to_status: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  performer_name?: string | null;
}

export interface RestaurantOrder {
  id: string;
  property_id: string;
  restaurant_id: string;
  table_id: string | null;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  guest_id: string | null;
  stay_id: string | null;
  created_by: string | null;
  assigned_to: string | null;
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  service_charge_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  // Joined fields
  restaurant_name?: string;
  table_number?: string | null;
  table_display_name?: string | null;
  creator_name?: string | null;
  guest_name?: string | null;
  items?: RestaurantOrderItem[];
  events?: RestaurantOrderEvent[];
}

export interface RestaurantKPIs {
  open_orders_count: number;
  active_tables_count: number;
  available_tables_count: number;
  today_orders_count: number;
  today_order_sales: number;
  cancelled_orders_count: number;
}

export interface CartItemInput {
  menu_item_id: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  property_id: string;
  restaurant_id: string;
  order_type: OrderType;
  table_id?: string | null;
  guest_id?: string | null;
  stay_id?: string | null;
  notes?: string | null;
  discount_amount?: number;
  items: CartItemInput[];
}

export interface OrderFilterParams {
  restaurantId?: string;
  status?: OrderStatus | "ALL";
  orderType?: OrderType | "ALL";
  tableId?: string;
  date?: string; // YYYY-MM-DD
  search?: string;
  limit?: number;
  offset?: number;
}
