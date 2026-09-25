import { createClient } from "@/lib/supabase/client";
import { hashToken } from "@/lib/guest-portal/types";
import {
  GuestRestaurant,
  GuestMenuCategory,
  GuestOrderSummary,
  GuestOrderDetail,
} from "./types";

/**
 * Fetch active restaurants for a property available for guest dining
 */
export async function getGuestRestaurants(
  propertyId: string
): Promise<GuestRestaurant[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, property_id, name, code, cuisine_type, description, is_active, currency, opening_time, closing_time")
    .eq("property_id", propertyId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as GuestRestaurant[];
}

/**
 * Fetch menu categories and items for a restaurant
 */
export async function getGuestRestaurantMenu(
  restaurantId: string
): Promise<{
  restaurant: GuestRestaurant | null;
  categories: GuestMenuCategory[];
}> {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, property_id, name, code, cuisine_type, description, is_active, currency, opening_time, closing_time")
    .eq("id", restaurantId)
    .eq("is_active", true)
    .single();

  if (!restaurant) {
    return { restaurant: null, categories: [] };
  }

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, restaurant_id, name, description, display_order, is_active")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const { data: items } = await supabase
    .from("menu_items")
    .select("id, restaurant_id, category_id, name, description, short_name, price, currency, is_available, is_active, display_order")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const categoriesWithItems: GuestMenuCategory[] = (categories || []).map((cat) => ({
    ...cat,
    items: (items || []).filter((item) => item.category_id === cat.id),
  }));

  return {
    restaurant: restaurant as GuestRestaurant,
    categories: categoriesWithItems,
  };
}

/**
 * Fetch guest's active orders via validated session token
 */
export async function getGuestFoodOrders(rawSessionToken?: string): Promise<GuestOrderSummary[]> {
  if (!rawSessionToken) {
    return [];
  }

  const supabase = createClient();
  const sessionTokenHash = hashToken(rawSessionToken);

  const { data, error } = await supabase.rpc("get_guest_food_orders", {
    p_session_token_hash: sessionTokenHash,
  });

  if (error || !data?.success) {
    return [];
  }

  return (data.orders || []) as GuestOrderSummary[];
}

/**
 * Fetch detail of a guest's specific order via validated session token
 */
export async function getGuestFoodOrderDetail(
  orderId: string,
  rawSessionToken?: string
): Promise<GuestOrderDetail | null> {
  if (!rawSessionToken) {
    return null;
  }

  const supabase = createClient();
  const sessionTokenHash = hashToken(rawSessionToken);

  const { data, error } = await supabase.rpc("get_guest_food_order_detail", {
    p_session_token_hash: sessionTokenHash,
    p_order_id: orderId,
  });

  if (error || !data?.success || !data.order) {
    return null;
  }

  return data.order as GuestOrderDetail;
}
