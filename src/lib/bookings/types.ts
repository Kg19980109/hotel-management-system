// ============================================================
// STAYHUB RESERVATION & BOOKING TYPES (Phase 7)
// ============================================================

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "NO_SHOW"
  | "COMPLETED";

export type BookingSource =
  | "DIRECT"
  | "WALK_IN"
  | "PHONE"
  | "EMAIL"
  | "WEBSITE"
  | "OTA"
  | "CORPORATE"
  | "TRAVEL_AGENT"
  | "OTHER";

export interface Guest {
  id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationRoom {
  id: string;
  reservation_id: string;
  property_id: string;
  room_type_id: string;
  room_id: string | null;
  check_in_date: string;
  check_out_date: string;
  is_cancelled: boolean;
  adults: number;
  children: number;
  nightly_rate: number;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  room_type_name?: string;
  room_type_code?: string;
  room_number?: string | null;
  room_name?: string | null;
  stay?: {
    id: string;
    status: "EXPECTED" | "CHECKED_IN" | "CHECKED_OUT" | "NO_SHOW" | "CANCELLED";
    actual_check_in_at: string | null;
    actual_check_out_at: string | null;
    room_id: string;
  } | null;
}

export interface Reservation {
  id: string;
  property_id: string;
  confirmation_number: string;
  status: ReservationStatus;
  booking_source: BookingSource;
  booked_at: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  special_requests: string | null;
  internal_notes: string | null;
  primary_guest_id: string;
  total_amount: number;
  currency: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation details
  primary_guest?: Guest;
  rooms?: ReservationRoom[];
  nights?: number;
}

export interface BookingKPIStats {
  todayArrivals: number;
  todayDepartures: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  activeStays: number;
  totalBookings: number;
}

export interface BookingFilterOptions {
  search?: string;
  status?: ReservationStatus | "ALL";
  bookingSource?: BookingSource | "ALL";
  roomTypeId?: string | "ALL";
  datePreset?: "TODAY" | "TOMORROW" | "NEXT_7_DAYS" | "NEXT_30_DAYS" | "CUSTOM" | "ALL";
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface RoomTypeAvailability {
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  baseRate: number;
  currency: string;
  maxOccupancy: number;
  totalRooms: number;
  availableRooms: number;
  reservedRooms: number;
  physicalRooms: {
    id: string;
    room_number: string;
    room_name: string | null;
    status: string;
    floor_name: string | null;
  }[];
}

export interface CreateBookingInput {
  propertyId: string;
  guestId?: string;
  guest: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    nationality?: string;
  };
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children?: number;
  bookingSource: BookingSource;
  specialRequests?: string;
  internalNotes?: string;
  rooms: {
    roomTypeId: string;
    roomId?: string | null;
    adults: number;
    children?: number;
    nightlyRate: number;
  }[];
}

export interface UpdateBookingInput {
  bookingId: string;
  propertyId: string;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
  bookingSource?: BookingSource;
  specialRequests?: string | null;
  internalNotes?: string | null;
  roomAssignments?: {
    reservationRoomId: string;
    roomId: string | null;
  }[];
}
