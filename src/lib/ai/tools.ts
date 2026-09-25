// ============================================================
// STAYHUB CONTROLLED AI BUSINESS TOOLS (Phase 20)
// Strictly Read-Only business tools querying authoritative domain reports
// ============================================================

import { createClient } from "@/lib/supabase/server";
import {
  getDashboardReport,
  getOccupancyReport,
  getRoomPerformanceReport,
  getReservationReport,
  getFrontDeskReport,
  getGuestAnalyticsReport,
  getRevenueReport,
  getFinancialReport,
  getRestaurantReport,
  getKitchenReport,
  getHousekeepingReport,
  getMaintenanceReport,
  getInventoryReport,
  getSupplierReport,
  getStaffReport,
  getExpenseReport,
  getGuestServiceReport,
} from "../reports/queries";
import { parseNaturalLanguageDateRange } from "./formatters";
import type { AIToolDefinition, AIExecutionContext } from "./types";
import { formatCurrency, formatPercentage } from "../reports/formatters";

// 1. Hotel Overview Tool
export const getHotelOverviewTool: AIToolDefinition = {
  name: "get_hotel_overview",
  displayName: "Hotel Overview",
  description: "Get general executive KPIs including occupancy, ADR, RevPAR, total revenue, arrivals, and departures for a specified date range.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Natural language date range (e.g. 'today', 'yesterday', 'this month', 'last 30 days')",
        default: "today",
      },
    },
  },
  sensitivity: "internal",
  requiredPermission: "REPORTS_VIEW",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "today", context.timezone);
    const supabase = await createClient();
    const data = await getDashboardReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: data.propertyContext.propertyName,
      dateRange: `${dates.startDate} to ${dates.endDate}`,
      preset: dates.preset,
      occupancy: formatPercentage(data.kpis.occupancy.current),
      occupancyDelta: data.kpis.occupancy.displayPctDiff,
      adr: formatCurrency(data.kpis.adr.current, context.currency),
      revPar: formatCurrency(data.kpis.revPar.current, context.currency),
      roomRevenue: formatCurrency(data.kpis.roomRevenue.current, context.currency),
      totalRevenue: formatCurrency(data.kpis.totalRevenue.current, context.currency),
      arrivals: data.kpis.arrivals.current,
      departures: data.kpis.departures.current,
      inHouseGuests: data.kpis.inHouseGuests.current,
      openWorkOrders: data.kpis.maintenanceOpenOrders.current,
      lowStockItems: data.kpis.lowStockItemsCount,
      housekeepingPassRate: formatPercentage(data.kpis.housekeepingCompletionRate.current),
    };
  },
};

// 2. Occupancy Metrics Tool
export const getOccupancyMetricsTool: AIToolDefinition = {
  name: "get_occupancy_metrics",
  displayName: "Occupancy & Utilization",
  description: "Get detailed room occupancy percentage, sellable room nights, occupied room nights, and out of order rooms.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Date range (e.g. 'yesterday', 'this month', 'last week')",
        default: "this month",
      },
    },
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_OCCUPANCY",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "this month", context.timezone);
    const supabase = await createClient();
    const data = await getOccupancyReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: context.propertyName,
      period: `${dates.startDate} to ${dates.endDate}`,
      totalRooms: data.summary.totalRooms,
      sellableRoomNights: data.summary.sellableRoomNights,
      occupiedRoomNights: data.summary.occupiedRoomNights,
      outOfOrderNights: data.summary.outOfOrderNights,
      outOfServiceNights: data.summary.outOfServiceNights,
      occupancyRate: formatPercentage(data.summary.occupancyRate.current),
      occupancyDelta: data.summary.occupancyRate.displayPctDiff,
      adr: formatCurrency(data.summary.adr.current, context.currency),
      revPar: formatCurrency(data.summary.revPar.current, context.currency),
    };
  },
};

