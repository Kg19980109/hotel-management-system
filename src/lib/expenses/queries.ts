// ============================================================
// STAYHUB HOTEL EXPENSE MANAGEMENT — DATABASE QUERIES
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  HotelExpense,
  ExpenseCategory,
  ExpenseFilterParams,
  ExpenseAnalyticsData,
  ExpensePaginationResult,
  ExpenseDatePreset,
  CategoryExpenseBreakdown,
  DepartmentExpenseBreakdown,
  VendorExpenseBreakdown,
  ExpenseDailyTrend,
  ExpenseAuditLog,
} from "./types";

/**
 * Calculates start and end dates based on standard presets in property timezone
 */
export function getExpenseDateRange(
  preset: ExpenseDatePreset,
  startDate?: string,
  endDate?: string
): {
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
} {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  if (preset === "CUSTOM" && startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
    const prevE = new Date(s.getTime() - 86400000);
    const prevS = new Date(prevE.getTime() - (diffDays - 1) * 86400000);

    return {
      start: startDate,
      end: endDate,
      previousStart: prevS.toISOString().split("T")[0],
      previousEnd: prevE.toISOString().split("T")[0],
    };
  }

  if (preset === "TODAY") {
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
    return {
      start: todayStr,
      end: todayStr,
      previousStart: yesterday,
      previousEnd: yesterday,
    };
  }

  if (preset === "YESTERDAY") {
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
    const dayBefore = new Date(now.getTime() - 2 * 86400000).toISOString().split("T")[0];
    return {
      start: yesterday,
      end: yesterday,
      previousStart: dayBefore,
      previousEnd: dayBefore,
    };
  }

  if (preset === "THIS_WEEK") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const startStr = monday.toISOString().split("T")[0];

    const prevMon = new Date(monday.getTime() - 7 * 86400000);
    const prevSun = new Date(monday.getTime() - 86400000);

    return {
      start: startStr,
      end: todayStr,
      previousStart: prevMon.toISOString().split("T")[0],
      previousEnd: prevSun.toISOString().split("T")[0],
    };
  }

  if (preset === "LAST_MONTH") {
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstOfLastMonth = new Date(y, m - 1, 1);
    const lastOfLastMonth = new Date(y, m, 0);

    const firstOfTwoMonthsAgo = new Date(y, m - 2, 1);
    const lastOfTwoMonthsAgo = new Date(y, m - 1, 0);

    return {
      start: firstOfLastMonth.toISOString().split("T")[0],
      end: lastOfLastMonth.toISOString().split("T")[0],
      previousStart: firstOfTwoMonthsAgo.toISOString().split("T")[0],
      previousEnd: lastOfTwoMonthsAgo.toISOString().split("T")[0],
    };
  }

  if (preset === "THIS_QUARTER") {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
    const prevQuarterStart = new Date(now.getFullYear(), quarterMonth - 3, 1);
    const prevQuarterEnd = new Date(now.getFullYear(), quarterMonth, 0);

    return {
      start: quarterStart.toISOString().split("T")[0],
      end: todayStr,
      previousStart: prevQuarterStart.toISOString().split("T")[0],
      previousEnd: prevQuarterEnd.toISOString().split("T")[0],
    };
  }

  if (preset === "THIS_YEAR") {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31);

    return {
      start: yearStart.toISOString().split("T")[0],
      end: todayStr,
      previousStart: prevYearStart.toISOString().split("T")[0],
      previousEnd: prevYearEnd.toISOString().split("T")[0],
    };
  }

  // Default: THIS_MONTH
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startStr = firstOfMonth.toISOString().split("T")[0];

  const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  return {
    start: startStr,
    end: todayStr,
    previousStart: firstOfPrevMonth.toISOString().split("T")[0],
    previousEnd: lastOfPrevMonth.toISOString().split("T")[0],
  };
}

/**
 * Fetch paginated & filtered expenses with full relational joins
 */
