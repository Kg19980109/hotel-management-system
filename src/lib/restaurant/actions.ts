// ============================================================
// STAYHUB RESTAURANT SERVER ACTIONS (Phase 12)
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasRestaurantPermission, RestaurantPermission } from "./permissions";
import {
  CreateOrderInput,
  TableStatus,
} from "./types";

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SessionAuthResult {
  userId: string;
  roleCode: string;
}

/**
 * Authenticate session and check restaurant permission for the given property
 */
async function authenticateRestaurantSession(
  propertyId: string,
  requiredPermission?: RestaurantPermission
): Promise<{ auth?: SessionAuthResult; error?: string }> {
  if (!propertyId) {
    return { error: "Property context is required." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Authentication required to perform restaurant operations." };
  }

  // Verify membership and role
  const { data: membership, error: memberError } = await supabase
    .from("property_memberships")
    .select(`
      id,
      status,
      roles:role_id (
        code
      )
    `)
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();

  if (memberError || !membership) {
    return { error: "You do not have an active membership for this property." };
  }

  const roleData = membership.roles as unknown as { code: string } | null;
  const roleCode = roleData?.code || "";

  if (requiredPermission && !hasRestaurantPermission([roleCode], requiredPermission)) {
    return {
      error: `Access denied. Your role '${roleCode}' lacks '${requiredPermission}' permission.`,
    };
  }

  return { auth: { userId: user.id, roleCode } };
}

/**
 * 1. Create a new restaurant outlet
 */
export async function createRestaurantAction(
  propertyId: string,
  input: {
    name: string;
    code: string;
    description?: string;
    currency?: string;
    timezone?: string;
  }
): Promise<ActionResponse<{ id: string }>> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_MANAGE"
  );
  if (authError || !auth) return { success: false, error: authError };

  if (!input.name?.trim()) return { success: false, error: "Restaurant name is required." };
  if (!input.code?.trim()) return { success: false, error: "Restaurant code is required." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      property_id: propertyId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      description: input.description?.trim() || null,
      currency: input.currency || "INR",
      timezone: input.timezone || "UTC",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant");
  return { success: true, data: { id: data.id } };
}

/**
 * 2. Create a restaurant area
 */
