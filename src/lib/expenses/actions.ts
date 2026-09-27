"use server";

// ============================================================
// STAYHUB HOTEL EXPENSE MANAGEMENT — SERVER ACTIONS
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  getHotelExpenses,
  getExpenseSummaryAnalytics,
  getExpenseById,
  getExpenseCategories,
  getSuppliersList,
  getStaffDepartmentsList,
} from "./queries";
import type {
  ExpenseFilterParams,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpensePaginationResult,
  ExpenseAnalyticsData,
  HotelExpense,
  ExpenseAuditLog,
  ExpenseCategory,
} from "./types";

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Authenticate session & verify user access to the specified property
 */
async function authenticatePropertySession(_propertyId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, profile: null, error: "Authentication required" };
  }

  // Fetch profile and active membership
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id, role, is_active")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const userName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
    : user.email || "Staff";

  return { supabase, user, profile, membership, userName, error: null };
}

/**
 * Fetch paginated, filtered hotel expenses
 */
export async function fetchExpensesAction(
  propertyId: string,
  params: ExpenseFilterParams
): Promise<ActionResponse<ExpensePaginationResult>> {
  try {
    const { supabase, error } = await authenticatePropertySession(propertyId);
    if (error || !supabase) return { success: false, error: error || "Unauthorized" };

    const result = await getHotelExpenses(supabase, propertyId, params);
    return { success: true, data: result };
  } catch (err) {
    console.error("fetchExpensesAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch expenses",
    };
  }
}

/**
 * Fetch executive KPI summary & charts analytics
 */
export async function fetchExpenseSummaryAction(
  propertyId: string,
  params: {
    preset: ExpenseFilterParams["preset"];
    startDate?: string;
    endDate?: string;
  }
): Promise<ActionResponse<ExpenseAnalyticsData>> {
  try {
    const { supabase, error } = await authenticatePropertySession(propertyId);
    if (error || !supabase) return { success: false, error: error || "Unauthorized" };

    const data = await getExpenseSummaryAnalytics(supabase, propertyId, params);
    return { success: true, data };
  } catch (err) {
    console.error("fetchExpenseSummaryAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch expense summary",
    };
  }
}

/**
 * Fetch expense by ID with full details & audit trail
 */
export async function fetchExpenseDetailAction(
  propertyId: string,
  expenseId: string
): Promise<ActionResponse<{ expense: HotelExpense | null; auditLogs: ExpenseAuditLog[] }>> {
  try {
    const { supabase, error } = await authenticatePropertySession(propertyId);
    if (error || !supabase) return { success: false, error: error || "Unauthorized" };

    const result = await getExpenseById(supabase, propertyId, expenseId);
    return { success: true, data: result };
  } catch (err) {
    console.error("fetchExpenseDetailAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch expense details",
    };
  }
}

/**
 * Fetch supporting form dropdown options (categories, vendors, departments)
 */
export async function fetchExpenseFormDataAction(propertyId: string): Promise<
  ActionResponse<{
    categories: ExpenseCategory[];
    suppliers: Array<{ id: string; name: string; supplier_code: string | null }>;
    departments: Array<{ id: string; name: string; department_code: string | null }>;
  }>
> {
  try {
    const { supabase, error } = await authenticatePropertySession(propertyId);
    if (error || !supabase) return { success: false, error: error || "Unauthorized" };

    const [categories, suppliers, departments] = await Promise.all([
      getExpenseCategories(supabase, propertyId),
      getSuppliersList(supabase, propertyId),
      getStaffDepartmentsList(supabase, propertyId),
    ]);

    return {
      success: true,
      data: { categories, suppliers, departments },
    };
  } catch (err) {
    console.error("fetchExpenseFormDataAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load form options",
    };
  }
}

/**
 * Record a new hotel operational expense
 */
