// ============================================================
// STAYHUB GUEST CRM & PROFILE TYPES (Phase 9)
// ============================================================

export type GuestStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export type IDDocumentType = "PASSPORT" | "DRIVERS_LICENSE" | "NATIONAL_ID" | "OTHER";

export type PreferenceType =
  | "ROOM"
  | "BED"
  | "FLOOR"
  | "DIETARY"
  | "PILLOW"
  | "COMMUNICATION"
  | "GENERAL";

export interface GuestPreference {
  id: string;
  property_id: string;
  guest_id: string;
  preference_type: PreferenceType;
  preference_value: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestNote {
  id: string;
  property_id: string;
  guest_id: string;
  note: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  author_name?: string | null;
}

export interface GuestCRM {
  id: string;
  property_id: string;
  title?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  preferred_name?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  alternate_phone?: string | null;
  country_code?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  preferred_language?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  id_document_type?: IDDocumentType | null;
  id_document_number?: string | null;
  id_document_country?: string | null;
  company_name?: string | null;
  job_title?: string | null;
  notes?: string | null;
  marketing_consent: boolean;
  status: GuestStatus;
  created_at: string;
  updated_at: string;

  // Computed & Joined Aggregations
  preferences?: GuestPreference[];
  guest_notes?: GuestNote[];
  stats?: GuestStats;
  current_stay?: {
    id: string;
    room_number: string;
    room_type_name: string;
    actual_check_in_at: string;
    expected_check_out_date: string;
    status: string;
  } | null;
  upcoming_reservation?: {
    id: string;
    confirmation_number: string;
    check_in_date: string;
    check_out_date: string;
    room_type_name?: string;
    status: string;
  } | null;
  reservations?: GuestReservationItem[];
  stays?: GuestStayItem[];
}

export interface GuestReservationItem {
  id: string;
  confirmation_number: string;
  check_in_date: string;
  check_out_date: string;
  booking_source: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  reservation_rooms?: {
    room_type?: { name: string; code: string };
    room?: { room_number: string };
  }[];
}

export interface GuestStayItem {
  id: string;
  status: string;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  expected_check_out_date: string;
  room?: {
    room_number: string;
    room_type?: { name: string };
  };
}

export interface GuestStats {
  totalVisits: number;
  totalStays: number;
  completedStays: number;
  cancelledReservations: number;
  noShows: number;
  totalNights: number;
  firstVisitDate: string | null;
  lastVisitDate: string | null;
  isReturning: boolean;
}

export interface GuestKPIStats {
  totalGuests: number;
  activeGuests: number;
  returningGuests: number;
  currentlyInHouse: number;
  arrivingToday: number;
  departingToday: number;
}

export interface DuplicateGuestCandidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  status: GuestStatus;
  created_at: string;
  matchReasons: ("email" | "phone" | "name")[];
}

export interface GuestFilterOptions {
  search?: string;
  status?: GuestStatus | "ALL";
  nationality?: string;
  isReturningOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateGuestInput {
  propertyId: string;
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  gender?: string;
  preferredLanguage?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  countryCode?: string;
  nationality?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  idDocumentType?: IDDocumentType;
  idDocumentNumber?: string;
  idDocumentCountry?: string;
  companyName?: string;
  jobTitle?: string;
  notes?: string;
  marketingConsent?: boolean;
  status?: GuestStatus;
}

export interface UpdateGuestInput extends Partial<CreateGuestInput> {
  id: string;
  propertyId: string;
}
