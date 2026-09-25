// ============================================================
// STAYHUB HOUSEKEEPING SERVER ACTIONS (Phase 10)
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasHousekeepingPermission, HousekeepingPermission } from "./permissions";
import {
  CreateTaskInput,
  AssignTaskInput,
  StartTaskInput,
  CompleteTaskInput,
  PassInspectionInput,
  FailInspectionInput,
  CancelTaskInput,
  UpdatePriorityInput,
  AddNoteInput,
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
 * Authenticate session and check housekeeping permission for the given property
 */
async function authenticateHousekeepingSession(
  propertyId: string,
  requiredPermission?: HousekeepingPermission
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
    return { error: "Authentication required to perform housekeeping operations." };
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
  const roleCode = roleObj?.code || "HOUSEKEEPING";

  if (requiredPermission && !hasHousekeepingPermission([roleCode], requiredPermission)) {
    return {
      error: `Access denied. Your role (${roleCode}) lacks the ${requiredPermission} permission.`,
    };
  }

  return { auth: { userId: user.id, roleCode } };
}

/**
 * Create a new housekeeping cleaning/inspection/turndown task
 */
export async function createHousekeepingTaskAction(
  input: CreateTaskInput
): Promise<ActionResponse<{ taskId: string; action: string }>> {
  const authRes = await authenticateHousekeepingSession(input.propertyId, "HOUSEKEEPING_MANAGE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("create_housekeeping_task", {
      p_property_id: input.propertyId,
      p_room_id: input.roomId,
      p_task_type: input.taskType || "CLEANING",
      p_priority: input.priority || "NORMAL",
      p_assigned_to: input.assignedTo || null,
      p_notes: input.notes || null,
      p_scheduled_for: input.scheduledFor || new Date().toISOString().split("T")[0],
    });

    if (error) {
      console.error("create_housekeeping_task RPC error:", error);
      return { success: false, error: error.message };
    }

    const res = data as { success: boolean; task_id: string; action: string };

    revalidatePath("/housekeeping");
    revalidatePath("/housekeeping/inspections");
    revalidatePath("/rooms");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { taskId: res.task_id, action: res.action },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create housekeeping task";
    return { success: false, error: msg };
  }
}

/**
 * Assign or reassign a housekeeping task to staff
 */
export async function assignHousekeepingTaskAction(
  input: AssignTaskInput
): Promise<ActionResponse> {
  const authRes = await authenticateHousekeepingSession(input.propertyId, "HOUSEKEEPING_ASSIGN");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc("assign_housekeeping_task", {
      p_task_id: input.taskId,
      p_property_id: input.propertyId,
      p_assigned_to: input.assignedTo,
      p_priority: input.priority || null,
    });

    if (error) {
      console.error("assign_housekeeping_task RPC error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/housekeeping");
    revalidatePath("/rooms");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to assign task";
    return { success: false, error: msg };
  }
}

/**
 * Start a housekeeping cleaning task (transitions task to IN_PROGRESS & room to CLEANING)
 */
export async function startHousekeepingTaskAction(
  input: StartTaskInput
): Promise<ActionResponse> {
  const authRes = await authenticateHousekeepingSession(input.propertyId, "HOUSEKEEPING_START");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc("start_housekeeping_task", {
      p_task_id: input.taskId,
      p_property_id: input.propertyId,
    });

    if (error) {
      console.error("start_housekeeping_task RPC error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/housekeeping");
    revalidatePath("/rooms");
    revalidatePath("/front-desk");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to start cleaning task";
    return { success: false, error: msg };
  }
}

/**
 * Complete a cleaning task (transitions task to INSPECTION_PENDING & room to INSPECTED)
 */
export async function completeHousekeepingTaskAction(
  input: CompleteTaskInput
): Promise<ActionResponse> {
  const authRes = await authenticateHousekeepingSession(input.propertyId, "HOUSEKEEPING_COMPLETE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc("complete_housekeeping_task", {
      p_task_id: input.taskId,
      p_property_id: input.propertyId,
      p_notes: input.notes || null,
    });

    if (error) {
      console.error("complete_housekeeping_task RPC error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/housekeeping");
    revalidatePath("/housekeeping/inspections");
    revalidatePath("/rooms");
    revalidatePath("/front-desk");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to complete cleaning task";
    return { success: false, error: msg };
  }
}

