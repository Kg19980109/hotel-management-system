// ============================================================
// STAYHUB HOUSEKEEPING TYPES & INTERFACES (Phase 10)
// ============================================================

import { RoomOperationalStatus, RoomHousekeepingStatus } from "@/lib/rooms/types";

export type HousekeepingTaskType =
  | "CLEANING"
  | "DEEP_CLEAN"
  | "TURNDOWN"
  | "INSPECTION"
  | "LINEN_CHANGE"
  | "TOUCHUP";

export type HousekeepingTaskStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "INSPECTION_PENDING"
  | "COMPLETED"
  | "CANCELLED";

export type HousekeepingPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type HousekeepingInspectionResult = "PASSED" | "FAILED";

export interface HousekeepingTask {
  id: string;
  property_id: string;
  room_id: string;
  task_type: HousekeepingTaskType;
  status: HousekeepingTaskStatus;
  priority: HousekeepingPriority;
  assigned_to: string | null;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_by: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  room?: {
    id: string;
    room_number: string;
    status: RoomOperationalStatus;
    housekeeping_status: RoomHousekeepingStatus;
    floor_id: string;
    room_type_id: string;
    floor?: {
      id: string;
      floor_number: number;
      name: string;
    };
    room_type?: {
      id: string;
      name: string;
      code: string;
    };
  };
  assigned_profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  created_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  completed_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface HousekeepingInspection {
  id: string;
  property_id: string;
  housekeeping_task_id: string;
  room_id: string;
  inspector_id: string;
  result: HousekeepingInspectionResult;
  notes: string | null;
  inspected_at: string;
  created_at: string;
  updated_at: string;

  // Joined relations
  task?: HousekeepingTask;
  room?: {
    id: string;
    room_number: string;
    floor?: {
      name: string;
      floor_number: number;
    };
    room_type?: {
      name: string;
    };
  };
  inspector_profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface HousekeepingKPIs {
  dirtyRooms: number;
  cleaningInProgress: number;
  inspectionPending: number;
  readyClean: number;
  priorityTasks: number;
  outOfServiceOrOrder: number;
  totalRooms: number;
}

export interface HousekeepingTaskFilters {
  status?: HousekeepingTaskStatus | "ALL";
  taskType?: HousekeepingTaskType | "ALL";
  priority?: HousekeepingPriority | "ALL";
  floorId?: string | "ALL";
  assignedTo?: string | "ALL" | "UNASSIGNED";
  search?: string;
  scheduledFor?: string;
  page?: number;
  pageSize?: number;
}

export interface StaffOption {
  userId: string;
  fullName: string;
  email: string;
  roleCode: string;
}

// Action Inputs
export interface CreateTaskInput {
  propertyId: string;
  roomId: string;
  taskType?: HousekeepingTaskType;
  priority?: HousekeepingPriority;
  assignedTo?: string | null;
  notes?: string | null;
  scheduledFor?: string;
}

export interface AssignTaskInput {
  propertyId: string;
  taskId: string;
  assignedTo: string;
  priority?: HousekeepingPriority;
}

export interface StartTaskInput {
  propertyId: string;
  taskId: string;
}

export interface CompleteTaskInput {
  propertyId: string;
  taskId: string;
  notes?: string | null;
}

export interface PassInspectionInput {
  propertyId: string;
  taskId: string;
  notes?: string | null;
}

export interface FailInspectionInput {
  propertyId: string;
  taskId: string;
  notes: string;
}

export interface CancelTaskInput {
  propertyId: string;
  taskId: string;
  reason?: string;
}

export interface UpdatePriorityInput {
  propertyId: string;
  taskId: string;
  priority: HousekeepingPriority;
}

export interface AddNoteInput {
  propertyId: string;
  taskId: string;
  note: string;
}