// 3. Room Status Summary Tool
export const getRoomStatusSummaryTool: AIToolDefinition = {
  name: "get_room_status_summary",
  displayName: "Room Inventory & Status",
  description: "Get current room statuses (clean, dirty, inspected, out of order, maintenance) and room-type utilization.",
  parameters: {
    type: "object",
    properties: {},
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_OCCUPANCY",
  execute: async (_params, context: AIExecutionContext) => {
    const supabase = await createClient();
    const data = await getRoomPerformanceReport(supabase, context.propertyId, { preset: "LAST_30_DAYS" });

    return {
      property: context.propertyName,
      totalRooms: data.rooms.length,
      averageOccupancy: formatPercentage(data.summary.overallOccupancy),
      roomTypes: data.roomTypes.map((rt) => ({
        type: rt.roomTypeName,
        totalRooms: rt.totalRooms,
        occupancy: formatPercentage(rt.occupancyRate),
        revenue: formatCurrency(rt.totalRevenue, context.currency),
      })),
      floors: data.byFloor.map((f) => ({
        floor: f.floor,
        rooms: f.roomsCount,
        occupancy: formatPercentage(f.occupancyRate),
      })),
    };
  },
};

// 4. Revenue Metrics Tool
export const getRevenueMetricsTool: AIToolDefinition = {
  name: "get_revenue_metrics",
  displayName: "Revenue & Income Streams",
  description: "Get gross charges, ledger discounts, taxes collected, room revenue, restaurant sales, and net revenue.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Date range (e.g. 'this month', 'today', 'last 7 days')",
        default: "this month",
      },
    },
  },
  sensitivity: "financial",
  requiredPermission: "REPORT_REVENUE",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "this month", context.timezone);
    const supabase = await createClient();
    const data = await getRevenueReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: context.propertyName,
      period: `${dates.startDate} to ${dates.endDate}`,
      grossCharges: formatCurrency(data.summary.grossCharges.current, context.currency),
      discounts: formatCurrency(data.summary.discounts, context.currency),
      taxesCollected: formatCurrency(data.summary.taxes, context.currency),
      netRevenue: formatCurrency(data.summary.netRevenue.current, context.currency),
      netRevenueDelta: data.summary.netRevenue.displayPctDiff,
      roomRevenue: formatCurrency(data.summary.roomRevenue.current, context.currency),
      restaurantRevenue: formatCurrency(data.summary.restaurantRevenue.current, context.currency),
      paymentsReceived: formatCurrency(data.summary.totalPayments.current, context.currency),
      refundsIssued: formatCurrency(data.summary.totalRefunds, context.currency),
      outstandingBalance: formatCurrency(data.summary.outstandingBalance, context.currency),
    };
  },
};

// 5. Folio & Financial Ledger Tool
export const getFolioSummaryTool: AIToolDefinition = {
  name: "get_folio_summary",
  displayName: "Folios & Invoices Ledger",
  description: "Get active open folios count, settled folios, total charges, payments collected, and unpaid invoice counts.",
  parameters: {
    type: "object",
    properties: {},
  },
  sensitivity: "financial",
  requiredPermission: "REPORT_FINANCIALS",
  execute: async (_params, context: AIExecutionContext) => {
    const supabase = await createClient();
    const data = await getFinancialReport(supabase, context.propertyId, { preset: "LAST_30_DAYS" });

    return {
      property: context.propertyName,
      totalFolios: data.summary.totalFolios,
      openFolios: data.summary.openFoliosCount,
      settledFolios: data.summary.settledFoliosCount,
      totalCharges: formatCurrency(data.summary.totalCharges, context.currency),
      totalPayments: formatCurrency(data.summary.totalPayments, context.currency),
      outstandingBalance: formatCurrency(data.summary.outstandingFoliosBalance, context.currency),
      invoicesIssued: data.summary.invoicesCount,
      paidInvoices: data.summary.paidInvoicesCount,
      unpaidInvoices: data.summary.unpaidInvoicesCount + data.summary.partiallyPaidInvoicesCount,
    };
  },
};

