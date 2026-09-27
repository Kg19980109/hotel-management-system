"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { hashToken } from "@/lib/guest-portal/types";

const GUEST_SESSION_COOKIE_NAME = "stayhub_guest_session";

export interface CreateGuestFoodOrderInput {
  restaurantId: string;
  items: {
    menu_item_id: string;
    quantity: number;
    special_instructions?: string;
  }[];
  notes?: string;
  idempotencyKey?: string;
  orderType?: "ROOM_SERVICE" | "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string;
}

/**
 * Place in-room food order from guest session
 */
export async function placeGuestFoodOrderAction(input: CreateGuestFoodOrderInput) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(GUEST_SESSION_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return {
      success: false,
      error: "No active guest session found. Please scan your room QR code.",
    };
  }

  if (!input.restaurantId || !input.items || input.items.length === 0) {
    return {
      success: false,
      error: "Invalid order. Please select at least one item.",
    };
  }

  const supabase = await createClient();
  const sessionTokenHash = hashToken(sessionCookie.value);

  const { data, error } = await supabase.rpc("create_guest_food_order", {
    p_session_token_hash: sessionTokenHash,
    p_restaurant_id: input.restaurantId,
    p_items: input.items,
    p_notes: input.notes || null,
    p_idempotency_key: input.idempotencyKey || null,
    p_order_type: input.orderType || "ROOM_SERVICE",
    p_table_id: input.tableId || null,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to place food order.",
    };
  }

  // Automatically sync food order to the Guest Requests page
  try {
    const itemIds = input.items.map((i) => i.menu_item_id);
    const { data: menuItemsData } = await supabase
      .from("menu_items")
      .select("id, name, price")
      .in("id", itemIds);

    const itemsMap = new Map((menuItemsData || []).map((m) => [m.id, m]));
    const totalQty = input.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

    const formattedItems = input.items
      .map((i) => {
        const itemObj = itemsMap.get(i.menu_item_id);
        const name = itemObj?.name || "Menu Item";
        const special = i.special_instructions ? ` (Note: ${i.special_instructions})` : "";
        return `• ${i.quantity}x ${name}${special}`;
      })
      .join("\n");

    const descriptionParts = [
      `Restaurant: ${data.restaurant_name || "Hotel Restaurant"}`,
      `Order #${data.order_number} (Total: ₹${Number(data.total_amount).toFixed(2)})`,
      `\nItems Ordered:\n${formattedItems}`,
    ];

    if (input.notes) {
      descriptionParts.push(`\nGuest Instructions: ${input.notes}`);
    }

    const requestDescription = descriptionParts.join("\n");

    await supabase.rpc("create_guest_service_request", {
      p_session_token_hash: sessionTokenHash,
      p_category: "ROOM_SERVICE",
      p_request_type: "In-Room Dining Order",
      p_title: `Food Order #${data.order_number} (${totalQty} ${totalQty === 1 ? "item" : "items"} • ₹${Number(data.total_amount).toFixed(2)})`,
      p_description: requestDescription,
      p_priority: "HIGH",
    });
  } catch (syncErr) {
    console.warn("Could not sync food order to guest service requests:", syncErr);
  }

  revalidatePath("/guest-requests");
  revalidatePath("/guest/requests");
  revalidatePath("/guest/orders");
  revalidatePath("/guest/dining");
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  if (data.order_id) {
    revalidatePath(`/guest/orders/${data.order_id}`);
  }

  return {
    success: true,
    orderId: data.order_id,
    orderNumber: data.order_number,
    totalAmount: data.total_amount,
    currency: data.currency,
    restaurantName: data.restaurant_name,
    propertyId: data.property_id,
    roomNumber: data.room_number,
    guestName: data.guest_name,
  };
}
