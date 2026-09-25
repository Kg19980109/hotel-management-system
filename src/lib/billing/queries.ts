// ============================================================
// STAYHUB BILLING QUERIES (Phase 16)
// ============================================================

import { createClient } from "@/lib/supabase/client";
import { hashToken } from "@/lib/guest-portal/types";
import {
  GuestFolio,
  FolioCharge,
  FolioPayment,
  FolioRefund,
  Invoice,
  FolioEvent,
  FolioBalance,
  BillingKPIs,
  GuestPortalFolioContext,
} from "./types";

/**
 * Fetch real-time Billing & Financial KPIs for a property
 */
export async function getBillingKPIs(propertyId: string): Promise<BillingKPIs> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  // 1. Today's Revenue (Completed Payments today)
  const { data: todayPayments } = await supabase
    .from("folio_payments")
    .select("amount")
    .eq("property_id", propertyId)
    .eq("status", "COMPLETED")
    .gte("paid_at", `${today}T00:00:00.000Z`);

  const todayRevenue = (todayPayments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const todayPaymentsCount = (todayPayments || []).length;

  // 2. Today's Refunds
  const { data: todayRefunds } = await supabase
    .from("folio_refunds")
    .select("amount")
    .eq("property_id", propertyId)
    .eq("status", "COMPLETED")
    .gte("refunded_at", `${today}T00:00:00.000Z`);

  const todayRefundsTotal = (todayRefunds || []).reduce((acc, r) => acc + Number(r.amount || 0), 0);

  // 3. Open Folios & Outstanding Balance
  const { data: openFolios } = await supabase
    .from("guest_folios")
    .select("id, status")
    .eq("property_id", propertyId)
    .in("status", ["OPEN", "SETTLED"]);

  const openFoliosCount = (openFolios || []).filter((f) => f.status === "OPEN").length;
  const settledFoliosCount = (openFolios || []).filter((f) => f.status === "SETTLED").length;

  // Calculate gross charges and payments across property for open folios
  const { data: activeCharges } = await supabase
    .from("folio_charges")
    .select("total_amount")
    .eq("property_id", propertyId)
    .is("voided_at", null);

  const totalCharges = (activeCharges || []).reduce((acc, c) => acc + Number(c.total_amount || 0), 0);

  const { data: allPayments } = await supabase
    .from("folio_payments")
    .select("amount")
    .eq("property_id", propertyId)
    .in("status", ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"]);

  const totalPaid = (allPayments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const { data: allRefunds } = await supabase
    .from("folio_refunds")
    .select("amount")
    .eq("property_id", propertyId)
    .eq("status", "COMPLETED");

  const totalRefunded = (allRefunds || []).reduce((acc, r) => acc + Number(r.amount || 0), 0);

  const outstandingBalance = Math.max(0, totalCharges - (totalPaid - totalRefunded));

  return {
    todayRevenue,
    outstandingBalance,
    openFoliosCount,
    settledFoliosCount,
    todayPaymentsCount,
    todayRefundsTotal,
  };
}

/**
 * Fetch staff-facing list of property guest folios
 */
export async function getPropertyFolios(
  propertyId: string,
  filters?: {
    status?: string;
    search?: string;
  }
): Promise<GuestFolio[]> {
  const supabase = createClient();

  let query = supabase
    .from("guest_folios")
    .select(
      `
      id,
      property_id,
      stay_id,
      guest_id,
      reservation_id,
      folio_number,
      status,
      currency,
      opened_at,
      closed_at,
      created_at,
      updated_at,
      guest:guests(id, first_name, last_name, email, phone),
      stay:stays(
        id,
        check_in_date,
        expected_check_out_date,
        actual_check_out_at,
        status,
        room:rooms(id, room_number, room_type:room_types(name))
      )
    `
    )
    .eq("property_id", propertyId)
    .order("opened_at", { ascending: false });

  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("Error fetching property folios:", error);
    return [];
  }

  return data as unknown as GuestFolio[];
}

/**
 * Fetch detail of a specific folio (by propertyId and folioId)
 */
export async function getFolioDetail(
  propertyId: string,
  folioId: string
): Promise<GuestFolio | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("guest_folios")
    .select(
      `
      id,
      property_id,
      stay_id,
      guest_id,
      reservation_id,
      folio_number,
      status,
      currency,
      opened_at,
      closed_at,
      created_at,
      updated_at,
      guest:guests(id, first_name, last_name, email, phone),
      stay:stays(
        id,
        check_in_date,
        expected_check_out_date,
        actual_check_out_at,
        status,
        room:rooms(id, room_number, room_type:room_types(name))
      )
    `
    )
    .eq("property_id", propertyId)
    .eq("id", folioId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as GuestFolio;
}

/**
 * Fetch detail of a specific folio by ID (convenience wrapper for Server Components)
 */
export async function getFolioById(
  folioId: string,
  propertyId?: string
): Promise<GuestFolio | null> {
  const supabase = createClient();

  let query = supabase
    .from("guest_folios")
    .select(
      `
      id,
      property_id,
      stay_id,
      guest_id,
      reservation_id,
      folio_number,
      status,
      currency,
      opened_at,
      closed_at,
      created_at,
      updated_at,
      guest:guests(id, first_name, last_name, email, phone),
      stay:stays(
        id,
        check_in_date,
        expected_check_out_date,
        actual_check_out_at,
        status,
        room:rooms(id, room_number, room_type:room_types(name))
      )
    `
    )
    .eq("id", folioId);

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  const { data, error } = await query.single();
  if (error || !data) {
    return null;
  }

  return data as unknown as GuestFolio;
}

/**
 * Fetch charges for a folio (supports (folioId) or (propertyId, folioId))
 */
export async function getFolioCharges(
  arg1: string,
  arg2?: string
): Promise<FolioCharge[]> {
  const supabase = createClient();
  const propertyId = arg2 ? arg1 : undefined;
  const folioId = arg2 || arg1;

  let query = supabase
    .from("folio_charges")
    .select("*")
    .eq("folio_id", folioId)
    .order("posted_at", { ascending: true });

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data as FolioCharge[];
}

/**
 * Fetch payments for a folio (supports (folioId) or (propertyId, folioId))
 */
export async function getFolioPayments(
  arg1: string,
  arg2?: string
): Promise<FolioPayment[]> {
  const supabase = createClient();
  const propertyId = arg2 ? arg1 : undefined;
  const folioId = arg2 || arg1;

  let query = supabase
    .from("folio_payments")
    .select("*")
    .eq("folio_id", folioId)
    .order("paid_at", { ascending: true });

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data as FolioPayment[];
}

/**
 * Fetch refunds for a folio (supports (folioId) or (propertyId, folioId))
 */
export async function getFolioRefunds(
  arg1: string,
  arg2?: string
): Promise<FolioRefund[]> {
  const supabase = createClient();
  const propertyId = arg2 ? arg1 : undefined;
  const folioId = arg2 || arg1;

  let query = supabase
    .from("folio_refunds")
    .select("*")
    .eq("folio_id", folioId)
    .order("refunded_at", { ascending: true });

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data as FolioRefund[];
}

/**
 * Fetch timeline events for a folio (supports (folioId) or (propertyId, folioId))
 */
export async function getFolioEvents(
  arg1: string,
  arg2?: string
): Promise<FolioEvent[]> {
  const supabase = createClient();
  const propertyId = arg2 ? arg1 : undefined;
  const folioId = arg2 || arg1;

  let query = supabase
    .from("folio_events")
    .select(
      `
      id,
      property_id,
      folio_id,
      event_type,
      actor_type,
      actor_profile_id,
      event_data,
      created_at,
      actor:profiles(id, full_name, email)
    `
    )
    .eq("folio_id", folioId)
    .order("created_at", { ascending: true });

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data as unknown as FolioEvent[];
}

/**
 * Fetch authoritative folio balance from PostgreSQL RPC
 */
export async function getFolioBalanceQuery(
  propertyId: string,
  folioId: string
): Promise<FolioBalance | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_folio_balance", {
    p_folio_id: folioId,
    p_property_id: propertyId,
  });

  if (error || !data || !data.success) {
    return null;
  }

  return data as FolioBalance;
}