export async function createAreaAction(
  propertyId: string,
  input: {
    restaurant_id: string;
    name: string;
    description?: string;
    display_order?: number;
  }
): Promise<ActionResponse<{ id: string }>> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_MANAGE"
  );
  if (authError || !auth) return { success: false, error: authError };

  if (!input.name?.trim()) return { success: false, error: "Area name is required." };
  if (!input.restaurant_id) return { success: false, error: "Restaurant ID is required." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_areas")
    .insert({
      restaurant_id: input.restaurant_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      display_order: input.display_order ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant");
  revalidatePath("/restaurant/tables");
  return { success: true, data: { id: data.id } };
}

/**
 * 3. Create a restaurant table
 */
export async function createTableAction(
  propertyId: string,
  input: {
    restaurant_id: string;
    area_id?: string | null;
    table_number: string;
    display_name?: string;
    capacity?: number;
  }
): Promise<ActionResponse<{ id: string }>> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_TABLE_MANAGE"
  );
  if (authError || !auth) return { success: false, error: authError };

  if (!input.table_number?.trim()) return { success: false, error: "Table number is required." };
  if (!input.restaurant_id) return { success: false, error: "Restaurant ID is required." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_tables")
    .insert({
      restaurant_id: input.restaurant_id,
      area_id: input.area_id || null,
      table_number: input.table_number.trim(),
      display_name: input.display_name?.trim() || null,
      capacity: input.capacity && input.capacity > 0 ? input.capacity : 4,
      status: "AVAILABLE",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant");
  revalidatePath("/restaurant/tables");
  revalidatePath("/restaurant/pos");
  return { success: true, data: { id: data.id } };
}

/**
 * 4. Update table status
 */
export async function updateTableStatusAction(
  propertyId: string,
  restaurantId: string,
  tableId: string,
  status: TableStatus
): Promise<ActionResponse> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_TABLE_MANAGE"
  );
  if (authError || !auth) return { success: false, error: authError };

  const supabase = await createClient();

  const { error } = await supabase.rpc("set_restaurant_table_status", {
    p_table_id: tableId,
    p_restaurant_id: restaurantId,
    p_status: status,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant/tables");
  revalidatePath("/restaurant/pos");
  return { success: true };
}

/**
 * 5. Deactivate a table (Soft delete)
 */
export async function deactivateTableAction(
  propertyId: string,
  tableId: string
): Promise<ActionResponse> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_TABLE_MANAGE"
  );
  if (authError || !auth) return { success: false, error: authError };

  const supabase = await createClient();

  // Check if table has active orders
  const { data: activeOrders } = await supabase
    .from("restaurant_orders")
    .select("id")
    .eq("table_id", tableId)
    .in("status", ["OPEN", "CONFIRMED", "PREPARING", "READY", "SERVED"])
    .limit(1);

  if (activeOrders && activeOrders.length > 0) {
    return { success: false, error: "Cannot deactivate table with active orders." };
  }

  const { error } = await supabase
    .from("restaurant_tables")
    .update({ is_active: false })
    .eq("id", tableId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant/tables");
  revalidatePath("/restaurant/pos");
  return { success: true };
}

/**
 * 6. Create menu category
 */
export async function createCategoryAction(
  propertyId: string,
  input: {
    restaurant_id: string;
    name: string;
    description?: string;
    display_order?: number;
  }
): Promise<ActionResponse<{ id: string }>> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_MENU_MANAGE"
  );
  if (authError || !auth) return { success: false, error: authError };

  if (!input.name?.trim()) return { success: false, error: "Category name is required." };
  if (!input.restaurant_id) return { success: false, error: "Restaurant ID is required." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menu_categories")
    .insert({
      restaurant_id: input.restaurant_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      display_order: input.display_order ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant/menu");
  revalidatePath("/restaurant/pos");
  return { success: true, data: { id: data.id } };
}

/**
 * 7. Create menu item
 */
export async function createMenuItemAction(
  propertyId: string,
  input: {
    restaurant_id: string;
    category_id: string;
    name: string;
    short_name?: string;
    sku?: string;
    description?: string;
    price: number;
    currency?: string;
    is_available?: boolean;
    display_order?: number;
  }
): Promise<ActionResponse<{ id: string }>> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_MENU_MANAGE"
  );
  if (authError || !auth) return { success: false, error: authError };

  if (!input.name?.trim()) return { success: false, error: "Item name is required." };
  if (input.price == null || isNaN(input.price) || input.price < 0) {
    return { success: false, error: "Valid price >= 0 is required." };
  }
  if (!input.restaurant_id) return { success: false, error: "Restaurant ID is required." };
  if (!input.category_id) return { success: false, error: "Category ID is required." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      restaurant_id: input.restaurant_id,
      category_id: input.category_id,
      name: input.name.trim(),
      short_name: input.short_name?.trim() || null,
      sku: input.sku?.trim() || null,
      description: input.description?.trim() || null,
      price: input.price,
      currency: input.currency || "INR",
      is_available: input.is_available ?? true,
      display_order: input.display_order ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant/menu");
  revalidatePath("/restaurant/pos");
  return { success: true, data: { id: data.id } };
}

/**
 * 8. Update menu item
 */
export async function updateMenuItemAction(
  propertyId: string,
  itemId: string,
  input: {
    name?: string;
    short_name?: string;
    sku?: string;
    description?: string;
    price?: number;
    is_available?: boolean;
    display_order?: number;
    category_id?: string;
  }
): Promise<ActionResponse> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_MENU_MANAGE"
  );
  if (authError || !auth) return { success: false, error: authError };

  if (input.price !== undefined && (isNaN(input.price) || input.price < 0)) {
    return { success: false, error: "Price cannot be negative." };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.short_name !== undefined) updateData.short_name = input.short_name.trim() || null;
  if (input.sku !== undefined) updateData.sku = input.sku.trim() || null;
  if (input.description !== undefined) updateData.description = input.description.trim() || null;
  if (input.price !== undefined) updateData.price = input.price;
  if (input.is_available !== undefined) updateData.is_available = input.is_available;
  if (input.display_order !== undefined) updateData.display_order = input.display_order;
  if (input.category_id !== undefined) updateData.category_id = input.category_id;

  const { error } = await supabase
    .from("menu_items")
    .update(updateData)
    .eq("id", itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant/menu");
  revalidatePath("/restaurant/pos");
  return { success: true };
}

/**
 * 9. Toggle menu item availability
 */
export async function toggleMenuItemAvailabilityAction(
  propertyId: string,
  itemId: string,
  isAvailable: boolean
): Promise<ActionResponse> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_MENU_MANAGE"
  );
  if (authError || !auth) return { success: false, error: authError };

  const supabase = await createClient();

  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant/menu");
  revalidatePath("/restaurant/pos");
  return { success: true };
}

