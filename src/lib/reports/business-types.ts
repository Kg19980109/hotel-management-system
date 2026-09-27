// ============================================================
// STAYHUB OWNER BUSINESS INTELLIGENCE & REPORTS — TYPES
// ============================================================

import type { DateRangePreset, ComparisonPreset, ComparisonMetric } from "./types";

export interface BusinessAttentionItem {
  id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  category: "FINANCIAL" | "OCCUPANCY" | "OPERATIONS" | "INVENTORY" | "MAINTENANCE";
  title: string;
  description: string;
  metricValue?: string | number;
  actionHref?: string;
  actionLabel?: string;
}

export interface OwnerExecutiveKpis {
  totalRevenue: ComparisonMetric;
  totalExpenses: ComparisonMetric;
  operatingResult: ComparisonMetric;
  occupancyRate: ComparisonMetric;
  adr: ComparisonMetric;
  revpar: ComparisonMetric;
  totalBookings: ComparisonMetric;
  avgBookingValue: ComparisonMetric;
  outstandingReceivables: number;
}

export interface FinancialPerformanceSummary {
  grossRevenue: number;
  roomRevenue: number;
  restaurantRevenue: number;
  roomServiceRevenue: number;
  otherServicesRevenue: number;
  totalExpenses: number;
  operatingResult: number;
  taxAmount: number;
  paymentsCollected: number;
  outstandingReceivables: number;
  refundsAmount: number;
}

export interface RevenueCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface RoomBookingPerformanceSummary {
  occupancyRate: number;
  adr: number;
  revpar: number;
  sellableRooms: number;
  occupiedRooms: number;
  outOfOrderRooms: number;
  arrivals: number;
  departures: number;
  cancellations: number;
  noShows: number;
  alos: number;
  leadTimeDays: number;
  bookingSources: Array<{ source: string; count: number; revenue: number; percentage: number }>;
}

export interface RestaurantFbPerformanceSummary {
  totalFbSales: number;
  dineInRevenue: number;
  roomServiceRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  orderTypes: Array<{ type: string; count: number; percentage: number }>;
}

export interface OperationsIntelligenceSummary {
  housekeeping: {
    tasksCreated: number;
    tasksCompleted: number;
    completionRate: number;
    pendingTasks: number;
  };
  maintenance: {
    totalRequests: number;
    openRequests: number;
    inProgressRequests: number;
    completedRequests: number;
    highPriorityCount: number;
  };
  inventory: {
    lowStockItemsCount: number;
    totalStockPurchased: number;
    totalConsumptionAmount: number;
    topConsumedItems: Array<{ name: string; quantity: number; cost: number }>;
  };
  staff: {
    activeStaffCount: number;
    attendanceRate: number;
    absentDaysCount: number;
    departmentHeadcounts: Array<{ department: string; count: number }>;
  };
  guestServices: {
    totalRequests: number;
    completedRequests: number;
    completionRate: number;
    pendingRequests: number;
  };
}

export interface OutstandingReceivablesSummary {
  unpaidFoliosCount: number;
  unpaidFoliosTotal: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesTotal: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface BusinessDailyTrend {
  date: string;
  revenue: number;
  expenses: number;
  operatingResult: number;
  occupancyRate: number;
  adr: number;
}

export interface OwnerBusinessReportData {
  propertyId: string;
  propertyName: string;
  currency: string;
  timezone: string;
  dateRange: {
    preset: DateRangePreset;
    startDate: string;
    endDate: string;
    previousStartDate: string;
    previousEndDate: string;
  };
  comparisonPreset: ComparisonPreset;
  executiveKpis: OwnerExecutiveKpis;
  financialPerformance: FinancialPerformanceSummary;
  revenueBreakdown: RevenueCategoryBreakdown[];
  roomPerformance: RoomBookingPerformanceSummary;
  restaurantPerformance: RestaurantFbPerformanceSummary;
  expenseIntelligence: {
    totalExpenses: number;
    topCategoryName: string | null;
    topCategoryAmount: number;
    topVendorName: string | null;
    topVendorAmount: number;
    byCategory: Array<{ name: string; amount: number; percentage: number }>;
    byDepartment: Array<{ name: string; amount: number; percentage: number }>;
  };
  operationsIntelligence: OperationsIntelligenceSummary;
  outstandingMoney: OutstandingReceivablesSummary;
  attentionItems: BusinessAttentionItem[];
  dailyTrends: BusinessDailyTrend[];
}
