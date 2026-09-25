/**
 * STAYHUB - Room Management Server Actions
 * Phase 6: Room Management & Room Inventory Engine
 * 
 * Secure server actions with strict authorization, cross-tenant foreign key
 * validation, and defense-in-depth protection.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { hasRoomPermission, type RoomPermission } from "./permissions";
import type {
  RoomActionResult,
  RoomOperationalStatus,
  RoomHousekeepingStatus,
  RoomAvailabilityStatus,
} from "./types";

interface SessionAuthResult {
  userId: string;
  roleCode: string;
  propertyCurrency: string;
}

/**
 * Internal helper to authenticate and verify user membership and role in the property
 */
async function authenticatePropertySession(
  propertyId: string,
  requiredPermission?: RoomPermission
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
    return { error: "Authentication required to perform room operations." };
  }

  // Verify membership and get role code
  const { data: membership, error: memberError } = await supabase
    .from("property_memberships")
    .select(`
      id,
      status,
      properties:property_id (
        currency
      ),
      roles:role_id (
        code
      )
    `)
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .eq("status", "active")
    .maybeSingle();

  if (memberError || !membership) {
    return { error: "Access denied. You do not have an active membership for this property." };
  }

  const role = membership.roles as unknown as { code: string } | null;
  const prop = membership.properties as unknown as { currency: string } | null;
  const roleCode = role?.code || "";

  if (requiredPermission && !hasRoomPermission(roleCode, requiredPermission)) {
    return {
      error: `Unauthorized. Your role (${roleCode}) does not have permission for this action.`,
    };
  }

  return {
    auth: {
      userId: user.id,
      roleCode,
      propertyCurrency: prop?.currency || "INR",
    },
  };
}

/**
 * 1. CREATE ROOM
 */
export async function createRoomAction(
  propertyId: string,
  payload: {
    room_number: string;
    room_name?: string | null;
    room_type_id: string;
    floor_id?: string | null;
    status?: RoomOperationalStatus;
    housekeeping_status?: RoomHousekeepingStatus;
    availability_status?: RoomAvailabilityStatus;
    max_occupancy?: number | null;
    view_type?: string | null;
    notes?: string | null;
    is_active?: boolean;
  }
): Promise<RoomActionResult<{ id: string }>> {
  try {
    const authResult = await authenticatePropertySession(propertyId, "ROOM_CREATE");
    if (authResult.error) return { success: false, error: authResult.error };

    const roomNumber = payload.room_number?.trim();
    if (!roomNumber) {
      return { success: false, error: "Room number is required." };
    }

    if (!payload.room_type_id) {
      return { success: false, error: "Room type must be selected." };
    }

    const supabase = await createClient();

    // Cross-tenant validation: verify room_type belongs to this property
    const { data: validRoomType } = await supabase
      .from("room_types")
      .select("id")
      .eq("id", payload.room_type_id)
      .eq("property_id", propertyId)
      .maybeSingle();

    if (!validRoomType) {
      return { success: false, error: "Selected room type is invalid or belongs to another property." };
    }

    // Cross-tenant validation: verify floor belongs to this property (if provided)
    if (payload.floor_id) {
      const { data: validFloor } = await supabase
        .from("floors")
        .select("id")
        .eq("id", payload.floor_id)
        .eq("property_id", propertyId)
        .maybeSingle();

      if (!validFloor) {
        return { success: false, error: "Selected floor is invalid or belongs to another property." };
      }
    }

    // Check room number uniqueness within this property
    const { data: duplicate } = await supabase
      .from("rooms")
      .select("id")
      .eq("property_id", propertyId)
      .eq("room_number", roomNumber)
      .maybeSingle();

    if (duplicate) {
      return {
        success: false,
        error: `Room number "${roomNumber}" is already in use at this property.`,
      };
    }

    // Insert room
    const { data: newRoom, error: insertError } = await supabase
      .from("rooms")
      .insert({
        property_id: propertyId,
        room_number: roomNumber,
        room_name: payload.room_name?.trim() || null,
        room_type_id: payload.room_type_id,
        floor_id: payload.floor_id || null,
        status: payload.status || "AVAILABLE",
        housekeeping_status: payload.housekeeping_status || "CLEAN",
        availability_status: payload.availability_status || "AVAILABLE",
        max_occupancy: payload.max_occupancy || null,
        view_type: payload.view_type?.trim() || null,
        notes: payload.notes?.trim() || null,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        created_by: authResult.auth!.userId,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Room creation error:", insertError);
      return { success: false, error: "Failed to create room. Please verify input data." };
    }

    revalidatePath("/rooms");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { id: newRoom.id },
      message: `Room ${roomNumber} created successfully.`,
    };
  } catch (err) {
    console.error("createRoomAction exception:", err);
    return { success: false, error: "An unexpected error occurred while creating the room." };
  }
}

