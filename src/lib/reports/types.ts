// ============================================================
// STAYHUB REPORTING & ANALYTICS TYPES (Phase 19)
// ============================================================

export type DateRangePreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_QUARTER"
  | "THIS_YEAR"
  | "CUSTOM";

export type ComparisonPreset =
  | "PREVIOUS_PERIOD"
  | "PREVIOUS_YEAR"
  | "NONE"
  | "CUSTOM";

export interface DateRangeFilter {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  preset?: DateRangePreset;
}

export interface ComparisonMetric<T = number> {
  current: T;
  previous?: T;
  absDiff?: number;
  pctDiff?: number | null; // null if previous === 0 or undefined
  displayPctDiff?: string; // e.g. "+12.5%", "-5.0%", "N/A"
  trend?: "up" | "down" | "neutral";
}

export interface ReportFilterParams {
  property_id?: string;
  startDate: string;
  endDate: string;
  preset?: DateRangePreset;
  comparison?: ComparisonPreset;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  department_id?: string;
  room_type_id?: string;
  restaurant_id?: string;
  order_type?: string;
  booking_source?: string;
  charge_type?: string;
  payment_method?: string;
  category_id?: string;
  supplier_id?: string;
  staff_id?: string;
  status?: string;
}

// ------------------------------------------------------------
// Primary Dashboard Report
// ------------------------------------------------------------
export interface DashboardReportData {
  propertyContext: {
    propertyId: string;
    propertyName: string;
    currency: string;
    timezone: string;
    isMultiProperty?: boolean;
  };
  dateRange: {
    startDate: string;
    endDate: string;
    preset?: DateRangePreset;
    comparison?: ComparisonPreset;
  };
  kpis: {
    occupancy: ComparisonMetric<number>;
    adr: ComparisonMetric<number>;
    revPar: ComparisonMetric<number>;
    roomRevenue: ComparisonMetric<number>;
    totalRevenue: ComparisonMetric<number>;
    arrivals: ComparisonMetric<number>;
    departures: ComparisonMetric<number>;
    inHouseGuests: ComparisonMetric<number>;
    restaurantRevenue: ComparisonMetric<number>;
    outstandingFolios: ComparisonMetric<number>;
    lowStockItemsCount: number;
    housekeepingCompletionRate: ComparisonMetric<number>;
    maintenanceOpenOrders: ComparisonMetric<number>;
  };
  dailyTrends: Array<{
    date: string;
    occupancyRate: number;
    roomRevenue: number;
    restaurantRevenue: number;
    totalRevenue: number;
    arrivals: number;
    departures: number;
  }>;
  revenueBySource: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
}

// ------------------------------------------------------------
// Occupancy Report
// ------------------------------------------------------------
export interface OccupancyDailyRow {
  date: string;
  totalRooms: number;
  sellableRooms: number;
  occupiedRooms: number;
  outOfOrderRooms: number;
  outOfServiceRooms: number;
  occupancyRate: number;
  adr: number;
  revPar: number;
  roomRevenue: number;
}

export interface OccupancyReportData {
  summary: {
    totalRooms: number;
    sellableRoomNights: number;
    occupiedRoomNights: number;
    outOfOrderNights: number;
    outOfServiceNights: number;
    occupancyRate: ComparisonMetric<number>;
    adr: ComparisonMetric<number>;
    revPar: ComparisonMetric<number>;
  };
  dailyRows: OccupancyDailyRow[];
  weeklyTrend: Array<{
    week: string;
    occupancyRate: number;
    roomRevenue: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    occupancyRate: number;
    roomRevenue: number;
  }>;
}

// ------------------------------------------------------------
// Room Performance Report
// ------------------------------------------------------------
export interface RoomPerformanceRow {
  roomId: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  nightsAvailable: number;
  nightsSold: number;
  occupancyRate: number;
  adr: number;
  revPar: number;
  totalRevenue: number;
  maintenanceDowntimeNights: number;
}

export interface RoomTypePerformanceRow {
  roomTypeId: string;
  roomTypeName: string;
  totalRooms: number;
  nightsAvailable: number;
  nightsSold: number;
  occupancyRate: number;
  adr: number;
  revPar: number;
  totalRevenue: number;
}

