/**
 * Types for Guest Service Requests domain
 */

export type ServiceRequestCategory =
  | "HOUSEKEEPING"
  | "FRONT_DESK"
  | "CONCIERGE"
  | "MAINTENANCE"
  | "LAUNDRY"
  | "SPA"
  | "TRANSPORT"
  | "ROOM_SERVICE"
  | "OTHER";

export type ServiceRequestPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ServiceRequestStatus =
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export interface GuestServiceRequestSummary {
  id: string;
  category: ServiceRequestCategory;
  request_type: string;
  title: string;
  description?: string | null;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  guest_visible_notes?: string | null;
  requested_at: string;
  started_at?: string | null;
  acknowledged_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

export interface GuestServiceRequestDetailEvent {
  id: string;
  event_type: string;
  from_status?: string | null;
  to_status: string;
  actor_type: "GUEST" | "STAFF" | "SYSTEM";
  created_at: string;
}

export interface GuestServiceRequestDetail {
  id: string;
  room_number: string;
  category: ServiceRequestCategory;
  request_type: string;
  title: string;
  description?: string | null;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  guest_visible_notes?: string | null;
  requested_at: string;
  acknowledged_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  events: GuestServiceRequestDetailEvent[];
}

export interface StaffGuestServiceRequest {
  id: string;
  property_id: string;
  guest_id: string;
  stay_id: string;
  room_id: string;
  category: ServiceRequestCategory;
  request_type: string;
  title: string;
  description?: string | null;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  requested_at: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  assigned_to?: string | null;
  assigned_department?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  guest_visible_notes?: string | null;
  staff_notes?: string | null;
  created_by_guest: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations for staff view
  room?: {
    id: string;
    room_number: string;
  };
  guest?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  assigned_staff?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface StaffGuestServiceRequestEvent {
  id: string;
  property_id: string;
  request_id: string;
  event_type: string;
  from_status?: string | null;
  to_status: string;
  actor_type: "GUEST" | "STAFF" | "SYSTEM";
  actor_profile_id?: string | null;
  actor_name?: string | null;
  event_note?: string | null;
  created_at: string;
}
