"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { hasBillingPermission, BillingPermission } from "./permissions";

interface AuthCheckResult {
  userId: string;
  roleCode: string;
}

async function checkStaffBillingAuth(
  propertyId: string,
  requiredPermission?: BillingPermission
): Promise<{ error?: string; user?: AuthCheckResult }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required. Please log in." };
  }

  const { data: membership } = await supabase
    .from("property_memberships")
    .select("role:roles(code), status")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership || !membership.role) {
    return { error: "Access denied: No active membership for this property." };
  }

  const roleCode = (membership.role as unknown as { code: string })?.code;

  if (requiredPermission && !hasBillingPermission(roleCode, requiredPermission)) {
    return {
      error: `Access denied. Your role (${roleCode}) lacks '${requiredPermission}' permission.`,
    };
  }

  return { user: { userId: user.id, roleCode } };
}

/**
 * Action: Get or Create Active Stay Folio
 */
export async function getOrCreateStayFolioAction(propertyId: string, stayId: string) {
  const authCheck = await checkStaffBillingAuth(propertyId, "FOLIO_VIEW");
  if (authCheck.error || !authCheck.user) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_or_create_stay_folio", {
    p_stay_id: stayId,
    p_property_id: propertyId,
    p_performed_by: authCheck.user.userId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to resolve stay folio.",
    };
  }

  revalidatePath(`/billing/folios`);
  revalidatePath(`/front-desk/stays/${stayId}`);
  return { success: true, folio: data.folio, created: data.created };
}

/**
 * Action: Get Stay Folio & Balance (for Front Desk Checkout Modal)
 */
export async function getStayFolioAction(stayId: string, propertyId: string) {
  const supabase = await createClient();
  const { data: folio } = await supabase
    .from("guest_folios")
    .select("id, status, currency")
    .eq("property_id", propertyId)
    .eq("stay_id", stayId)
    .in("status", ["OPEN", "SETTLED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!folio) {
    return { success: true, data: null };
  }

  const { data: balance } = await supabase.rpc("get_folio_balance", {
    p_folio_id: folio.id,
    p_property_id: propertyId,
  });

  return {
    success: true,
    data: {
      id: folio.id,
      status: folio.status,
      currency: folio.currency,
      balance_due: balance?.balance_due || 0,
    },
  };
}

/**
 * Action: Get Guest Folio for Guest Portal
 */
export async function getGuestFolioAction() {
  const { getActiveGuestSessionToken } = await import("@/lib/guest-portal/actions");
  const rawToken = await getActiveGuestSessionToken();
  if (!rawToken) {
    return { success: false, data: null };
  }

  const { getGuestPortalFolio } = await import("./queries");
  const folioContext = await getGuestPortalFolio(rawToken);
  return { success: true, data: folioContext };
}

/**
 * Action: Post Room Charges for Stay
 */
export async function postRoomChargesAction(propertyId: string, stayId: string) {
  const authCheck = await checkStaffBillingAuth(propertyId, "FOLIO_POST_CHARGE");
  if (authCheck.error || !authCheck.user) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_room_charges_for_stay", {
    p_stay_id: stayId,
    p_property_id: propertyId,
    p_performed_by: authCheck.user.userId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to post room charges.",
    };
  }

  revalidatePath(`/billing/folios`);
  revalidatePath(`/front-desk/stays/${stayId}`);
  return { success: true, charge: data.charge, alreadyPosted: data.already_posted };
}

/**
 * Action: Post Restaurant Order to Folio
 */
export async function postRestaurantOrderToFolioAction(
  propertyId: string,
  orderId: string,
  stayId: string
) {
  const authCheck = await checkStaffBillingAuth(propertyId, "FOLIO_POST_CHARGE");
  if (authCheck.error || !authCheck.user) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_restaurant_order_to_folio", {
    p_order_id: orderId,
    p_stay_id: stayId,
    p_property_id: propertyId,
    p_performed_by: authCheck.user.userId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to charge restaurant order to folio.",
    };
  }

  revalidatePath(`/billing/folios`);
  revalidatePath(`/restaurant/orders`);
  return { success: true, charge: data.charge, alreadyPosted: data.already_posted };
}

/**
 * Action: Post Manual Charge / Adjustment
 */