/**
 * Fetch list of invoices (for a property or globally in tenant scope)
 */
export async function getInvoices(filters?: {
  propertyId?: string;
  status?: string;
}): Promise<Invoice[]> {
  const supabase = createClient();

  let query = supabase
    .from("invoices")
    .select(
      `
      id,
      property_id,
      folio_id,
      stay_id,
      guest_id,
      invoice_number,
      invoice_status,
      invoice_date,
      due_date,
      currency,
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
      paid_amount,
      balance_due,
      billing_name,
      billing_email,
      billing_address,
      issued_at,
      voided_at,
      void_reason,
      guest:guests(id, first_name, last_name, email, phone),
      stay:stays(id, room:rooms(room_number))
    `
    )
    .order("issued_at", { ascending: false });

  if (filters?.propertyId) {
    query = query.eq("property_id", filters.propertyId);
  }
  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("invoice_status", filters.status);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data as unknown as Invoice[];
}

/**
 * Fetch list of invoices for a property
 */
export async function getPropertyInvoices(
  propertyId: string,
  filters?: {
    status?: string;
  }
): Promise<Invoice[]> {
  return getInvoices({ propertyId, ...filters });
}

/**
 * Fetch invoice detail with items (by propertyId and invoiceId)
 */
export async function getInvoiceDetail(
  propertyId: string,
  invoiceId: string
): Promise<Invoice | null> {
  return getInvoiceById(invoiceId, propertyId);
}