/**
 * 2. UPDATE ROOM
 */
export async function updateRoomAction(
  propertyId: string,
  roomId: string,
  payload: {
    room_number?: string;
    room_name?: string | null;
    room_type_id?: string;
    floor_id?: string | null;
    status?: RoomOperationalStatus;
    housekeeping_status?: RoomHousekeepingStatus;
    availability_status?: RoomAvailabilityStatus;
    max_occupancy?: number | null;
    view_type?: string | null;
    notes?: string | null;
    is_active?: boolean;
  }
): Promise<RoomActionResult<{ id: string }>> {
  try {
    const authResult = await authenticatePropertySession(propertyId, "ROOM_UPDATE");
    if (authResult.error) return { success: false, error: authResult.error };

    const supabase = await createClient();

    // Check room exists in this property
    const { data: existingRoom } = await supabase
      .from("rooms")
      .select("id, room_number")
      .eq("id", roomId)
      .eq("property_id", propertyId)
      .maybeSingle();

    if (!existingRoom) {
      return { success: false, error: "Room not found in this property." };
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authResult.auth!.userId,
    };

    if (payload.room_number) {
      const trimmedNumber = payload.room_number.trim();
      if (trimmedNumber !== existingRoom.room_number) {
        // Check uniqueness
        const { data: duplicate } = await supabase
          .from("rooms")
          .select("id")
          .eq("property_id", propertyId)
          .eq("room_number", trimmedNumber)
          .maybeSingle();

        if (duplicate) {
          return {
            success: false,
            error: `Room number "${trimmedNumber}" is already in use.`,
          };
        }
        updates.room_number = trimmedNumber;
      }
    }

    if (payload.room_name !== undefined) {
      updates.room_name = payload.room_name?.trim() || null;
    }

    if (payload.room_type_id) {
      // Validate cross-tenant
      const { data: validRoomType } = await supabase
        .from("room_types")
        .select("id")
        .eq("id", payload.room_type_id)
        .eq("property_id", propertyId)
        .maybeSingle();

      if (!validRoomType) {
        return { success: false, error: "Invalid room type." };
      }
      updates.room_type_id = payload.room_type_id;
    }

    if (payload.floor_id !== undefined) {
      if (payload.floor_id) {
        const { data: validFloor } = await supabase
          .from("floors")
          .select("id")
          .eq("id", payload.floor_id)
          .eq("property_id", propertyId)
          .maybeSingle();

        if (!validFloor) {
          return { success: false, error: "Invalid floor." };
        }
      }
      updates.floor_id = payload.floor_id;
    }

    if (payload.status) updates.status = payload.status;
    if (payload.housekeeping_status) updates.housekeeping_status = payload.housekeeping_status;
    if (payload.availability_status) updates.availability_status = payload.availability_status;
    if (payload.max_occupancy !== undefined) updates.max_occupancy = payload.max_occupancy;
    if (payload.view_type !== undefined) updates.view_type = payload.view_type?.trim() || null;
    if (payload.notes !== undefined) updates.notes = payload.notes?.trim() || null;
    if (payload.is_active !== undefined) updates.is_active = payload.is_active;

    const { error: updateError } = await supabase
      .from("rooms")
      .update(updates)
      .eq("id", roomId)
      .eq("property_id", propertyId);

    if (updateError) {
      console.error("Room update error:", updateError);
      return { success: false, error: "Failed to update room details." };
    }

    revalidatePath("/rooms");
    revalidatePath(`/rooms/${roomId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { id: roomId },
      message: "Room updated successfully.",
    };
  } catch (err) {
    console.error("updateRoomAction exception:", err);
    return { success: false, error: "An unexpected error occurred while updating the room." };
  }
}

/**
 * 3. DEACTIVATE / SOFT-DELETE ROOM
 */
export async function deactivateRoomAction(
  propertyId: string,
  roomId: string,
  deactivate: boolean = true
): Promise<RoomActionResult> {
  try {
    const authResult = await authenticatePropertySession(propertyId, "ROOM_DELETE");
    if (authResult.error) return { success: false, error: authResult.error };

    const supabase = await createClient();

    const { error } = await supabase
      .from("rooms")
      .update({
        is_active: !deactivate,
        updated_at: new Date().toISOString(),
        updated_by: authResult.auth!.userId,
      })
      .eq("id", roomId)
      .eq("property_id", propertyId);

    if (error) {
      return { success: false, error: "Failed to update room activation status." };
    }

    revalidatePath("/rooms");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: deactivate ? "Room deactivated successfully." : "Room reactivated successfully.",
    };
  } catch (err) {
    console.error("deactivateRoomAction exception:", err);
    return { success: false, error: "Failed to change room status." };
  }
}

/**
 * 4. QUICK STATUS UPDATE (Available, Occupied, Dirty, Cleaning, Out of Order)
 */
export async function updateRoomStatusAction(
  propertyId: string,
  roomId: string,
  status: RoomOperationalStatus,
  housekeepingStatus?: RoomHousekeepingStatus
): Promise<RoomActionResult> {
  try {
    const authResult = await authenticatePropertySession(propertyId, "ROOM_STATUS_UPDATE");
    if (authResult.error) return { success: false, error: authResult.error };

    const supabase = await createClient();

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      updated_by: authResult.auth!.userId,
    };

    if (housekeepingStatus) {
      updates.housekeeping_status = housekeepingStatus;
    }

    const { error } = await supabase
      .from("rooms")
      .update(updates)
      .eq("id", roomId)
      .eq("property_id", propertyId);

    if (error) {
      return { success: false, error: "Failed to update operational status." };
    }

    revalidatePath("/rooms");
    revalidatePath(`/rooms/${roomId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Room status updated to ${status}.`,
    };
  } catch (err) {
    console.error("updateRoomStatusAction exception:", err);
    return { success: false, error: "Failed to update status." };
  }
}

/**
 * 5. CREATE ROOM TYPE
 */
export async function createRoomTypeAction(
  propertyId: string,
  payload: {
    name: string;
    code: string;
    description?: string | null;
    max_occupancy: number;
    base_rate: number;
    currency?: string;
    bed_configuration?: string | null;
    amenities?: string[];
    size_sqft?: number | null;
    size_sqm?: number | null;
  }
): Promise<RoomActionResult<{ id: string }>> {
  try {
    const authResult = await authenticatePropertySession(propertyId, "ROOM_TYPE_MANAGE");
    if (authResult.error) return { success: false, error: authResult.error };

    const name = payload.name?.trim();
    const code = payload.code?.trim().toUpperCase();

    if (!name || !code) {
      return { success: false, error: "Room type name and code are required." };
    }

    if (payload.max_occupancy <= 0) {
      return { success: false, error: "Maximum occupancy must be greater than 0." };
    }

    if (payload.base_rate < 0) {
      return { success: false, error: "Base rate cannot be negative." };
    }

    const supabase = await createClient();

    // Check code uniqueness
    const { data: duplicate } = await supabase
      .from("room_types")
      .select("id")
      .eq("property_id", propertyId)
      .eq("code", code)
      .maybeSingle();

    if (duplicate) {
      return {
        success: false,
        error: `Room type code "${code}" already exists for this property.`,
      };
    }

    const { data: newType, error: insertError } = await supabase
      .from("room_types")
      .insert({
        property_id: propertyId,
        name,
        code,
        description: payload.description?.trim() || null,
        max_occupancy: payload.max_occupancy,
        base_rate: payload.base_rate,
        currency: payload.currency || authResult.auth!.propertyCurrency,
        bed_configuration: payload.bed_configuration?.trim() || null,
        amenities: payload.amenities || [],
        size_sqft: payload.size_sqft || null,
        size_sqm: payload.size_sqm || null,
        created_by: authResult.auth!.userId,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Room type insertion error:", insertError);
      return { success: false, error: "Failed to create room type." };
    }

    revalidatePath("/rooms");
    revalidatePath("/rooms/types");

    return {
      success: true,
      data: { id: newType.id },
      message: `Room type "${name}" created successfully.`,
    };
  } catch (err) {
    console.error("createRoomTypeAction exception:", err);
    return { success: false, error: "Unexpected error creating room type." };
  }
}

/**
 * 6. UPDATE ROOM TYPE
 */
export async function updateRoomTypeAction(
  propertyId: string,
  roomTypeId: string,
  payload: {
    name?: string;
    code?: string;
    description?: string | null;
    max_occupancy?: number;
    base_rate?: number;
    bed_configuration?: string | null;
    amenities?: string[];
    size_sqft?: number | null;
    size_sqm?: number | null;
    is_active?: boolean;
  }
): Promise<RoomActionResult> {
  try {
    const authResult = await authenticatePropertySession(propertyId, "ROOM_TYPE_MANAGE");
    if (authResult.error) return { success: false, error: authResult.error };

    const supabase = await createClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authResult.auth!.userId,
    };

    if (payload.name) updates.name = payload.name.trim();
    if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
    if (payload.max_occupancy !== undefined) updates.max_occupancy = payload.max_occupancy;
    if (payload.base_rate !== undefined) updates.base_rate = payload.base_rate;
    if (payload.bed_configuration !== undefined) {
      updates.bed_configuration = payload.bed_configuration?.trim() || null;
    }
    if (payload.amenities !== undefined) updates.amenities = payload.amenities;
    if (payload.size_sqft !== undefined) updates.size_sqft = payload.size_sqft;
    if (payload.size_sqm !== undefined) updates.size_sqm = payload.size_sqm;
    if (payload.is_active !== undefined) updates.is_active = payload.is_active;

    const { error: updateError } = await supabase
      .from("room_types")
      .update(updates)
      .eq("id", roomTypeId)
      .eq("property_id", propertyId);

    if (updateError) {
      return { success: false, error: "Failed to update room type." };
    }

    revalidatePath("/rooms");
    revalidatePath("/rooms/types");

    return {
      success: true,
      message: "Room type updated successfully.",
    };
  } catch (err) {
    console.error("updateRoomTypeAction exception:", err);
    return { success: false, error: "Unexpected error updating room type." };
  }
}

/**
 * 7. CREATE FLOOR
 */
export async function createFloorAction(
  propertyId: string,
  payload: {
    name: string;
    floor_number?: number | null;
    description?: string | null;
    sort_order?: number;
  }
): Promise<RoomActionResult<{ id: string }>> {
  try {
    const authResult = await authenticatePropertySession(propertyId, "FLOOR_MANAGE");
    if (authResult.error) return { success: false, error: authResult.error };

    const name = payload.name?.trim();
    if (!name) {
      return { success: false, error: "Floor name is required." };
    }

    const supabase = await createClient();

    // Check duplicate name within property
    const { data: duplicate } = await supabase
      .from("floors")
      .select("id")
      .eq("property_id", propertyId)
      .eq("name", name)
      .maybeSingle();

    if (duplicate) {
      return { success: false, error: `Floor "${name}" already exists for this property.` };
    }

    const { data: newFloor, error: insertError } = await supabase
      .from("floors")
      .insert({
        property_id: propertyId,
        name,
        floor_number: payload.floor_number ?? null,
        description: payload.description?.trim() || null,
        sort_order: payload.sort_order ?? 0,
        created_by: authResult.auth!.userId,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Floor creation error:", insertError);
      return { success: false, error: "Failed to create floor." };
    }

    revalidatePath("/rooms");
    revalidatePath("/rooms/floors");
    revalidatePath("/rooms/floor-view");

    return {
      success: true,
      data: { id: newFloor.id },
      message: `Floor "${name}" created successfully.`,
    };
  } catch (err) {
    console.error("createFloorAction exception:", err);
    return { success: false, error: "Unexpected error creating floor." };
  }
}

/**
 * 8. UPDATE FLOOR
 */
export async function updateFloorAction(
  propertyId: string,
  floorId: string,
  payload: {
    name?: string;
    floor_number?: number | null;
    description?: string | null;
    sort_order?: number;
    status?: string;
  }
): Promise<RoomActionResult> {
  try {
    const authResult = await authenticatePropertySession(propertyId, "FLOOR_MANAGE");
    if (authResult.error) return { success: false, error: authResult.error };

    const supabase = await createClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authResult.auth!.userId,
    };

    if (payload.name) updates.name = payload.name.trim();
    if (payload.floor_number !== undefined) updates.floor_number = payload.floor_number;
    if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
    if (payload.sort_order !== undefined) updates.sort_order = payload.sort_order;
    if (payload.status) updates.status = payload.status;

    const { error: updateError } = await supabase
      .from("floors")
      .update(updates)
      .eq("id", floorId)
      .eq("property_id", propertyId);

    if (updateError) {
      return { success: false, error: "Failed to update floor." };
    }

    revalidatePath("/rooms");
    revalidatePath("/rooms/floors");
    revalidatePath("/rooms/floor-view");

    return {
      success: true,
      message: "Floor updated successfully.",
    };
  } catch (err) {
    console.error("updateFloorAction exception:", err);
    return { success: false, error: "Unexpected error updating floor." };
  }
}