// 6. Reservation Summary Tool
export const getReservationSummaryTool: AIToolDefinition = {
  name: "get_reservation_summary",
  displayName: "Reservation & Bookings Summary",
  description: "Get total booking counts, channel mix (Direct, OTA, Walk-in), ALOS, lead time, and cancellations.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Date range (e.g. 'this month', 'last 30 days')",
        default: "this month",
      },
    },
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_RESERVATIONS",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "this month", context.timezone);
    const supabase = await createClient();
    const data = await getReservationReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: context.propertyName,
      period: `${dates.startDate} to ${dates.endDate}`,
      totalBookings: data.summary.totalReservations.current,
      confirmed: data.summary.confirmedCount,
      pending: data.summary.pendingCount,
      cancelled: data.summary.cancelledCount,
      cancellationRate: formatPercentage(data.summary.cancellationRate),
      averageLengthOfStay: `${data.summary.averageLengthOfStay.current} nights`,
      averageLeadTime: `${data.summary.averageLeadTimeDays.current} days`,
      bookingSources: data.bySource.map((s) => ({
        channel: s.source,
        bookings: s.count,
        share: `${s.percentage}%`,
        revenue: formatCurrency(s.revenue, context.currency),
      })),
    };
  },
};

// 7. Front Desk Summary Tool
export const getFrontDeskSummaryTool: AIToolDefinition = {
  name: "get_front_desk_summary",
  displayName: "Front Desk & Stays",
  description: "Get today's arrivals, departures, currently in-house guests, and no-shows.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Date range (default 'today')",
        default: "today",
      },
    },
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_RESERVATIONS",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "today", context.timezone);
    const supabase = await createClient();
    const data = await getFrontDeskReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: context.propertyName,
      date: dates.startDate,
      arrivals: data.summary.arrivalsCount.current,
      departures: data.summary.departuresCount.current,
      inHouseGuests: data.summary.currentInHouseGuests,
      inHouseRooms: data.summary.currentInHouseRooms,
      noShows: data.summary.noShowsCount,
    };
  },
};

// 8. Guest Summary Tool
export const getGuestSummaryTool: AIToolDefinition = {
  name: "get_guest_summary",
  displayName: "Guest Profiles & Demographics",
  description: "Get guest counts, new vs returning guest ratios, and nationality breakdowns (no private PII).",
  parameters: {
    type: "object",
    properties: {},
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_GUESTS",
  execute: async (_params, context: AIExecutionContext) => {
    const supabase = await createClient();
    const data = await getGuestAnalyticsReport(supabase, context.propertyId, { preset: "LAST_30_DAYS" });

    return {
      property: context.propertyName,
      totalGuests: data.summary.totalGuests.current,
      newGuests: data.summary.newGuests,
      returningGuests: data.summary.returningGuests,
      returningGuestRate: formatPercentage(data.summary.returningGuestRate),
      topNationalities: data.byNationality.slice(0, 5).map((n) => ({
        country: n.country,
        count: n.guestCount,
        percentage: `${n.percentage}%`,
      })),
    };
  },
};

// 9. Restaurant Summary Tool
export const getRestaurantSummaryTool: AIToolDefinition = {
  name: "get_restaurant_summary",
  displayName: "Restaurant & F&B Operations",
  description: "Get restaurant sales volume, order counts (dine-in, room service, takeaway), and average order value.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Date range (e.g. 'this week', 'today', 'this month')",
        default: "this month",
      },
    },
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_RESTAURANT",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "this month", context.timezone);
    const supabase = await createClient();
    const data = await getRestaurantReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: context.propertyName,
      period: `${dates.startDate} to ${dates.endDate}`,
      totalOrders: data.summary.totalOrders.current,
      completedOrders: data.summary.completedOrders,
      grossSales: formatCurrency(data.summary.grossSales.current, context.currency),
      dineInSales: formatCurrency(data.summary.dineInSales, context.currency),
      roomServiceSales: formatCurrency(data.summary.roomServiceSales, context.currency),
      takeawaySales: formatCurrency(data.summary.takeawaySales, context.currency),
      averageOrderValue: formatCurrency(data.summary.averageOrderValue, context.currency),
    };
  },
};