export async function postManualFolioChargeAction(params: {
  propertyId: string;
  folioId: string;
  chargeType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  discountAmount?: number;
}) {
  const authCheck = await checkStaffBillingAuth(params.propertyId, "FOLIO_POST_CHARGE");
  if (authCheck.error || !authCheck.user) {
    return { success: false, error: authCheck.error };
  }

  if (params.discountAmount && params.discountAmount > 0) {
    const discountCheck = hasBillingPermission(authCheck.user.roleCode, "DISCOUNT_APPLY");
    if (!discountCheck) {
      return { success: false, error: "Access denied: Discount permissions required." };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_manual_folio_charge", {
    p_folio_id: params.folioId,
    p_property_id: params.propertyId,
    p_charge_type: params.chargeType,
    p_description: params.description,
    p_quantity: params.quantity,
    p_unit_price: params.unitPrice,
    p_tax_amount: params.taxAmount || 0.00,
    p_discount_amount: params.discountAmount || 0.00,
    p_performed_by: authCheck.user.userId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to post manual charge.",
    };
  }

  revalidatePath(`/billing/folios/${params.folioId}`);
  revalidatePath(`/billing/folios`);
  return { success: true, charge: data.charge };
}

/**
 * Action: Void Folio Charge
 */
export async function voidFolioChargeAction(
  propertyId: string,
  chargeId: string,
  folioId: string,
  reason: string
) {
  const authCheck = await checkStaffBillingAuth(propertyId, "FOLIO_VOID_CHARGE");
  if (authCheck.error || !authCheck.user) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("void_folio_charge", {
    p_charge_id: chargeId,
    p_property_id: propertyId,
    p_reason: reason,
    p_performed_by: authCheck.user.userId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to void charge.",
    };
  }

  revalidatePath(`/billing/folios/${folioId}`);
  revalidatePath(`/billing/folios`);
  return { success: true };
}

/**
 * Action: Record Folio Payment
 */
export async function recordFolioPaymentAction(params: {
  propertyId: string;
  folioId: string;
  paymentMethod: string;
  amount: number;
  notes?: string;
}) {
  const authCheck = await checkStaffBillingAuth(params.propertyId, "FOLIO_RECORD_PAYMENT");
  if (authCheck.error || !authCheck.user) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_folio_payment", {
    p_folio_id: params.folioId,
    p_property_id: params.propertyId,
    p_payment_method: params.paymentMethod,
    p_amount: params.amount,
    p_notes: params.notes || null,
    p_performed_by: authCheck.user.userId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to record payment.",
    };
  }

  revalidatePath(`/billing/folios/${params.folioId}`);
  revalidatePath(`/billing/folios`);
  revalidatePath(`/billing/payments`);
  revalidatePath(`/billing`);
  return { success: true, payment: data.payment, balance: data.balance };
}

/**
 * Action: Refund Folio Payment
 */
export async function refundFolioPaymentAction(params: {
  propertyId: string;
  folioId: string;
  paymentId: string;
  amount: number;
  reason: string;
}) {
  const authCheck = await checkStaffBillingAuth(params.propertyId, "FOLIO_REFUND");
  if (authCheck.error || !authCheck.user) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("refund_folio_payment", {
    p_payment_id: params.paymentId,
    p_property_id: params.propertyId,
    p_amount: params.amount,
    p_reason: params.reason,
    p_performed_by: authCheck.user.userId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to process refund.",
    };
  }

  revalidatePath(`/billing/folios/${params.folioId}`);
  revalidatePath(`/billing/folios`);
  revalidatePath(`/billing/payments`);
  revalidatePath(`/billing`);
  return { success: true, refund: data.refund, paymentStatus: data.payment_status };
}

/**
 * Action: Generate Invoice
 */
export async function generateInvoiceAction(params: {
  propertyId: string;
  folioId: string;
  billingName?: string;
  billingEmail?: string;
  billingAddress?: string;
}) {
  const authCheck = await checkStaffBillingAuth(params.propertyId, "INVOICE_CREATE");
  if (authCheck.error || !authCheck.user) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_invoice", {
    p_folio_id: params.folioId,
    p_property_id: params.propertyId,
    p_billing_name: params.billingName || null,
    p_billing_email: params.billingEmail || null,
    p_billing_address: params.billingAddress || null,
    p_performed_by: authCheck.user.userId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to generate invoice.",
    };
  }

  revalidatePath(`/billing/folios/${params.folioId}`);
  revalidatePath(`/billing/invoices`);
  revalidatePath(`/billing`);
  return { success: true, invoice: data.invoice };
}

/**
 * Action: Void Invoice
 */
export async function voidInvoiceAction(
  propertyId: string,
  invoiceId: string,
  reason: string
) {
  const authCheck = await checkStaffBillingAuth(propertyId, "INVOICE_VOID");
  if (authCheck.error || !authCheck.user) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("void_invoice", {
    p_invoice_id: invoiceId,
    p_property_id: propertyId,
    p_reason: reason,
    p_performed_by: authCheck.user.userId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to void invoice.",
    };
  }

  revalidatePath(`/billing/invoices/${invoiceId}`);
  revalidatePath(`/billing/invoices`);
  return { success: true };
}