export interface RoomPerformanceReportData {
  summary: {
    totalNightsAvailable: number;
    totalNightsSold: number;
    overallOccupancy: number;
    averageAdr: number;
    averageRevPar: number;
    totalRoomRevenue: number;
  };
  rooms: RoomPerformanceRow[];
  roomTypes: RoomTypePerformanceRow[];
  byFloor: Array<{
    floor: number;
    roomsCount: number;
    nightsSold: number;
    occupancyRate: number;
    totalRevenue: number;
  }>;
}

// ------------------------------------------------------------
// Reservation Report
// ------------------------------------------------------------
export interface ReservationReportData {
  summary: {
    totalReservations: ComparisonMetric<number>;
    confirmedCount: number;
    pendingCount: number;
    cancelledCount: number;
    noShowCount: number;
    completedCount: number;
    averageLengthOfStay: ComparisonMetric<number>;
    averageLeadTimeDays: ComparisonMetric<number>;
    cancellationRate: number;
  };
  bySource: Array<{
    source: string;
    count: number;
    percentage: number;
    revenue: number;
    alos: number;
  }>;
  byRoomType: Array<{
    roomTypeId: string;
    roomTypeName: string;
    bookingsCount: number;
    totalNights: number;
    revenue: number;
  }>;
  dailyTrend: Array<{
    date: string;
    newBookings: number;
    cancelledBookings: number;
  }>;
}

// ------------------------------------------------------------
// Front Desk / Arrivals & Departures
// ------------------------------------------------------------
export interface FrontDeskReportData {
  summary: {
    arrivalsCount: ComparisonMetric<number>;
    departuresCount: ComparisonMetric<number>;
    earlyCheckinsCount: number;
    lateCheckoutsCount: number;
    noShowsCount: number;
    currentInHouseGuests: number;
    currentInHouseRooms: number;
  };
  dailyTrend: Array<{
    date: string;
    arrivals: number;
    departures: number;
    noShows: number;
    inHouse: number;
  }>;
  arrivalsList: Array<{
    reservationId: string;
    guestName: string;
    roomType: string;
    roomNumber?: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    source: string;
  }>;
  departuresList: Array<{
    stayId: string;
    guestName: string;
    roomNumber: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    balance: number;
  }>;
}

// ------------------------------------------------------------
// Guest Analytics Report
// ------------------------------------------------------------
export interface GuestAnalyticsReportData {
  summary: {
    totalGuests: ComparisonMetric<number>;
    newGuests: number;
    returningGuests: number;
    returningGuestRate: number;
    inHouseGuests: number;
    arrivingGuests: number;
    departingGuests: number;
  };
  byNationality: Array<{
    country: string;
    guestCount: number;
    percentage: number;
  }>;
  byLanguage: Array<{
    language: string;
    guestCount: number;
    percentage: number;
  }>;
  byStatus: Array<{
    status: string;
    guestCount: number;
    percentage: number;
  }>;
  bySource: Array<{
    source: string;
    guestCount: number;
    percentage: number;
  }>;
}

// ------------------------------------------------------------
// Revenue Report
// ------------------------------------------------------------
export interface RevenueReportData {
  summary: {
    grossCharges: ComparisonMetric<number>;
    discounts: number;
    taxes: number;
    netRevenue: ComparisonMetric<number>;
    roomRevenue: ComparisonMetric<number>;
    restaurantRevenue: ComparisonMetric<number>;
    roomServiceRevenue: ComparisonMetric<number>;
    otherRevenue: number;
    totalPayments: ComparisonMetric<number>;
    totalRefunds: number;
    outstandingBalance: number;
  };
  byChargeType: Array<{
    chargeType: string;
    grossAmount: number;
    discountAmount: number;
    taxAmount: number;
    netAmount: number;
    percentage: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    amount: number;
    transactionCount: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    date: string;
    roomRevenue: number;
    restaurantRevenue: number;
    otherRevenue: number;
    totalNet: number;
    paymentsReceived: number;
  }>;
}