// 10. Kitchen / KDS Summary Tool
export const getKitchenSummaryTool: AIToolDefinition = {
  name: "get_kitchen_summary",
  displayName: "Kitchen Display (KDS)",
  description: "Get kitchen ticket volume, completed tickets, average prep time in minutes, and delayed orders.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Date range (e.g. 'today', 'this week')",
        default: "today",
      },
    },
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_KITCHEN",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "today", context.timezone);
    const supabase = await createClient();
    const data = await getKitchenReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: context.propertyName,
      period: `${dates.startDate} to ${dates.endDate}`,
      totalTickets: data.summary.totalTickets.current,
      completedTickets: data.summary.completedTickets,
      averagePrepTimeMinutes: `${data.summary.averagePrepTimeMinutes.current} mins`,
      delayedTickets: data.summary.delayedTicketsCount,
    };
  },
};

// 11. Housekeeping Summary Tool
export const getHousekeepingSummaryTool: AIToolDefinition = {
  name: "get_housekeeping_summary",
  displayName: "Housekeeping Operations",
  description: "Get cleaning tasks created, completed, pending rooms to clean, and supervisor inspection pass rate.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Date range (e.g. 'today', 'this week')",
        default: "today",
      },
    },
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_HOUSEKEEPING",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "today", context.timezone);
    const supabase = await createClient();
    const data = await getHousekeepingReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: context.propertyName,
      date: dates.startDate,
      tasksCreated: data.summary.tasksCreated.current,
      tasksCompleted: data.summary.tasksCompleted,
      pendingTasks: data.summary.pendingTasks,
      roomsWaitingCleaning: data.summary.roomsWaitingCleaning,
      inspectionPassRate: formatPercentage(data.summary.inspectionPassRate.current),
      avgCleaningTime: `${data.summary.averageCleaningTimeMinutes} mins`,
    };
  },
};

// 12. Maintenance Summary Tool
export const getMaintenanceSummaryTool: AIToolDefinition = {
  name: "get_maintenance_summary",
  displayName: "Maintenance & Work Orders",
  description: "Get open maintenance work orders, completed repairs, overdue tickets, and average resolution time.",
  parameters: {
    type: "object",
    properties: {},
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_MAINTENANCE",
  execute: async (_params, context: AIExecutionContext) => {
    const supabase = await createClient();
    const data = await getMaintenanceReport(supabase, context.propertyId, { preset: "LAST_30_DAYS" });

    return {
      property: context.propertyName,
      openWorkOrders: data.summary.openWorkOrders.current,
      completedWorkOrders: data.summary.completedWorkOrders,
      averageResolutionHours: `${data.summary.averageResolutionTimeHours} hrs`,
      overdueWorkOrders: data.summary.overdueWorkOrdersCount,
      roomsOutOfService: data.summary.roomsOutOfServiceCount,
    };
  },
};

// 13. Inventory Summary Tool
export const getInventorySummaryTool: AIToolDefinition = {
  name: "get_inventory_summary",
  displayName: "Inventory & Stock Levels",
  description: "Get inventory items count, low-stock alerts, out-of-stock items, purchases received, and consumption.",
  parameters: {
    type: "object",
    properties: {},
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_INVENTORY",
  execute: async (_params, context: AIExecutionContext) => {
    const supabase = await createClient();
    const data = await getInventoryReport(supabase, context.propertyId, { preset: "LAST_30_DAYS" });

    return {
      property: context.propertyName,
      totalItems: data.summary.totalItems,
      lowStockCount: data.summary.lowStockItemsCount,
      outOfStockCount: data.summary.outOfStockItemsCount,
      purchasesQty: data.summary.purchasesQuantity,
      consumptionQty: data.summary.consumptionQuantity,
      wasteQty: data.summary.wasteQuantity,
      topMovingItems: data.topMovingItems.map((i) => ({
        item: i.itemName,
        stock: i.currentStock,
        consumed: i.outflow,
      })),
    };
  },
};

// 14. Supplier Summary Tool
export const getSupplierSummaryTool: AIToolDefinition = {
  name: "get_supplier_summary",
  displayName: "Suppliers & Purchase Orders",
  description: "Get registered suppliers count, purchase order counts, total committed PO value, and pending orders.",
  parameters: {
    type: "object",
    properties: {},
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_SUPPLIERS",
  execute: async (_params, context: AIExecutionContext) => {
    const supabase = await createClient();
    const data = await getSupplierReport(supabase, context.propertyId, { preset: "LAST_30_DAYS" });

    return {
      property: context.propertyName,
      totalSuppliers: data.summary.totalSuppliers,
      purchaseOrdersCount: data.summary.totalPurchaseOrders.current,
      totalPoValue: formatCurrency(data.summary.totalPurchaseValue.current, context.currency),
      pendingOrdersCount: data.summary.pendingOrdersCount,
    };
  },
};

// 15. Staff Summary Tool
export const getStaffSummaryTool: AIToolDefinition = {
  name: "get_staff_summary",
  displayName: "Staff & Attendance",
  description: "Get active employee count, shifts scheduled, present staff, late check-ins, and attendance rate.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Date range (e.g. 'today', 'this month')",
        default: "today",
      },
    },
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_STAFF",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "today", context.timezone);
    const supabase = await createClient();
    const data = await getStaffReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: context.propertyName,
      date: dates.startDate,
      activeStaff: data.summary.activeStaffCount,
      presentStaff: data.summary.presentCount,
      lateStaff: data.summary.lateCount,
      onLeave: data.summary.onLeaveCount,
      attendanceRate: formatPercentage(data.summary.overallAttendanceRate.current),
    };
  },
};

