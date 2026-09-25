// ============================================================
// STAYHUB ONLINE BOOKING ENGINE TYPES (Phase 21)
// ============================================================

export interface PublicPropertyInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
  currency: string;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
  amenities: string[];
  cancellationPolicy?: string;
  bookingTerms?: string;
  isOnlineBookingEnabled: boolean;
}

export interface PublicRoomType {
  id: string;
  propertyId: string;
  name: string;
  code: string;
  description?: string;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  baseRate: number;
  currency: string;
  bedConfiguration?: string;
  roomSizeSqFt?: number;
  amenities: string[];
  totalRooms: number;
  availableCount: number;
  isAvailable: boolean;
}

export interface AvailabilitySearchParams {
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  roomsCount: number;
}

export interface PublicBookingPricing {
  nightlyRate: number;
  nights: number;
  roomsCount: number;
  roomSubtotal: number;
  discountAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

export interface PublicBookingSubmission {
  propertySlug: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  roomsCount: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests?: string;
  agreedToTerms: boolean;
  idempotencyKey?: string;
}

export interface PublicBookingConfirmation {
  confirmationNumber: string;
  propertyName: string;
  propertySlug: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomTypeName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  roomsCount: number;
  totalAmount: number;
  currency: string;
  status: string;
  bookingSource: string;
  specialRequests?: string;
  cancellationPolicy?: string;
  createdAt: string;
}

export interface PropertyOnlineBookingSettings {
  propertyId: string;
  isEnabled: boolean;
  publicDescription?: string;
  publicPhone?: string;
  publicEmail?: string;
  cancellationPolicy?: string;
  bookingTerms?: string;
  amenities: string[];
  minLeadTimeHours: number;
  maxBookingWindowDays: number;
  updatedAt: string;
}