/**
 * 10. Deactivate menu item (Soft delete)
 */
export async function deactivateMenuItemAction(
  propertyId: string,
  itemId: string
): Promise<ActionResponse> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_MENU_MANAGE"
  );
  if (authError || !auth) return { success: false, error: authError };

  const supabase = await createClient();

  const { error } = await supabase
    .from("menu_items")
    .update({ is_active: false })
    .eq("id", itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant/menu");
  revalidatePath("/restaurant/pos");
  return { success: true };
}

/**
 * 11. Create Restaurant POS Order (Atomic RPC invocation with server verification)
 */
export async function createOrderAction(
  input: CreateOrderInput
): Promise<ActionResponse<{ id: string; order_number: string }>> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    input.property_id,
    "RESTAURANT_ORDER_CREATE"
  );
  if (authError || !auth) return { success: false, error: authError };

  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Order must contain at least one item." };
  }

  if (input.order_type === "DINE_IN" && !input.table_id) {
    return { success: false, error: "Table selection is required for DINE_IN orders." };
  }

  if (input.discount_amount && input.discount_amount < 0) {
    return { success: false, error: "Discount amount cannot be negative." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_restaurant_order", {
    p_property_id: input.property_id,
    p_restaurant_id: input.restaurant_id,
    p_order_type: input.order_type,
    p_items: input.items,
    p_table_id: input.table_id || null,
    p_discount_amount: input.discount_amount || 0,
    p_tax_amount: 0,
    p_service_charge_amount: 0,
    p_notes: input.notes?.trim() || null,
    p_guest_id: input.guest_id || null,
    p_stay_id: input.stay_id || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant");
  revalidatePath("/restaurant/pos");
  revalidatePath("/restaurant/tables");
  revalidatePath("/restaurant/orders");

  return {
    success: true,
    data: {
      id: data.order_id,
      order_number: data.order_number,
    },
  };
}

/**
 * 12. Confirm Order Action
 */
export async function confirmOrderAction(
  propertyId: string,
  orderId: string,
  notes?: string
): Promise<ActionResponse> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_ORDER_UPDATE"
  );
  if (authError || !auth) return { success: false, error: authError };

  const supabase = await createClient();

  const { error } = await supabase.rpc("confirm_restaurant_order", {
    p_order_id: orderId,
    p_property_id: propertyId,
    p_notes: notes?.trim() || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant/orders");
  revalidatePath(`/restaurant/orders/${orderId}`);
  return { success: true };
}

/**
 * 13. Complete Order Action
 */
export async function completeOrderAction(
  propertyId: string,
  orderId: string,
  notes?: string
): Promise<ActionResponse> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_ORDER_UPDATE"
  );
  if (authError || !auth) return { success: false, error: authError };

  const supabase = await createClient();

  const { error } = await supabase.rpc("complete_restaurant_order", {
    p_order_id: orderId,
    p_property_id: propertyId,
    p_notes: notes?.trim() || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant");
  revalidatePath("/restaurant/pos");
  revalidatePath("/restaurant/tables");
  revalidatePath("/restaurant/orders");
  revalidatePath(`/restaurant/orders/${orderId}`);
  return { success: true };
}

/**
 * 14. Cancel Order Action
 */
export async function cancelOrderAction(
  propertyId: string,
  orderId: string,
  reason: string
): Promise<ActionResponse> {
  const { auth, error: authError } = await authenticateRestaurantSession(
    propertyId,
    "RESTAURANT_ORDER_CANCEL"
  );
  if (authError || !auth) return { success: false, error: authError };

  if (!reason?.trim()) {
    return { success: false, error: "A cancellation reason is required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_restaurant_order", {
    p_order_id: orderId,
    p_property_id: propertyId,
    p_cancellation_reason: reason.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/restaurant");
  revalidatePath("/restaurant/pos");
  revalidatePath("/restaurant/tables");
  revalidatePath("/restaurant/orders");
  revalidatePath(`/restaurant/orders/${orderId}`);
  return { success: true };
}
