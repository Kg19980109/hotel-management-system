// ============================================================
// STAYHUB HOTEL EXPENSE MANAGEMENT — TYPES & INTERFACES
// ============================================================

export type ExpensePaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "UPI"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "CHEQUE"
  | "OTHER";

export type ExpenseStatus =
  | "DRAFT"
  | "RECORDED"
  | "PENDING"
  | "PAID"
  | "CANCELLED";

export interface ExpenseCategory {
  id: string;
  property_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HotelExpense {
  id: string;
  property_id: string;
  expense_number: string;
  title: string;
  category_id: string;
  category?: {
    id: string;
    name: string;
  } | null;
  subcategory?: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  payment_method: ExpensePaymentMethod;
  vendor_id?: string | null;
  vendor?: {
    id: string;
    name: string;
    supplier_code?: string;
  } | null;
  vendor_name?: string | null;
  department_id?: string | null;
  department?: {
    id: string;
    name: string;
    department_code?: string;
  } | null;
  staff_id?: string | null;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
  } | null;
  invoice_number?: string | null;
  reference_number?: string | null;
  description?: string | null;
  notes?: string | null;
  status: ExpenseStatus;
  receipt_url?: string | null;
  receipt_file_name?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseAuditLog {
  id: string;
  property_id: string;
  expense_id: string;
  action: "CREATED" | "UPDATED" | "VOIDED" | "STATUS_CHANGED";
  performed_by?: string | null;
  performed_by_name?: string | null;
  details?: Record<string, unknown> | null;
  notes?: string | null;
  created_at: string;
}

export type ExpenseDatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_QUARTER"
  | "THIS_YEAR"
  | "CUSTOM";

export interface ExpenseFilterParams {
  preset: ExpenseDatePreset;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  subcategory?: string;
  vendorId?: string;
  departmentId?: string;
  paymentMethod?: ExpensePaymentMethod | "ALL";
  status?: ExpenseStatus | "ALL";
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "expense_date" | "amount" | "created_at" | "title" | "vendor_name";
  sortOrder?: "asc" | "desc";
}

export interface ExpenseKpiSummary {
  totalExpenses: number;
  thisMonthExpenses: number;
  todayExpenses: number;
  expenseCount: number;
  averageDailyExpense: number;
  topCategory: {
    name: string;
    amount: number;
    percentage: number;
  } | null;
  largestExpense: {
    id: string;
    title: string;
    amount: number;
    category: string;
    vendor: string;
    expenseDate: string;
  } | null;
  previousPeriodTotal: number;
  changePercentage: number;
}

export interface CategoryExpenseBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface DepartmentExpenseBreakdown {
  departmentId: string;
  departmentName: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface VendorExpenseBreakdown {
  vendorId: string | null;
  vendorName: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface ExpenseDailyTrend {
  date: string;
  amount: number;
  count: number;
}

export interface ExpenseAnalyticsData {
  summary: ExpenseKpiSummary;
  byCategory: CategoryExpenseBreakdown[];
  byDepartment: DepartmentExpenseBreakdown[];
  topVendors: VendorExpenseBreakdown[];
  dailyTrends: ExpenseDailyTrend[];
  largestExpenses: HotelExpense[];
}

export interface ExpensePaginationResult {
  items: HotelExpense[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateExpenseInput {
  title: string;
  amount: number;
  expenseDate: string;
  categoryId: string;
  paymentMethod: ExpensePaymentMethod;
  subcategory?: string;
  vendorId?: string;
  vendorName?: string;
  departmentId?: string;
  staffId?: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  description?: string;
  notes?: string;
  status?: ExpenseStatus;
  receiptUrl?: string;
  receiptFileName?: string;
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {
  id: string;
}
