// ============================================================
// STAYHUB MAINTENANCE TYPES & INTERFACES (Phase 11)
// ============================================================

export type MaintenanceCategory =
  | "PLUMBING"
  | "ELECTRICAL"
  | "HVAC"
  | "APPLIANCE"
  | "FURNITURE"
  | "LIGHTING"
  | "DOOR_LOCK"
  | "TV"
  | "WIFI_NETWORK"
  | "CIVIL"
  | "SAFETY"
  | "OTHER";

export type MaintenancePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type WorkOrderStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED";

export type AssetStatus =
  | "OPERATIONAL"
  | "DEGRADED"
  | "OUT_OF_SERVICE"
  | "IN_REPAIR"
  | "DISPOSED";

export type MaintenanceEventType =
  | "CREATED"
  | "ASSIGNED"
  | "STARTED"
  | "PUT_ON_HOLD"
  | "RESUMED"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED"
  | "REOPENED"
  | "NOTE_ADDED"
  | "PRIORITY_CHANGED";

export type ScheduleFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export interface MaintenanceAsset {
  id: string;
  property_id: string;
  name: string;
  asset_type: string;
  room_id?: string | null;
  serial_number?: string | null;
  status: AssetStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  room?: {
    id: string;
    room_number: string;
  } | null;
}

export interface MaintenanceWorkOrderEvent {
  id: string;
  property_id: string;
  work_order_id: string;
  event_type: MaintenanceEventType;
  from_status?: string | null;
  to_status?: string | null;
  performed_by?: string | null;
  notes?: string | null;
  created_at: string;
  performer?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | null;
}

export interface MaintenanceWorkOrder {
  id: string;
  property_id: string;
  room_id?: string | null;
  asset_id?: string | null;
  title: string;
  description?: string | null;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: WorkOrderStatus;
  reported_by?: string | null;
  assigned_to?: string | null;
  reported_at: string;
  scheduled_for?: string | null;
  started_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  cancelled_at?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  room?: {
    id: string;
    room_number: string;
    status: string;
    room_type?: {
      name: string;
      code: string;
    } | null;
    floor?: {
      floor_number: number;
      name: string;
    } | null;
  } | null;
  asset?: {
    id: string;
    name: string;
    asset_type: string;
  } | null;
  reporter?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | null;
  technician?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | null;
  events?: MaintenanceWorkOrderEvent[];
}

export interface MaintenanceSchedule {
  id: string;
  property_id: string;
  asset_id?: string | null;
  room_id?: string | null;
  title: string;
  description?: string | null;
  frequency: ScheduleFrequency;
  next_due_at: string;
  active: boolean;
  last_generated_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  room?: {
    id: string;
    room_number: string;
  } | null;
  asset?: {
    id: string;
    name: string;
  } | null;
}

export interface MaintenanceKPIs {
  open: number;
  assigned: number;
  inProgress: number;
  onHold: number;
  resolved: number;
  urgent: number;
  overdue: number;
  outOfOrderRooms: number;
}

export interface MaintenanceWorkOrderFilters {
  status?: string;
  priority?: string;
  category?: string;
  roomId?: string;
  assignedTo?: string;
  search?: string;
  isOverdue?: boolean;
}

export interface CreateWorkOrderInput {
  propertyId: string;
  title: string;
  description?: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  roomId?: string | null;
  assetId?: string | null;
  assignedTo?: string | null;
  scheduledFor?: string | null;
}

export interface AssignWorkOrderInput {
  workOrderId: string;
  assignedTo: string;
  scheduledFor?: string | null;
  notes?: string;
}

export interface ResolveWorkOrderInput {
  workOrderId: string;
  resolutionNotes: string;
}

export interface SetRoomMaintenanceStatusInput {
  propertyId: string;
  roomId: string;
  operationalStatus: "AVAILABLE" | "DIRTY" | "OUT_OF_ORDER" | "OUT_OF_SERVICE";
  reason?: string;
}