// ------------------------------------------------------------
// Financial & Ledger Report
// ------------------------------------------------------------
export interface FinancialReportData {
  summary: {
    totalFolios: number;
    openFoliosCount: number;
    settledFoliosCount: number;
    totalCharges: number;
    totalPayments: number;
    totalRefunds: number;
    outstandingFoliosBalance: number;
    invoicesCount: number;
    paidInvoicesCount: number;
    partiallyPaidInvoicesCount: number;
    unpaidInvoicesCount: number;
  };
  chargesByType: Array<{
    type: string;
    count: number;
    amount: number;
  }>;
  paymentsByMethod: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  invoicesByStatus: Array<{
    status: string;
    count: number;
    totalAmount: number;
    paidAmount: number;
  }>;
  recentLedgerEntries: Array<{
    date: string;
    folioNumber: string;
    guestName: string;
    description: string;
    type: string;
    amount: number;
    currency: string;
  }>;
}

// ------------------------------------------------------------
// Restaurant & F&B Report
// ------------------------------------------------------------
export interface RestaurantReportData {
  summary: {
    totalOrders: ComparisonMetric<number>;
    completedOrders: number;
    cancelledOrders: number;
    grossSales: ComparisonMetric<number>;
    dineInSales: number;
    roomServiceSales: number;
    takeawaySales: number;
    deliverySales: number;
    averageOrderValue: number;
  };
  byRestaurant: Array<{
    restaurantId: string;
    restaurantName: string;
    orderCount: number;
    grossSales: number;
  }>;
  byOrderType: Array<{
    orderType: string;
    orderCount: number;
    grossSales: number;
    percentage: number;
  }>;
  menuItemPerformance: Array<{
    itemId: string;
    itemName: string;
    categoryName: string;
    unitsSold: number;
    grossSales: number;
    orderCount: number;
  }>;
  categoryPerformance: Array<{
    categoryName: string;
    unitsSold: number;
    grossSales: number;
  }>;
  dailySales: Array<{
    date: string;
    orders: number;
    sales: number;
  }>;
}

// ------------------------------------------------------------
// Kitchen / KDS Report
// ------------------------------------------------------------
export interface KitchenReportData {
  summary: {
    totalTickets: ComparisonMetric<number>;
    completedTickets: number;
    averagePrepTimeMinutes: ComparisonMetric<number>;
    delayedTicketsCount: number;
    remakeTicketsCount: number;
    unroutedItemsCount: number;
  };
  byStation: Array<{
    stationId: string;
    stationName: string;
    ticketCount: number;
    completedCount: number;
    avgPrepTimeMinutes: number;
  }>;
  dailyTrend: Array<{
    date: string;
    ticketCount: number;
    avgPrepMinutes: number;
    delayedCount: number;
  }>;
}

// ------------------------------------------------------------
// Housekeeping Report
// ------------------------------------------------------------
export interface HousekeepingReportData {
  summary: {
    tasksCreated: ComparisonMetric<number>;
    tasksCompleted: number;
    pendingTasks: number;
    inspectionPassRate: ComparisonMetric<number>;
    inspectionFailureRate: number;
    averageCleaningTimeMinutes: number;
    roomsWaitingCleaning: number;
  };
  byHousekeeper: Array<{
    staffId: string;
    staffName: string;
    tasksAssigned: number;
    tasksCompleted: number;
    avgMinutes: number;
    inspectionsPassed: number;
  }>;
  byTaskType: Array<{
    taskType: string;
    count: number;
    completed: number;
    avgMinutes: number;
  }>;
  byPriority: Array<{
    priority: string;
    count: number;
    completed: number;
  }>;
  dailyTrend: Array<{
    date: string;
    created: number;
    completed: number;
    passRate: number;
  }>;
}

// ------------------------------------------------------------
// Maintenance Report
// ------------------------------------------------------------
export interface MaintenanceReportData {
  summary: {
    openWorkOrders: ComparisonMetric<number>;
    completedWorkOrders: number;
    averageResolutionTimeHours: number;
    preventiveTasksCount: number;
    overdueWorkOrdersCount: number;
    roomsOutOfServiceCount: number;
  };
  byCategory: Array<{
    category: string;
    total: number;
    completed: number;
    open: number;
  }>;
  byPriority: Array<{
    priority: string;
    count: number;
    avgHoursToResolve: number;
  }>;
  byStaff: Array<{
    staffId: string;
    staffName: string;
    assignedCount: number;
    completedCount: number;
    avgHours: number;
  }>;
  dailyTrend: Array<{
    date: string;
    created: number;
    resolved: number;
  }>;
}