/**
 * Pass a room inspection (transitions task to COMPLETED, room to AVAILABLE/CLEAN if vacant)
 */
export async function passInspectionAction(
  input: PassInspectionInput
): Promise<ActionResponse<{ inspectionId: string }>> {
  const authRes = await authenticateHousekeepingSession(input.propertyId, "HOUSEKEEPING_INSPECT");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("pass_housekeeping_inspection", {
      p_task_id: input.taskId,
      p_property_id: input.propertyId,
      p_notes: input.notes || null,
    });

    if (error) {
      console.error("pass_housekeeping_inspection RPC error:", error);
      return { success: false, error: error.message };
    }

    const res = data as { inspection_id: string };

    revalidatePath("/housekeeping");
    revalidatePath("/housekeeping/inspections");
    revalidatePath("/rooms");
    revalidatePath("/front-desk");
    revalidatePath("/dashboard");

    return { success: true, data: { inspectionId: res.inspection_id } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to pass inspection";
    return { success: false, error: msg };
  }
}

/**
 * Fail a room inspection (records failure reason, re-opens task with HIGH priority, room remains DIRTY)
 */
export async function failInspectionAction(
  input: FailInspectionInput
): Promise<ActionResponse<{ inspectionId: string }>> {
  const authRes = await authenticateHousekeepingSession(input.propertyId, "HOUSEKEEPING_INSPECT");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("fail_housekeeping_inspection", {
      p_task_id: input.taskId,
      p_property_id: input.propertyId,
      p_notes: input.notes,
    });

    if (error) {
      console.error("fail_housekeeping_inspection RPC error:", error);
      return { success: false, error: error.message };
    }

    const res = data as { inspection_id: string };

    revalidatePath("/housekeeping");
    revalidatePath("/housekeeping/inspections");
    revalidatePath("/rooms");
    revalidatePath("/front-desk");
    revalidatePath("/dashboard");

    return { success: true, data: { inspectionId: res.inspection_id } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fail inspection";
    return { success: false, error: msg };
  }
}

/**
 * Cancel an active housekeeping task
 */
export async function cancelHousekeepingTaskAction(
  input: CancelTaskInput
): Promise<ActionResponse> {
  const authRes = await authenticateHousekeepingSession(input.propertyId, "HOUSEKEEPING_MANAGE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("housekeeping_tasks")
      .update({
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        notes: input.reason
          ? `[CANCELLED]: ${input.reason}`
          : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.taskId)
      .eq("property_id", input.propertyId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/housekeeping");
    revalidatePath("/rooms");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel task";
    return { success: false, error: msg };
  }
}

/**
 * Update task priority (e.g. mark URGENT for early arrival)
 */
export async function updateTaskPriorityAction(
  input: UpdatePriorityInput
): Promise<ActionResponse> {
  const authRes = await authenticateHousekeepingSession(input.propertyId, "HOUSEKEEPING_ASSIGN");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("housekeeping_tasks")
      .update({
        priority: input.priority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.taskId)
      .eq("property_id", input.propertyId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/housekeeping");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update priority";
    return { success: false, error: msg };
  }
}

/**
 * Add an operational note to a task
 */
export async function addTaskNoteAction(
  input: AddNoteInput
): Promise<ActionResponse> {
  const authRes = await authenticateHousekeepingSession(input.propertyId, "HOUSEKEEPING_VIEW");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data: task, error: fetchErr } = await supabase
      .from("housekeeping_tasks")
      .select("notes")
      .eq("id", input.taskId)
      .eq("property_id", input.propertyId)
      .single();

    if (fetchErr || !task) {
      return { success: false, error: "Task not found" };
    }

    const updatedNotes = task.notes
      ? `${task.notes}\n${input.note}`
      : input.note;

    const { error } = await supabase
      .from("housekeeping_tasks")
      .update({
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.taskId)
      .eq("property_id", input.propertyId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/housekeeping");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to append note";
    return { success: false, error: msg };
  }
}
