/**
 * STAYHUB - Dashboard Type Definitions
 * Phase 5: Real Hotel Dashboard & Metrics Engine
 */

export type MetricStatus = "configured" | "no_inventory" | "no_billing" | "empty" | "error";

export interface DashboardMetrics {
  // Occupancy KPI
  occupancyRate: number;
  occupancyStatus: MetricStatus;
  
  // Rooms KPI
  availableRooms: number;
  totalRooms: number;
  roomStatus: MetricStatus;
  
  // Front Desk KPIs
  arrivalsToday: number;
  arrivalsPending: number;
  departuresToday: number;
  departuresPending: number;
  inHouseGuests: number;
  
  // Financial KPIs
  todayRevenue: number;
  revenueCurrency: string;
  revenueStatus: MetricStatus;
  adr: number; // Average Daily Rate
  revpar: number; // Revenue Per Available Room
}

export interface RoomStatusSummary {
  total: number;
  available: number;
  occupied: number;
  dirty: number;
  maintenance: number;
  outOfOrder: number;
  isConfigured: boolean;
}

export interface ArrivalItem {
  id: string;
  guestName: string;
  bookingReference: string;
  roomNumber?: string;
  roomType?: string;
  arrivalTime: string;
  status: "confirmed" | "checked_in" | "delayed" | "cancelled";
  paymentStatus?: "paid" | "partial" | "unpaid";
}

export interface DepartureItem {
  id: string;
  guestName: string;
  bookingReference: string;
  roomNumber?: string;
  departureTime: string;
  status: "pending" | "checked_out" | "overdue";
  balanceDue?: number;
}

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "danger";
  category: "operations" | "housekeeping" | "maintenance" | "billing" | "system";
  actionLabel?: string;
  actionHref?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  type: "booking" | "guest" | "room" | "payment" | "system";
}

export interface PropertyContextInfo {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  currency: string;
  timezone: string;
}

export interface DashboardData {
  property: PropertyContextInfo;
  metrics: DashboardMetrics;
  roomStatus: RoomStatusSummary;
  arrivals: ArrivalItem[];
  departures: DepartureItem[];
  attentionItems: AttentionItem[];
  recentActivity: ActivityItem[];
  lastUpdated: string;
}
