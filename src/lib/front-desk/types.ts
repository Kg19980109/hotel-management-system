// ============================================================
// STAYHUB FRONT DESK & STAY LIFECYCLE TYPES (Phase 8)
// ============================================================

export type StayStatus =
  | "EXPECTED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "NO_SHOW"
  | "CANCELLED";

export interface StayGuestSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  nationality: string | null;
}

export interface StayRoomSummary {
  id: string;
  room_number: string;
  room_name: string | null;
  status: string;
  housekeeping_status: string;
  room_type?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface StayReservationSummary {
  id: string;
  confirmation_number: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  booking_source: string;
  special_requests: string | null;
  internal_notes: string | null;
}

export interface Stay {
  id: string;
  property_id: string;
  reservation_id: string;
  reservation_room_id: string | null;
  guest_id: string;
  room_id: string;
  status: StayStatus;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  expected_check_out_date: string;
  adults: number;
  children: number;
  notes: string | null;
  check_in_by: string | null;
  check_out_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;

  // Joined metadata
  guest?: StayGuestSummary;
  room?: StayRoomSummary;
  reservation?: StayReservationSummary;
}

export interface FrontDeskKPIStats {
  todayArrivals: number;
  todayDepartures: number;
  inHouseGuests: number;
  occupiedRooms: number;
  availableRooms: number;
  attentionRooms: number;
  totalRooms: number;
  occupancyRate: number; // percentage
}

export interface ArrivalRecord {
  reservationRoomId: string;
  reservationId: string;
  confirmationNumber: string;
  guestId: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  roomId: string | null;
  roomNumber: string | null;
  roomStatus: string | null;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  bookingSource: string;
  specialRequests: string | null;
  status: "CONFIRMED" | "PENDING";
  stayId: string | null;
  stayStatus: StayStatus | null;
}

export interface DepartureRecord {
  stayId: string;
  reservationId: string;
  confirmationNumber: string;
  guestId: string;
  guestName: string;
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  actualCheckInAt: string;
  expectedCheckOutDate: string;
  adults: number;
  children: number;
  status: StayStatus;
  notes: string | null;
}

export interface InHouseRecord {
  stayId: string;
  reservationId: string;
  confirmationNumber: string;
  guestId: string;
  guestName: string;
  guestPhone: string | null;
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  actualCheckInAt: string;
  expectedCheckOutDate: string;
  adults: number;
  children: number;
  status: StayStatus;
  notes: string | null;
}

export interface RoomAttentionRecord {
  roomId: string;
  roomNumber: string;
  roomName: string | null;
  roomTypeName: string;
  floorName: string | null;
  status: string;
  housekeepingStatus: string;
}

export interface CheckInInput {
  reservationRoomId: string;
  roomId: string;
  propertyId: string;
  adults?: number;
  children?: number;
  notes?: string;
  isEarly?: boolean;
}

export interface CheckOutInput {
  stayId: string;
  propertyId: string;
  allowUnpaidOverride?: boolean;
}

export interface NoShowInput {
  reservationId: string;
  propertyId: string;
  reason?: string;
}
