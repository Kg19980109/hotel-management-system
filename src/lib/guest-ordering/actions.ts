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
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to place food order.",
    };
  }

  revalidatePath("/guest/orders");
  revalidatePath("/guest/dining");
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
  };
}