// ------------------------------------------------------------
// Inventory & Movements Report
// ------------------------------------------------------------
export interface InventoryReportData {
  summary: {
    totalItems: number;
    lowStockItemsCount: number;
    outOfStockItemsCount: number;
    totalMovements: ComparisonMetric<number>;
    purchasesQuantity: number;
    consumptionQuantity: number;
    wasteQuantity: number;
    adjustmentsQuantity: number;
    transfersQuantity: number;
  };
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    itemCount: number;
    lowStockCount: number;
  }>;
  byMovementType: Array<{
    type: string;
    movementCount: number;
    totalQuantity: number;
  }>;
  topMovingItems: Array<{
    itemId: string;
    itemName: string;
    category: string;
    unit: string;
    inflow: number;
    outflow: number;
    currentStock: number;
  }>;
}

// ------------------------------------------------------------
// Inventory Consumption Report
// ------------------------------------------------------------
export interface InventoryConsumptionReportData {
  summary: {
    totalConsumptionQty: number;
    totalWasteQty: number;
    totalAdjustmentQty: number;
    restaurantConsumptionQty: number;
  };
  byItem: Array<{
    itemId: string;
    itemName: string;
    category: string;
    unit: string;
    consumedQty: number;
    wasteQty: number;
    netUsed: number;
  }>;
  byRestaurant: Array<{
    restaurantId: string;
    restaurantName: string;
    itemsConsumedCount: number;
    totalConsumedQty: number;
  }>;
}

// ------------------------------------------------------------
// Supplier Report
// ------------------------------------------------------------
export interface SupplierReportData {
  summary: {
    totalSuppliers: number;
    totalPurchaseOrders: ComparisonMetric<number>;
    totalPurchaseValue: ComparisonMetric<number>;
    totalReceivedValue: number;
    pendingOrdersCount: number;
  };
  bySupplier: Array<{
    supplierId: string;
    supplierName: string;
    categoryName: string;
    poCount: number;
    poValue: number;
    receivedValue: number;
    pendingCount: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
    value: number;
  }>;
}

// ------------------------------------------------------------
// Staff & Attendance Report
// ------------------------------------------------------------
export interface StaffReportData {
  summary: {
    activeStaffCount: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    onLeaveCount: number;
    overallAttendanceRate: ComparisonMetric<number>;
  };
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    totalStaff: number;
    present: number;
    absent: number;
    attendanceRate: number;
  }>;
  dailyAttendance: Array<{
    date: string;
    scheduled: number;
    present: number;
    absent: number;
    late: number;
    rate: number;
  }>;
  staffMembers: Array<{
    staffId: string;
    fullName: string;
    department: string;
    shiftsScheduled: number;
    daysPresent: number;
    daysLate: number;
    daysLeave: number;
    rate: number;
  }>;
}

// ------------------------------------------------------------
// Expense Report
// ------------------------------------------------------------
export interface ExpenseReportData {
  summary: {
    totalExpensesCount: ComparisonMetric<number>;
    totalSpend: ComparisonMetric<number>;
    pendingApprovalAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
    paidAmount: number;
  };
  byCategory: Array<{
    category: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  byDepartment: Array<{
    department: string;
    amount: number;
    percentage: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
}

// ------------------------------------------------------------
// Guest Service Request Report
// ------------------------------------------------------------
export interface GuestServiceReportData {
  summary: {
    totalRequests: ComparisonMetric<number>;
    completedRequests: number;
    pendingRequests: number;
    cancelledRequests: number;
    rejectedRequests: number;
    completionRate: number;
  };
  byCategory: Array<{
    category: string;
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
  }>;
  byDepartment: Array<{
    department: string;
    total: number;
    completed: number;
  }>;
  dailyTrend: Array<{
    date: string;
    requested: number;
    completed: number;
  }>;
}