// 16. Expense Summary Tool
export const getExpenseSummaryTool: AIToolDefinition = {
  name: "get_expense_summary",
  displayName: "Staff Expenses",
  description: "Get total staff expense spend, pending approval claims, approved claims, and reimbursed payouts.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Date range (e.g. 'this month', 'last month')",
        default: "this month",
      },
    },
  },
  sensitivity: "financial",
  requiredPermission: "REPORT_EXPENSES",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "this month", context.timezone);
    const supabase = await createClient();
    const data = await getExpenseReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: context.propertyName,
      period: `${dates.startDate} to ${dates.endDate}`,
      totalClaims: data.summary.totalExpensesCount.current,
      totalSpend: formatCurrency(data.summary.totalSpend.current, context.currency),
      pendingApproval: formatCurrency(data.summary.pendingApprovalAmount, context.currency),
      approvedSpend: formatCurrency(data.summary.approvedAmount, context.currency),
      paidReimbursements: formatCurrency(data.summary.paidAmount, context.currency),
      byCategory: data.byCategory.map((c) => ({
        category: c.category,
        amount: formatCurrency(c.amount, context.currency),
        share: `${c.percentage}%`,
      })),
    };
  },
};

// 17. Guest Services Tool
export const getGuestServiceSummaryTool: AIToolDefinition = {
  name: "get_guest_service_summary",
  displayName: "Guest Services & Requests",
  description: "Get guest service requests raised via QR portal or front desk, completion rate, and pending tickets.",
  parameters: {
    type: "object",
    properties: {
      dateRangeQuery: {
        type: "string",
        description: "Date range (e.g. 'today', 'this month')",
        default: "today",
      },
    },
  },
  sensitivity: "internal",
  requiredPermission: "REPORT_GUEST_SERVICES",
  execute: async (params, context: AIExecutionContext) => {
    const dates = parseNaturalLanguageDateRange(params.dateRangeQuery || "today", context.timezone);
    const supabase = await createClient();
    const data = await getGuestServiceReport(supabase, context.propertyId, {
      preset: dates.preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });

    return {
      property: context.propertyName,
      period: `${dates.startDate} to ${dates.endDate}`,
      totalRequests: data.summary.totalRequests.current,
      completed: data.summary.completedRequests,
      pending: data.summary.pendingRequests,
      completionRate: formatPercentage(data.summary.completionRate),
    };
  },
};

export const ALL_AI_TOOLS: AIToolDefinition[] = [
  getHotelOverviewTool,
  getOccupancyMetricsTool,
  getRoomStatusSummaryTool,
  getRevenueMetricsTool,
  getFolioSummaryTool,
  getReservationSummaryTool,
  getFrontDeskSummaryTool,
  getGuestSummaryTool,
  getRestaurantSummaryTool,
  getKitchenSummaryTool,
  getHousekeepingSummaryTool,
  getMaintenanceSummaryTool,
  getInventorySummaryTool,
  getSupplierSummaryTool,
  getStaffSummaryTool,
  getExpenseSummaryTool,
  getGuestServiceSummaryTool,
];
