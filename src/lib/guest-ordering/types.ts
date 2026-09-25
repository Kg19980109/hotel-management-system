/**
 * Types for Guest QR Food Ordering
 */

export interface GuestCartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  special_instructions?: string;
  category_id?: string;
  currency?: string;
}

export interface GuestCart {
  restaurant_id: string;
  restaurant_name: string;
  items: GuestCartItem[];
  notes?: string;
}

export interface GuestOrderItemSummary {
  id: string;
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  subtotal_price: number;
  notes?: string | null;
}

export interface GuestOrderSummary {
  id: string;
  order_number: string;
  restaurant_id: string;
  restaurant_name: string;
  order_type: string;
  status: string;
  total_amount: number;
  currency: string;
  item_count: number;
  created_at: string;
}

export interface GuestOrderDetail {
  id: string;
  order_number: string;
  restaurant_id: string;
  restaurant_name: string;
  order_type: string;
  status: string;
  kds_status?: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes?: string | null;
  created_at: string;
  completed_at?: string | null;
  items: GuestOrderItemSummary[];
}

export interface GuestRestaurant {
  id: string;
  property_id: string;
  name: string;
  code: string;
  cuisine_type?: string | null;
  description?: string | null;
  is_active: boolean;
  currency: string;
  opening_time?: string | null;
  closing_time?: string | null;
}

export interface GuestMenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  items?: GuestMenuItem[];
}

export interface GuestMenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description?: string | null;
  short_name?: string | null;
  price: number;
  currency: string;
  is_available: boolean;
  is_active: boolean;
  display_order: number;
}