export async function getHotelExpenses(
  supabase: SupabaseClient,
  propertyId: string,
  params: ExpenseFilterParams
): Promise<ExpensePaginationResult> {
  const { start, end } = getExpenseDateRange(params.preset, params.startDate, params.endDate);
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize || 20));
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("expenses")
    .select(
      `
      id,
      property_id,
      expense_number,
      title,
      category_id,
      subcategory,
      amount,
      currency,
      expense_date,
      payment_method,
      vendor_id,
      vendor_name,
      department_id,
      staff_id,
      invoice_number,
      reference_number,
      description,
      notes,
      status,
      receipt_url,
      receipt_file_name,
      created_by,
      updated_by,
      created_at,
      updated_at,
      category:expense_categories(id, name),
      vendor:suppliers(id, name, supplier_code),
      department:staff_departments(id, name, department_code),
      staff:staff_members(id, first_name, last_name, employee_code)
    `,
      { count: "exact" }
    )
    .eq("property_id", propertyId);

  // Date filters
  if (start) query = query.gte("expense_date", start);
  if (end) query = query.lte("expense_date", end);

  // Category filter
  if (params.categoryId && params.categoryId !== "ALL") {
    query = query.eq("category_id", params.categoryId);
  }

  // Vendor filter
  if (params.vendorId && params.vendorId !== "ALL") {
    query = query.eq("vendor_id", params.vendorId);
  }

  // Department filter
  if (params.departmentId && params.departmentId !== "ALL") {
    query = query.eq("department_id", params.departmentId);
  }

  // Payment method filter
  if (params.paymentMethod && params.paymentMethod !== "ALL") {
    query = query.eq("payment_method", params.paymentMethod);
  }

  // Status filter
  if (params.status && params.status !== "ALL") {
    query = query.eq("status", params.status);
  }

  // Min / Max amount
  if (params.minAmount !== undefined && params.minAmount > 0) {
    query = query.gte("amount", params.minAmount);
  }
  if (params.maxAmount !== undefined && params.maxAmount > 0) {
    query = query.lte("amount", params.maxAmount);
  }

  // Search filter
  if (params.searchQuery && params.searchQuery.trim().length > 0) {
    const q = params.searchQuery.trim();
    query = query.or(
      `title.ilike.%${q}%,expense_number.ilike.%${q}%,vendor_name.ilike.%${q}%,invoice_number.ilike.%${q}%,reference_number.ilike.%${q}%,description.ilike.%${q}%,notes.ilike.%${q}%`
    );
  }

  // Sorting
  const sortBy = params.sortBy || "expense_date";
  const sortAsc = params.sortOrder === "asc";
  query = query.order(sortBy, { ascending: sortAsc }).order("created_at", { ascending: false });

  // Pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error("Failed to query hotel expenses:", error);
    throw new Error(error.message);
  }

  const items: HotelExpense[] = (data || []).map((row) => ({
    id: row.id,
    property_id: row.property_id,
    expense_number: row.expense_number,
    title: row.title,
    category_id: row.category_id,
    category: Array.isArray(row.category) ? row.category[0] : row.category,
    subcategory: row.subcategory,
    amount: Number(row.amount || 0),
    currency: row.currency || "INR",
    expense_date: row.expense_date,
    payment_method: row.payment_method,
    vendor_id: row.vendor_id,
    vendor: Array.isArray(row.vendor) ? row.vendor[0] : row.vendor,
    vendor_name: row.vendor_name || (Array.isArray(row.vendor) ? (row.vendor[0] as { name?: string })?.name : (row.vendor as { name?: string })?.name) || null,
    department_id: row.department_id,
    department: Array.isArray(row.department) ? row.department[0] : row.department,
    staff_id: row.staff_id,
    staff: Array.isArray(row.staff) ? row.staff[0] : row.staff,
    invoice_number: row.invoice_number,
    reference_number: row.reference_number,
    description: row.description,
    notes: row.notes,
    status: row.status,
    receipt_url: row.receipt_url,
    receipt_file_name: row.receipt_file_name,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetch executive summary KPIs, category breakdown, vendor rankings, and trend analytics
 */
export async function getExpenseSummaryAnalytics(
  supabase: SupabaseClient,
  propertyId: string,
  params: {
    preset: ExpenseDatePreset;
    startDate?: string;
    endDate?: string;
  }
): Promise<ExpenseAnalyticsData> {
  const { start, end, previousStart, previousEnd } = getExpenseDateRange(
    params.preset,
    params.startDate,
    params.endDate
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const firstOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // 1. Current Period Expenses (excluding CANCELLED)
  const { data: currentExpenses, error: curErr } = await supabase
    .from("expenses")
    .select(
      `
      id,
      title,
      amount,
      currency,
      expense_date,
      payment_method,
      category_id,
      vendor_id,
      vendor_name,
      department_id,
      status,
      category:expense_categories(id, name),
      vendor:suppliers(id, name),
      department:staff_departments(id, name)
    `
    )
    .eq("property_id", propertyId)
    .gte("expense_date", start)
    .lte("expense_date", end)
    .neq("status", "CANCELLED")
    .order("amount", { ascending: false });

  if (curErr) {
    console.error("Error fetching expense summary analytics:", curErr);
    throw new Error(curErr.message);
  }

  // 2. Previous Period Expenses for comparison
  const { data: prevExpenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("property_id", propertyId)
    .gte("expense_date", previousStart)
    .lte("expense_date", previousEnd)
    .neq("status", "CANCELLED");

  // 3. Today's Expenses
  const { data: todayExpenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("property_id", propertyId)
    .eq("expense_date", todayStr)
    .neq("status", "CANCELLED");

  // 4. This Month's Expenses
  const { data: monthExpenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("property_id", propertyId)
    .gte("expense_date", firstOfMonthStr)
    .lte("expense_date", todayStr)
    .neq("status", "CANCELLED");

  const expList = currentExpenses || [];
  const totalExpenses = expList.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const prevTotal = (prevExpenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const todayTotal = (todayExpenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const monthTotal = (monthExpenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Calculate day count
  const startD = new Date(start);
  const endD = new Date(end);
  const daysInPeriod = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1);
  const averageDailyExpense = Number((totalExpenses / daysInPeriod).toFixed(2));

  // Percentage Change vs Previous Period
  let changePercentage = 0;
  if (prevTotal > 0) {
    changePercentage = Number((((totalExpenses - prevTotal) / prevTotal) * 100).toFixed(1));
  } else if (totalExpenses > 0) {
    changePercentage = 100;
  }

  // Category Breakdown Map
  const catMap = new Map<string, { name: string; amount: number; count: number }>();
  // Department Breakdown Map
  const deptMap = new Map<string, { name: string; amount: number; count: number }>();
  // Vendor Breakdown Map
  const vendorMap = new Map<string, { id: string | null; name: string; amount: number; count: number }>();
  // Daily Trend Map
  const dailyMap = new Map<string, { amount: number; count: number }>();

  expList.forEach((e) => {
    const amt = Number(e.amount || 0);

    // Category
    const cat = Array.isArray(e.category) ? e.category[0] : e.category;
    const catId = e.category_id || "uncategorized";
    const catName = cat?.name || "General Expenses";
    const cVal = catMap.get(catId) || { name: catName, amount: 0, count: 0 };
    cVal.amount += amt;
    cVal.count += 1;
    catMap.set(catId, cVal);

    // Department
    const dept = Array.isArray(e.department) ? e.department[0] : e.department;
    if (e.department_id && dept) {
      const dVal = deptMap.get(e.department_id) || { name: dept.name, amount: 0, count: 0 };
      dVal.amount += amt;
      dVal.count += 1;
      deptMap.set(e.department_id, dVal);
    }

    // Vendor
    const vend = Array.isArray(e.vendor) ? e.vendor[0] : e.vendor;
    const vName = e.vendor_name || vend?.name || "Direct / Miscellaneous";
    const vKey = e.vendor_id || vName;
    const vVal = vendorMap.get(vKey) || { id: e.vendor_id || null, name: vName, amount: 0, count: 0 };
    vVal.amount += amt;
    vVal.count += 1;
    vendorMap.set(vKey, vVal);

    // Daily Trend
    const dateKey = e.expense_date;
    const dayVal = dailyMap.get(dateKey) || { amount: 0, count: 0 };
    dayVal.amount += amt;
    dayVal.count += 1;
    dailyMap.set(dateKey, dayVal);
  });

  // Sort Category Breakdown
  const byCategory: CategoryExpenseBreakdown[] = Array.from(catMap.entries())
    .map(([categoryId, val]) => ({
      categoryId,
      categoryName: val.name,
      amount: Number(val.amount.toFixed(2)),
      count: val.count,
      percentage: totalExpenses > 0 ? Number(((val.amount / totalExpenses) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Top Category
  const topCategory = byCategory.length > 0 ? {
    name: byCategory[0].categoryName,
    amount: byCategory[0].amount,
    percentage: byCategory[0].percentage,
  } : null;

  // Sort Department Breakdown
  const byDepartment: DepartmentExpenseBreakdown[] = Array.from(deptMap.entries())
    .map(([departmentId, val]) => ({
      departmentId,
      departmentName: val.name,
      amount: Number(val.amount.toFixed(2)),
      count: val.count,
      percentage: totalExpenses > 0 ? Number(((val.amount / totalExpenses) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Sort Top Vendors
  const topVendors: VendorExpenseBreakdown[] = Array.from(vendorMap.values())
    .map((v) => ({
      vendorId: v.id,
      vendorName: v.name,
      amount: Number(v.amount.toFixed(2)),
      count: v.count,
      percentage: totalExpenses > 0 ? Number(((v.amount / totalExpenses) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Largest Single Expense
  let largestExpense: ExpenseAnalyticsData["summary"]["largestExpense"] = null;
  if (expList.length > 0) {
    const top = expList[0];
    const topCat = Array.isArray(top.category) ? top.category[0] : top.category;
    const topVend = Array.isArray(top.vendor) ? top.vendor[0] : top.vendor;

    largestExpense = {
      id: top.id,
      title: top.title,
      amount: Number(top.amount || 0),
      category: topCat?.name || "General",
      vendor: top.vendor_name || topVend?.name || "Direct",
      expenseDate: top.expense_date,
    };
  }

  // Daily Trends sorted chronologically
  const dailyTrends: ExpenseDailyTrend[] = Array.from(dailyMap.entries())
    .map(([date, val]) => ({
      date,
      amount: Number(val.amount.toFixed(2)),
      count: val.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top 5 largest expenses
  const largestExpenses: HotelExpense[] = expList.slice(0, 5).map((row) => ({
    id: row.id,
    property_id: propertyId,
    expense_number: (row as unknown as { expense_number?: string }).expense_number || "",
    title: row.title,
    category_id: row.category_id,
    category: Array.isArray(row.category) ? row.category[0] : row.category,
    amount: Number(row.amount || 0),
    currency: row.currency || "INR",
    expense_date: row.expense_date,
    payment_method: row.payment_method,
    vendor_id: row.vendor_id,
    vendor: Array.isArray(row.vendor) ? row.vendor[0] : row.vendor,
    vendor_name: row.vendor_name,
    department_id: row.department_id,
    department: Array.isArray(row.department) ? row.department[0] : row.department,
    status: row.status,
    created_at: row.expense_date,
    updated_at: row.expense_date,
  }));

  return {
    summary: {
      totalExpenses,
      thisMonthExpenses: monthTotal,
      todayExpenses: todayTotal,
      expenseCount: expList.length,
      averageDailyExpense,
      topCategory,
      largestExpense,
      previousPeriodTotal: prevTotal,
      changePercentage,
    },
    byCategory,
    byDepartment,
    topVendors,
    dailyTrends,
    largestExpenses,
  };
}

/**
 * Fetch expense by ID with full details & audit logs
 */
export async function getExpenseById(
  supabase: SupabaseClient,
  propertyId: string,
  expenseId: string
): Promise<{
  expense: HotelExpense | null;
  auditLogs: ExpenseAuditLog[];
}> {
  const { data: row, error } = await supabase
    .from("expenses")
    .select(
      `
      id,
      property_id,
      expense_number,
      title,
      category_id,
      subcategory,
      amount,
      currency,
      expense_date,
      payment_method,
      vendor_id,
      vendor_name,
      department_id,
      staff_id,
      invoice_number,
      reference_number,
      description,
      notes,
      status,
      receipt_url,
      receipt_file_name,
      created_by,
      updated_by,
      created_at,
      updated_at,
      category:expense_categories(id, name),
      vendor:suppliers(id, name, supplier_code, email, phone),
      department:staff_departments(id, name, department_code),
      staff:staff_members(id, first_name, last_name, employee_code)
    `
    )
    .eq("id", expenseId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (error || !row) {
    return { expense: null, auditLogs: [] };
  }

  const expense: HotelExpense = {
    id: row.id,
    property_id: row.property_id,
    expense_number: row.expense_number,
    title: row.title,
    category_id: row.category_id,
    category: Array.isArray(row.category) ? row.category[0] : row.category,
    subcategory: row.subcategory,
    amount: Number(row.amount || 0),
    currency: row.currency || "INR",
    expense_date: row.expense_date,
    payment_method: row.payment_method,
    vendor_id: row.vendor_id,
    vendor: Array.isArray(row.vendor) ? row.vendor[0] : row.vendor,
    vendor_name: row.vendor_name || (Array.isArray(row.vendor) ? (row.vendor[0] as { name?: string })?.name : (row.vendor as { name?: string })?.name) || null,
    department_id: row.department_id,
    department: Array.isArray(row.department) ? row.department[0] : row.department,
    staff_id: row.staff_id,
    staff: Array.isArray(row.staff) ? row.staff[0] : row.staff,
    invoice_number: row.invoice_number,
    reference_number: row.reference_number,
    description: row.description,
    notes: row.notes,
    status: row.status,
    receipt_url: row.receipt_url,
    receipt_file_name: row.receipt_file_name,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  // Fetch audit logs
  const { data: logs } = await supabase
    .from("expense_audit_logs")
    .select("*")
    .eq("expense_id", expenseId)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  const auditLogs: ExpenseAuditLog[] = (logs || []).map((l) => ({
    id: l.id,
    property_id: l.property_id,
    expense_id: l.expense_id,
    action: l.action,
    performed_by: l.performed_by,
    performed_by_name: l.performed_by_name,
    details: l.details,
    notes: l.notes,
    created_at: l.created_at,
  }));

  return { expense, auditLogs };
}

/**
 * Fetch all active categories for property
 */
export async function getExpenseCategories(
  supabase: SupabaseClient,
  propertyId: string
): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, property_id, name, description, is_active, created_at, updated_at")
    .eq("property_id", propertyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to query expense categories:", error);
    return [];
  }
  return data || [];
}

/**
 * Fetch suppliers/vendors for dropdown selection
 */
export async function getSuppliersList(
  supabase: SupabaseClient,
  propertyId: string
): Promise<Array<{ id: string; name: string; supplier_code: string | null }>> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, supplier_code")
    .eq("property_id", propertyId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to query suppliers:", error);
    return [];
  }
  return data || [];
}

/**
 * Fetch staff departments for dropdown selection
 */
export async function getStaffDepartmentsList(
  supabase: SupabaseClient,
  propertyId: string
): Promise<Array<{ id: string; name: string; department_code: string | null }>> {
  const { data, error } = await supabase
    .from("staff_departments")
    .select("id, name, department_code")
    .eq("property_id", propertyId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to query staff departments:", error);
    return [];
  }
  return data || [];
}
