"use server";

// ============================================================
// STAYHUB KITCHEN DISPLAY SYSTEM (KDS) SERVER ACTIONS (Phase 13)
// ============================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { KitchenPriority } from "./types";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fire or create a kitchen ticket from a POS order
 */
export async function createOrFireTicketAction(
  propertyId: string,
  orderId: string,
  priority: KitchenPriority = "NORMAL"
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_or_fire_kitchen_ticket", {
      p_order_id: orderId,
      p_property_id: propertyId,
      p_priority: priority,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/kds");
    revalidatePath("/restaurant/orders");
    revalidatePath(`/restaurant/orders/${orderId}`);
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fire kitchen ticket",
    };
  }
}

/**
 * Start preparation for an item (QUEUED -> IN_PROGRESS)
 */
export async function startTicketItemAction(
  propertyId: string,
  ticketItemId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("start_kitchen_ticket_item", {
      p_ticket_item_id: ticketItemId,
      p_property_id: propertyId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/kds");
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to start ticket item",
    };
  }
}

/**
 * Mark item as READY for service (IN_PROGRESS -> READY)
 */
export async function readyTicketItemAction(
  propertyId: string,
  ticketItemId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("ready_kitchen_ticket_item", {
      p_ticket_item_id: ticketItemId,
      p_property_id: propertyId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/kds");
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to mark item ready",
    };
  }
}

/**
 * Complete item preparation/service (READY -> COMPLETED)
 */
export async function completeTicketItemAction(
  propertyId: string,
  ticketItemId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("complete_kitchen_ticket_item", {
      p_ticket_item_id: ticketItemId,
      p_property_id: propertyId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/kds");
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to complete item",
    };
  }
}

/**
 * Requeue an in-progress item back to waiting queue
 */
export async function requeueTicketItemAction(
  propertyId: string,
  ticketItemId: string,
  notes?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("requeue_kitchen_ticket_item", {
      p_ticket_item_id: ticketItemId,
      p_property_id: propertyId,
      p_notes: notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/kds");
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to requeue item",
    };
  }
}

/**
 * Remake / Re-fire an item with justification
 */
export async function remakeTicketItemAction(
  propertyId: string,
  ticketItemId: string,
  reason: string
): Promise<ActionResult> {
  try {
    if (!reason || !reason.trim()) {
      return { success: false, error: "A remake reason is required." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("remake_kitchen_ticket_item", {
      p_ticket_item_id: ticketItemId,
      p_property_id: propertyId,
      p_reason: reason.trim(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/kds");
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to request remake",
    };
  }
}

/**
 * Update ticket priority
 */
export async function updateTicketPriorityAction(
  propertyId: string,
  ticketId: string,
  priority: KitchenPriority
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("update_kitchen_ticket_priority", {
      p_ticket_id: ticketId,
      p_property_id: propertyId,
      p_priority: priority,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/kds");
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update ticket priority",
    };
  }
}

/**
 * Create Kitchen Station
 */
export async function createKitchenStationAction(
  restaurantId: string,
  name: string,
  code: string,
  description?: string,
  displayOrder = 0
): Promise<ActionResult> {
  try {
    if (!name || !name.trim()) return { success: false, error: "Station name is required" };
    if (!code || !code.trim()) return { success: false, error: "Station code is required" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("kitchen_stations")
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        code: code.trim().toUpperCase().replace(/\s+/g, "_"),
        description: description?.trim() || null,
        display_order: displayOrder,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/kitchen/stations");
    revalidatePath("/restaurant/kds");
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create kitchen station",
    };
  }
}

/**
 * Update Kitchen Station
 */
export async function updateKitchenStationAction(
  stationId: string,
  name: string,
  code: string,
  description?: string,
  displayOrder = 0,
  isActive = true
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("kitchen_stations")
      .update({
        name: name.trim(),
        code: code.trim().toUpperCase().replace(/\s+/g, "_"),
        description: description?.trim() || null,
        display_order: displayOrder,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stationId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/kitchen/stations");
    revalidatePath("/restaurant/kds");
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update kitchen station",
    };
  }
}

/**
 * Configure Menu Item Station Routing
 */
export async function saveMenuItemRoutingAction(
  menuItemId: string,
  kitchenStationId: string,
  isPrimary = true
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check if routing already exists for this pair
    const { data: existing } = await supabase
      .from("menu_item_kitchen_stations")
      .select("id")
      .eq("menu_item_id", menuItemId)
      .eq("kitchen_station_id", kitchenStationId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from("menu_item_kitchen_stations")
        .update({
          is_primary: isPrimary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      revalidatePath("/restaurant/menu");
      return { success: true, data };
    }

    const { data, error } = await supabase
      .from("menu_item_kitchen_stations")
      .insert({
        menu_item_id: menuItemId,
        kitchen_station_id: kitchenStationId,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/menu");
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save station routing",
    };
  }
}

/**
 * Remove Menu Item Station Routing
 */
export async function removeMenuItemRoutingAction(
  routingId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("menu_item_kitchen_stations")
      .delete()
      .eq("id", routingId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/restaurant/menu");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove station routing",
    };
  }
}
