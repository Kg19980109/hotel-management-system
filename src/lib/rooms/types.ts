/**
 * STAYHUB - Room Management Type Definitions
 * Phase 6: Room Management & Room Inventory Engine
 */

export type RoomOperationalStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "DIRTY"
  | "CLEANING"
  | "INSPECTED"
  | "OUT_OF_ORDER"
  | "OUT_OF_SERVICE";

export type RoomHousekeepingStatus =
  | "CLEAN"
  | "DIRTY"
  | "CLEANING"
  | "INSPECTION_PENDING";

export type RoomAvailabilityStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "OCCUPIED"
  | "MAINTENANCE"
  | "BLOCKED";

export interface Floor {
  id: string;
  property_id: string;
  name: string;
  floor_number: number | null;
  description: string | null;
  status: string;
  sort_order: number;
  room_count?: number;
  created_at: string;
  updated_at: string;
}

export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  code: string;
  description: string | null;
  max_occupancy: number;
  base_rate: number;
  currency: string;
  bed_configuration: string | null;
  amenities: string[];
  size_sqft: number | null;
  size_sqm: number | null;
  status: string;
  is_active: boolean;
  room_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  property_id: string;
  floor_id: string | null;
  room_type_id: string;
  room_number: string;
  room_name: string | null;
  status: RoomOperationalStatus;
  housekeeping_status: RoomHousekeepingStatus;
  availability_status: RoomAvailabilityStatus;
  max_occupancy: number | null;
  floor_label: string | null;
  view_type: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined relation objects
  room_type?: RoomType | null;
  floor?: Floor | null;
}

export interface RoomStats {
  total: number;
  available: number;
  occupied: number;
  dirty: number;
  cleaning: number;
  inspected: number;
  outOfOrder: number;
  inactive: number;
}

export interface RoomFilterOptions {
  status?: RoomOperationalStatus | "ALL";
  housekeepingStatus?: RoomHousekeepingStatus | "ALL";
  floorId?: string | "ALL";
  roomTypeId?: string | "ALL";
  isActive?: boolean | "ALL";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface RoomActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
