// ============================================================
// STAYHUB MAINTENANCE SERVER ACTIONS (Phase 11)
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasMaintenancePermission, MaintenancePermission } from "./permissions";
import {
  CreateWorkOrderInput,
  AssignWorkOrderInput,
  ResolveWorkOrderInput,
  SetRoomMaintenanceStatusInput,
  MaintenancePriority,
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
 * Authenticate session and check maintenance permission for the given property
 */
async function authenticateMaintenanceSession(
  propertyId: string,
  requiredPermission?: MaintenancePermission
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
    return { error: "Authentication required to perform maintenance operations." };
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
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .eq("status", "active")
    .maybeSingle();

  if (memberError || !membership) {
    return { error: "Access denied. You do not have active membership for this property." };
  }

  const roleObj = membership.roles as unknown as { code?: string } | null;
  const roleCode = roleObj?.code || "MAINTENANCE";

  if (requiredPermission && !hasMaintenancePermission([roleCode], requiredPermission)) {
    return {
      error: `Access denied. Your role (${roleCode}) lacks the ${requiredPermission} permission.`,
    };
  }

  return { auth: { userId: user.id, roleCode } };
}

/**
 * Create a new maintenance work order
 */
export async function createWorkOrderAction(
  input: CreateWorkOrderInput
): Promise<ActionResponse<{ workOrderId: string; status: string }>> {
  const authRes = await authenticateMaintenanceSession(input.propertyId, "MAINTENANCE_CREATE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("create_maintenance_work_order", {
      p_property_id: input.propertyId,
      p_title: input.title,
      p_description: input.description || null,
      p_category: input.category || "OTHER",
      p_priority: input.priority || "NORMAL",
      p_room_id: input.roomId || null,
      p_asset_id: input.assetId || null,
      p_assigned_to: input.assignedTo || null,
      p_scheduled_for: input.scheduledFor || null,
      p_reported_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/maintenance");
    if (input.roomId) {
      revalidatePath(`/rooms/${input.roomId}`);
      revalidatePath("/rooms");
      revalidatePath("/front-desk");
    }

    return {
      success: true,
      data: {
        workOrderId: data?.work_order_id,
        status: data?.status || "OPEN",
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create maintenance work order",
    };
  }
}

/**
 * Assign a technician to a maintenance work order
 */
export async function assignWorkOrderAction(
  input: AssignWorkOrderInput
): Promise<ActionResponse<{ workOrderId: string; status: string }>> {
  const supabase = await createClient();

  const { data: wo, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("property_id, room_id")
    .eq("id", input.workOrderId)
    .single();

  if (woError || !wo) {
    return { success: false, error: "Maintenance work order not found" };
  }

  const authRes = await authenticateMaintenanceSession(wo.property_id, "MAINTENANCE_ASSIGN");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  try {
    const { data, error } = await supabase.rpc("assign_maintenance_work_order", {
      p_work_order_id: input.workOrderId,
      p_assigned_to: input.assignedTo,
      p_scheduled_for: input.scheduledFor || null,
      p_notes: input.notes || null,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${input.workOrderId}`);
    if (wo.room_id) {
      revalidatePath(`/rooms/${wo.room_id}`);
    }

    return {
      success: true,
      data: {
        workOrderId: input.workOrderId,
        status: data?.status || "ASSIGNED",
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to assign work order",
    };
  }
}

/**
 * Start working on a maintenance work order
 */
export async function startWorkOrderAction(
  workOrderId: string,
  notes?: string
): Promise<ActionResponse<{ workOrderId: string; status: string }>> {
  const supabase = await createClient();

  const { data: wo, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("property_id, room_id")
    .eq("id", workOrderId)
    .single();

  if (woError || !wo) {
    return { success: false, error: "Maintenance work order not found" };
  }

  const authRes = await authenticateMaintenanceSession(wo.property_id, "MAINTENANCE_START");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  try {
    const { data, error } = await supabase.rpc("start_maintenance_work_order", {
      p_work_order_id: workOrderId,
      p_notes: notes || null,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${workOrderId}`);
    if (wo.room_id) {
      revalidatePath(`/rooms/${wo.room_id}`);
    }

    return {
      success: true,
      data: {
        workOrderId,
        status: data?.status || "IN_PROGRESS",
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to start work order",
    };
  }
}

/**
 * Put a maintenance work order on hold
 */
export async function holdWorkOrderAction(
  workOrderId: string,
  reason: string
): Promise<ActionResponse<{ workOrderId: string; status: string }>> {
  const supabase = await createClient();

  const { data: wo, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("property_id, room_id")
    .eq("id", workOrderId)
    .single();

  if (woError || !wo) {
    return { success: false, error: "Maintenance work order not found" };
  }

  const authRes = await authenticateMaintenanceSession(wo.property_id, "MAINTENANCE_UPDATE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  try {
    const { data, error } = await supabase.rpc("hold_maintenance_work_order", {
      p_work_order_id: workOrderId,
      p_reason: reason,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${workOrderId}`);

    return {
      success: true,
      data: {
        workOrderId,
        status: data?.status || "ON_HOLD",
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to put work order on hold",
    };
  }
}

/**
 * Resume a maintenance work order from ON_HOLD
 */
export async function resumeWorkOrderAction(
  workOrderId: string,
  notes?: string
): Promise<ActionResponse<{ workOrderId: string; status: string }>> {
  const supabase = await createClient();

  const { data: wo, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("property_id, room_id")
    .eq("id", workOrderId)
    .single();

  if (woError || !wo) {
    return { success: false, error: "Maintenance work order not found" };
  }

  const authRes = await authenticateMaintenanceSession(wo.property_id, "MAINTENANCE_UPDATE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  try {
    const { data, error } = await supabase.rpc("resume_maintenance_work_order", {
      p_work_order_id: workOrderId,
      p_notes: notes || null,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${workOrderId}`);

    return {
      success: true,
      data: {
        workOrderId,
        status: data?.status || "IN_PROGRESS",
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to resume work order",
    };
  }
}

/**
 * Resolve a maintenance work order with required resolution notes
 */
export async function resolveWorkOrderAction(
  input: ResolveWorkOrderInput
): Promise<ActionResponse<{ workOrderId: string; status: string }>> {
  const supabase = await createClient();

  const { data: wo, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("property_id, room_id")
    .eq("id", input.workOrderId)
    .single();

  if (woError || !wo) {
    return { success: false, error: "Maintenance work order not found" };
  }

  const authRes = await authenticateMaintenanceSession(wo.property_id, "MAINTENANCE_RESOLVE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  try {
    const { data, error } = await supabase.rpc("resolve_maintenance_work_order", {
      p_work_order_id: input.workOrderId,
      p_resolution_notes: input.resolutionNotes,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${input.workOrderId}`);
    if (wo.room_id) {
      revalidatePath(`/rooms/${wo.room_id}`);
    }

    return {
      success: true,
      data: {
        workOrderId: input.workOrderId,
        status: data?.status || "RESOLVED",
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to resolve work order",
    };
  }
}

/**
 * Administratively close a work order
 */
export async function closeWorkOrderAction(
  workOrderId: string,
  notes?: string
): Promise<ActionResponse<{ workOrderId: string; status: string }>> {
  const supabase = await createClient();

  const { data: wo, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("property_id, room_id")
    .eq("id", workOrderId)
    .single();

  if (woError || !wo) {
    return { success: false, error: "Maintenance work order not found" };
  }

  const authRes = await authenticateMaintenanceSession(wo.property_id, "MAINTENANCE_CLOSE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  try {
    const { data, error } = await supabase.rpc("close_maintenance_work_order", {
      p_work_order_id: workOrderId,
      p_notes: notes || null,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${workOrderId}`);

    return {
      success: true,
      data: {
        workOrderId,
        status: data?.status || "CLOSED",
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to close work order",
    };
  }
}

/**
 * Cancel a maintenance work order
 */
export async function cancelWorkOrderAction(
  workOrderId: string,
  reason?: string
): Promise<ActionResponse<{ workOrderId: string; status: string }>> {
  const supabase = await createClient();

  const { data: wo, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("property_id, room_id")
    .eq("id", workOrderId)
    .single();

  if (woError || !wo) {
    return { success: false, error: "Maintenance work order not found" };
  }

  const authRes = await authenticateMaintenanceSession(wo.property_id, "MAINTENANCE_CANCEL");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  try {
    const { data, error } = await supabase.rpc("cancel_maintenance_work_order", {
      p_work_order_id: workOrderId,
      p_reason: reason || null,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${workOrderId}`);
    if (wo.room_id) {
      revalidatePath(`/rooms/${wo.room_id}`);
    }

    return {
      success: true,
      data: {
        workOrderId,
        status: data?.status || "CANCELLED",
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel work order",
    };
  }
}

/**
 * Reopen a resolved, closed, or cancelled work order
 */
export async function reopenWorkOrderAction(
  workOrderId: string,
  reason: string
): Promise<ActionResponse<{ workOrderId: string; status: string }>> {
  const supabase = await createClient();

  const { data: wo, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("property_id, room_id")
    .eq("id", workOrderId)
    .single();

  if (woError || !wo) {
    return { success: false, error: "Maintenance work order not found" };
  }

  const authRes = await authenticateMaintenanceSession(wo.property_id, "MAINTENANCE_MANAGE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  try {
    const { data, error } = await supabase.rpc("reopen_maintenance_work_order", {
      p_work_order_id: workOrderId,
      p_reason: reason,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${workOrderId}`);

    return {
      success: true,
      data: {
        workOrderId,
        status: data?.status || "OPEN",
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reopen work order",
    };
  }
}

/**
 * Update work order priority
 */
export async function updatePriorityAction(
  workOrderId: string,
  priority: MaintenancePriority,
  notes?: string
): Promise<ActionResponse<{ workOrderId: string; priority: string }>> {
  const supabase = await createClient();

  const { data: wo, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("property_id")
    .eq("id", workOrderId)
    .single();

  if (woError || !wo) {
    return { success: false, error: "Maintenance work order not found" };
  }

  const authRes = await authenticateMaintenanceSession(wo.property_id, "MAINTENANCE_UPDATE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  try {
    const { data, error } = await supabase.rpc("update_maintenance_work_order_priority", {
      p_work_order_id: workOrderId,
      p_priority: priority,
      p_notes: notes || null,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${workOrderId}`);

    return {
      success: true,
      data: {
        workOrderId,
        priority: data?.priority || priority,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update priority",
    };
  }
}

/**
 * Add an internal note / audit comment to work order
 */
export async function addNoteAction(
  workOrderId: string,
  notes: string
): Promise<ActionResponse<{ workOrderId: string }>> {
  const supabase = await createClient();

  const { data: wo, error: woError } = await supabase
    .from("maintenance_work_orders")
    .select("property_id")
    .eq("id", workOrderId)
    .single();

  if (woError || !wo) {
    return { success: false, error: "Maintenance work order not found" };
  }

  const authRes = await authenticateMaintenanceSession(wo.property_id, "MAINTENANCE_VIEW");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  try {
    const { error } = await supabase.rpc("add_maintenance_work_order_note", {
      p_work_order_id: workOrderId,
      p_notes: notes,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/maintenance/${workOrderId}`);

    return {
      success: true,
      data: { workOrderId },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add note",
    };
  }
}

/**
 * Explicit Management Override for Room Operational Status (OUT_OF_ORDER / OUT_OF_SERVICE)
 */
export async function setRoomMaintenanceStatusAction(
  input: SetRoomMaintenanceStatusInput
): Promise<ActionResponse<{ roomId: string; operationalStatus: string }>> {
  const authRes = await authenticateMaintenanceSession(
    input.propertyId,
    "MAINTENANCE_TAKE_ROOM_OUT_OF_SERVICE"
  );
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("set_room_maintenance_status", {
      p_property_id: input.propertyId,
      p_room_id: input.roomId,
      p_operational_status: input.operationalStatus,
      p_reason: input.reason || null,
      p_performed_by: authRes.auth?.userId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/rooms");
    revalidatePath(`/rooms/${input.roomId}`);
    revalidatePath("/front-desk");
    revalidatePath("/dashboard");
    revalidatePath("/maintenance");

    return {
      success: true,
      data: {
        roomId: input.roomId,
        operationalStatus: data?.status || input.operationalStatus,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update room status",
    };
  }
}