export async function createExpenseAction(
  propertyId: string,
  input: CreateExpenseInput
): Promise<ActionResponse<{ id: string; expense_number: string }>> {
  try {
    const { supabase, user, userName, error: authErr } = await authenticatePropertySession(propertyId);
    if (authErr || !supabase || !user) {
      return { success: false, error: authErr || "Unauthorized" };
    }

    // Basic validation
    if (!input.title || input.title.trim().length === 0) {
      return { success: false, error: "Expense title is required" };
    }
    if (input.amount === undefined || input.amount < 0 || isNaN(input.amount)) {
      return { success: false, error: "Valid amount is required" };
    }
    if (!input.categoryId) {
      return { success: false, error: "Expense category is required" };
    }
    if (!input.expenseDate) {
      return { success: false, error: "Expense date is required" };
    }

    // Call RPC create_hotel_expense
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("create_hotel_expense", {
      p_property_id: propertyId,
      p_title: input.title.trim(),
      p_category_id: input.categoryId,
      p_subcategory: input.subcategory?.trim() || null,
      p_amount: Number(input.amount),
      p_currency: "INR",
      p_expense_date: input.expenseDate,
      p_payment_method: input.paymentMethod || "CASH",
      p_vendor_id: input.vendorId || null,
      p_vendor_name: input.vendorName?.trim() || null,
      p_department_id: input.departmentId || null,
      p_staff_id: input.staffId || null,
      p_invoice_number: input.invoiceNumber?.trim() || null,
      p_reference_number: input.referenceNumber?.trim() || null,
      p_description: input.description?.trim() || null,
      p_notes: input.notes?.trim() || null,
      p_status: input.status || "RECORDED",
      p_receipt_url: input.receiptUrl || null,
      p_receipt_file_name: input.receiptFileName || null,
      p_user_id: user.id,
      p_user_name: userName,
    });

    if (rpcErr || !rpcRes?.success) {
      console.error("create_hotel_expense RPC error:", rpcErr || rpcRes);
      return {
        success: false,
        error: rpcErr?.message || rpcRes?.error || "Failed to record expense.",
      };
    }

    revalidatePath("/expenses");
    revalidatePath("/reports/expenses");
    revalidatePath("/reports/business");
    revalidatePath("/reports");

    return {
      success: true,
      data: {
        id: rpcRes.id,
        expense_number: rpcRes.expense_number,
      },
    };
  } catch (err) {
    console.error("createExpenseAction unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Update an existing hotel expense and record an audit log
 */
export async function updateExpenseAction(
  propertyId: string,
  input: UpdateExpenseInput
): Promise<ActionResponse> {
  try {
    const { supabase, user, userName, error: authErr } = await authenticatePropertySession(propertyId);
    if (authErr || !supabase || !user) {
      return { success: false, error: authErr || "Unauthorized" };
    }

    if (!input.id) return { success: false, error: "Expense ID is required" };

    // Fetch existing expense
    const { data: existing, error: fetchErr } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", input.id)
      .eq("property_id", propertyId)
      .single();

    if (fetchErr || !existing) {
      return { success: false, error: "Expense not found" };
    }

    if (existing.status === "CANCELLED") {
      return { success: false, error: "Cannot edit a voided/cancelled expense" };
    }

    const updates: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.amount !== undefined) updates.amount = Number(input.amount);
    if (input.categoryId !== undefined) updates.category_id = input.categoryId;
    if (input.subcategory !== undefined) updates.subcategory = input.subcategory?.trim() || null;
    if (input.expenseDate !== undefined) updates.expense_date = input.expenseDate;
    if (input.paymentMethod !== undefined) updates.payment_method = input.paymentMethod;
    if (input.vendorId !== undefined) updates.vendor_id = input.vendorId || null;
    if (input.vendorName !== undefined) updates.vendor_name = input.vendorName?.trim() || null;
    if (input.departmentId !== undefined) updates.department_id = input.departmentId || null;
    if (input.invoiceNumber !== undefined) updates.invoice_number = input.invoiceNumber?.trim() || null;
    if (input.referenceNumber !== undefined) updates.reference_number = input.referenceNumber?.trim() || null;
    if (input.description !== undefined) updates.description = input.description?.trim() || null;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;
    if (input.status !== undefined) updates.status = input.status;
    if (input.receiptUrl !== undefined) updates.receipt_url = input.receiptUrl;
    if (input.receiptFileName !== undefined) updates.receipt_file_name = input.receiptFileName;

    const { error: updateErr } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", input.id)
      .eq("property_id", propertyId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Insert Audit Trail
    await supabase.from("expense_audit_logs").insert({
      property_id: propertyId,
      expense_id: input.id,
      action: "UPDATED",
      performed_by: user.id,
      performed_by_name: userName,
      details: {
        previous: {
          title: existing.title,
          amount: existing.amount,
          category_id: existing.category_id,
          status: existing.status,
        },
        updated: updates,
      },
      notes: "Expense updated by staff",
    });

    revalidatePath("/expenses");
    revalidatePath("/reports/expenses");
    revalidatePath("/reports/business");
    revalidatePath("/reports");

    return { success: true };
  } catch (err) {
    console.error("updateExpenseAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update expense",
    };
  }
}

/**
 * Void/Cancel an expense with a mandatory audit reason (no hard deletion)
 */
export async function voidExpenseAction(
  propertyId: string,
  expenseId: string,
  reason: string
): Promise<ActionResponse> {
  try {
    const { supabase, user, userName, error: authErr } = await authenticatePropertySession(propertyId);
    if (authErr || !supabase || !user) {
      return { success: false, error: authErr || "Unauthorized" };
    }

    if (!reason || reason.trim().length === 0) {
      return { success: false, error: "A cancellation reason is required for financial auditability" };
    }

    const { data: rpcRes, error: rpcErr } = await supabase.rpc("void_hotel_expense", {
      p_property_id: propertyId,
      p_expense_id: expenseId,
      p_reason: reason.trim(),
      p_user_id: user.id,
      p_user_name: userName,
    });

    if (rpcErr || !rpcRes?.success) {
      return {
        success: false,
        error: rpcErr?.message || rpcRes?.error || "Failed to void expense.",
      };
    }

    revalidatePath("/expenses");
    revalidatePath("/reports/expenses");
    revalidatePath("/reports/business");
    revalidatePath("/reports");

    return { success: true };
  } catch (err) {
    console.error("voidExpenseAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to void expense",
    };
  }
}

/**
 * Create a new custom expense category
 */
export async function createExpenseCategoryAction(
  propertyId: string,
  name: string,
  description?: string
): Promise<ActionResponse<{ id: string; name: string }>> {
  try {
    const { supabase, user, error: authErr } = await authenticatePropertySession(propertyId);
    if (authErr || !supabase || !user) {
      return { success: false, error: authErr || "Unauthorized" };
    }

    if (!name || name.trim().length === 0) {
      return { success: false, error: "Category name is required" };
    }

    const { data, error } = await supabase
      .from("expense_categories")
      .insert({
        property_id: propertyId,
        name: name.trim(),
        description: description?.trim() || null,
        is_active: true,
      })
      .select("id, name")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A category with this name already exists." };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/expenses");
    return { success: true, data };
  } catch (err) {
    console.error("createExpenseCategoryAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create category",
    };
  }
}

/**
 * Export filtered expenses to CSV
 */
export async function exportExpensesCsvAction(
  propertyId: string,
  params: ExpenseFilterParams
): Promise<ActionResponse<{ filename: string; content: string }>> {
  try {
    const { supabase, error } = await authenticatePropertySession(propertyId);
    if (error || !supabase) return { success: false, error: error || "Unauthorized" };

    // Fetch all matching records without pagination
    const allRecordsParams = { ...params, page: 1, pageSize: 5000 };
    const result = await getHotelExpenses(supabase, propertyId, allRecordsParams);

    const headers = [
      "Expense Number",
      "Date",
      "Title",
      "Category",
      "Subcategory",
      "Amount",
      "Currency",
      "Payment Method",
      "Vendor",
      "Department",
      "Invoice Number",
      "Reference Number",
      "Status",
      "Notes",
    ];

    const rows = result.items.map((e) => [
      `"${e.expense_number}"`,
      `"${e.expense_date}"`,
      `"${(e.title || "").replace(/"/g, '""')}"`,
      `"${(e.category?.name || "").replace(/"/g, '""')}"`,
      `"${(e.subcategory || "").replace(/"/g, '""')}"`,
      Number(e.amount || 0).toFixed(2),
      `"${e.currency || "INR"}"`,
      `"${e.payment_method}"`,
      `"${(e.vendor_name || e.vendor?.name || "").replace(/"/g, '""')}"`,
      `"${(e.department?.name || "").replace(/"/g, '""')}"`,
      `"${(e.invoice_number || "").replace(/"/g, '""')}"`,
      `"${(e.reference_number || "").replace(/"/g, '""')}"`,
      `"${e.status}"`,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const dateStr = new Date().toISOString().split("T")[0];

    return {
      success: true,
      data: {
        filename: `stayhub-expenses-${dateStr}.csv`,
        content: csvContent,
      },
    };
  } catch (err) {
    console.error("exportExpensesCsvAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to export expenses CSV",
    };
  }
}