/**
 * Fetch invoice by ID (convenience wrapper for Server Components)
 */
export async function getInvoiceById(
  invoiceId: string,
  propertyId?: string
): Promise<Invoice | null> {
  const supabase = createClient();

  let query = supabase
    .from("invoices")
    .select(
      `
      id,
      property_id,
      folio_id,
      stay_id,
      guest_id,
      invoice_number,
      invoice_status,
      invoice_date,
      due_date,
      currency,
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
      paid_amount,
      balance_due,
      billing_name,
      billing_email,
      billing_address,
      issued_at,
      voided_at,
      void_reason,
      items:invoice_items(*),
      guest:guests(id, first_name, last_name, email, phone),
      stay:stays(id, room:rooms(room_number))
    `
    )
    .eq("id", invoiceId);

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  return data as unknown as Invoice;
}

/**
 * Fetch all payments
 */
export async function getPayments(filters?: {
  propertyId?: string;
  paymentMethod?: string;
  status?: string;
}): Promise<FolioPayment[]> {
  const supabase = createClient();

  let query = supabase
    .from("folio_payments")
    .select(
      `
      id,
      property_id,
      folio_id,
      stay_id,
      guest_id,
      payment_reference,
      payment_method,
      amount,
      currency,
      status,
      paid_at,
      notes
    `
    )
    .order("paid_at", { ascending: false });

  if (filters?.propertyId) {
    query = query.eq("property_id", filters.propertyId);
  }
  if (filters?.paymentMethod && filters.paymentMethod !== "ALL") {
    query = query.eq("payment_method", filters.paymentMethod);
  }
  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data as FolioPayment[];
}

/**
 * Fetch all payments for a property
 */
export async function getPropertyPayments(
  propertyId: string,
  filters?: {
    paymentMethod?: string;
    status?: string;
  }
): Promise<FolioPayment[]> {
  return getPayments({ propertyId, ...filters });
}

/**
 * Secure Guest Portal Query: Get Verified Guest's Folio
 */
export async function getGuestPortalFolio(
  rawSessionToken?: string
): Promise<GuestPortalFolioContext | null> {
  if (!rawSessionToken) {
    return null;
  }

  const supabase = createClient();
  const sessionTokenHash = hashToken(rawSessionToken);

  const { data, error } = await supabase.rpc("get_guest_folio", {
    p_session_token_hash: sessionTokenHash,
  });

  if (error || !data?.success) {
    return null;
  }

  return data as GuestPortalFolioContext;
}
