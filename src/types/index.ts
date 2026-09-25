// ============================================================
// STAYHUB SHARED TYPES
// ============================================================

// --- Room Status ---
export type RoomStatus =
  | "available"
  | "occupied"
  | "cleaning"
  | "maintenance"
  | "blocked"
  | "reserved";

// --- Booking Status ---
export type BookingStatus =
  | "confirmed"
  | "pending"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

// --- Payment Status ---
export type PaymentStatus =
  | "paid"
  | "pending"
  | "partial"
  | "refunded"
  | "failed";

// --- Order Status ---
export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

// --- Request Status ---
export type RequestStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

// --- Ticket Status ---
export type TicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed";

// --- User Role ---
export type UserRole =
  | "SUPER_ADMIN"
  | "HOTEL_OWNER"
  | "GENERAL_MANAGER"
  | "FRONT_DESK"
  | "RECEPTIONIST"
  | "HOUSEKEEPING"
  | "MAINTENANCE"
  | "RESTAURANT_STAFF"
  | "KITCHEN_STAFF"
  | "ACCOUNTANT";

// --- Badge Variant ---
export type BadgeVariant =
  | "available"
  | "occupied"
  | "cleaning"
  | "maintenance"
  | "blocked"
  | "reserved"
  | "confirmed"
  | "pending"
  | "cancelled"
  | "checked_in"
  | "checked_out"
  | "paid"
  | "partial"
  | "refunded"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "default"
  | "due_out"
  | "no_show";

// --- Toast ---
export type ToastType = "success" | "error" | "warning" | "info";

// --- Trend Direction ---
export type TrendDirection = "up" | "down" | "neutral";

// --- Navigation Item ---
export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

// --- KPI Data ---
export interface KPIData {
  title: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendDirection?: TrendDirection;
  trendLabel?: string;
  color?: "primary" | "success" | "warning" | "danger" | "info" | "accent";
}

// --- Room (Display) ---
export interface RoomDisplay {
  id: string;
  number: string;
  type: string;
  floor?: number;
  status: RoomStatus;
  rate?: number;
  imageUrl?: string;
  guestName?: string;
  checkoutDate?: string;
  occupiedSince?: string;
}

// --- Guest (Display) ---
export interface GuestDisplay {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  roomNumber?: string;
  bookingStatus?: BookingStatus;
  avatarUrl?: string;
  isVip?: boolean;
  nationality?: string;
}

// --- Booking (Display) ---
export interface BookingDisplay {
  id: string;
  bookingNumber: string;
  guestName: string;
  guestAvatarUrl?: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children?: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount?: number;
}

// --- Table Column ---
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

// --- Pagination ---
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
