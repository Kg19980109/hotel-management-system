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
  UnifiedBill,
  UnifiedBillingKPIs,
  UnifiedBillSource,
  UnifiedBillCategory,
  UnifiedBillPaymentStatus,
  UnifiedBillItem,
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

// ============================================================
// UNIFIED BILLS & ORDERS AGGREGATOR (POS, QR, FOLIOS, INVOICES)
// ============================================================

export interface UnifiedBillFilters {
  source?: UnifiedBillSource | "ALL";
  category?: UnifiedBillCategory | "ALL";
  paymentStatus?: UnifiedBillPaymentStatus | "ALL";
  paymentMethod?: string | "ALL";
  dateRange?: "TODAY" | "YESTERDAY" | "THIS_WEEK" | "THIS_MONTH" | "ALL";
  search?: string;
}

/**
 * Master Aggregator: Fetch all bills, POS orders, QR orders, Folio charges, and Invoices
 */
export async function getUnifiedBills(
  propertyId: string,
  _filters?: UnifiedBillFilters
): Promise<UnifiedBill[]> {
  const supabase = createClient();

  const [ordersRes, chargesRes, invoicesRes] = await Promise.all([
    supabase
      .from("restaurant_orders")
      .select(`
        id, order_number, order_type, status, total_amount, subtotal, tax_amount, discount_amount, service_charge_amount,
        created_at, completed_at, notes,
        restaurants ( name ),
        restaurant_tables ( table_number ),
        profiles:created_by ( full_name ),
        guests ( first_name, last_name, phone, email ),
        rooms:room_id ( room_number ),
        restaurant_order_items ( id, item_name, quantity, unit_price, line_total, notes )
      `)
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false }),

    supabase
      .from("folio_charges")
      .select(`
        id, charge_type, source_type, source_id, description, quantity, unit_price, total_amount, tax_amount, discount_amount, subtotal,
        charge_date, posted_at, voided_at, folio_id, stay_id,
        guest_folios (
          id, folio_number, status,
          guests ( first_name, last_name, phone, email ),
          stays ( room:rooms ( room_number ) )
        )
      `)
      .eq("property_id", propertyId)
      .order("posted_at", { ascending: false }),

    supabase
      .from("invoices")
      .select(`
        id, invoice_number, billing_name, billing_email, invoice_date, invoice_status,
        subtotal, tax_amount, total_amount, balance_due, folio_id, created_at
      `)
      .eq("property_id", propertyId)
      .order("invoice_date", { ascending: false }),
  ]);

  const unifiedBills: UnifiedBill[] = [];
  const processedOrderIds = new Set<string>();

  // 1. Process restaurant orders (POS counter bills & QR orders)
  for (const ord of (ordersRes.data || [])) {
    processedOrderIds.add(ord.id);
    const isRoomService = ord.order_type === "ROOM_SERVICE";
    const notesStr = (ord.notes || "").toLowerCase();
    const isQr = isRoomService || notesStr.includes("qr") || notesStr.includes("guest");

    const source: UnifiedBillSource = isQr ? "QR_ORDER" : "POS_ORDER";
    const sourceLabel = isQr ? "Guest QR Order" : "POS Counter Bill";

    const rawItems = (ord.restaurant_order_items as unknown[]) || [];
    const items: UnifiedBillItem[] = rawItems.map((it: any) => ({
      id: it.id,
      name: it.item_name || "Food / Beverage Item",
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unit_price || 0),
      totalPrice: Number(it.line_total || it.unit_price * it.quantity || 0),
      notes: it.notes || null,
    }));

    // Detect category
    let category: UnifiedBillCategory = "FOOD_BEVERAGE";
    const allItemNames = items.map((i) => i.name.toLowerCase()).join(" ");
    if (allItemNames.includes("cab") || allItemNames.includes("transfer") || allItemNames.includes("airport") || allItemNames.includes("taxi")) {
      category = "TRANSPORT";
    } else if (allItemNames.includes("spa") || allItemNames.includes("massage") || allItemNames.includes("wellness") || allItemNames.includes("facial")) {
      category = "SPA_WELLNESS";
    } else if (allItemNames.includes("laundry") || allItemNames.includes("dry clean") || allItemNames.includes("iron") || allItemNames.includes("press")) {
      category = "LAUNDRY";
    } else if (allItemNames.includes("room") || allItemNames.includes("tariff") || allItemNames.includes("suite") || allItemNames.includes("night")) {
      category = "ROOM_TARIFF";
    }

    const categoryLabel =
      category === "FOOD_BEVERAGE" ? "Dining & Bar" :
      category === "TRANSPORT" ? "Transport & Cab" :
      category === "SPA_WELLNESS" ? "Spa & Wellness" :
      category === "LAUNDRY" ? "Laundry & Press" :
      category === "ROOM_TARIFF" ? "Room Accommodation" : "Hotel Service";

    // Determine payment status
    let paymentStatus: UnifiedBillPaymentStatus = "PENDING";
    if (ord.status === "COMPLETED") {
      paymentStatus = "PAID";
    } else if (ord.status === "CANCELLED") {
      paymentStatus = "VOID";
    } else if (ord.stay_id || (ord.rooms as any)?.room_number) {
      paymentStatus = "ROOM_CHARGED";
    }

    let paymentMethod = "CASH";
    if (notesStr.includes("upi")) paymentMethod = "UPI";
    else if (notesStr.includes("card")) paymentMethod = "CARD";
    else if (paymentStatus === "ROOM_CHARGED") paymentMethod = "ROOM_CHARGE";

    const guestObj = ord.guests as any;
    const roomObj = ord.rooms as any;
    const tableObj = ord.restaurant_tables as any;
    const restObj = ord.restaurants as any;
    const profileObj = ord.profiles as any;

    const guestName = guestObj
      ? `${guestObj.first_name || ""} ${guestObj.last_name || ""}`.trim()
      : isQr && roomObj?.room_number
      ? `Guest (Room ${roomObj.room_number})`
      : "Counter Walk-in Customer";

    const roomNumber = roomObj?.room_number || null;
    const tableNumber = tableObj?.table_number || null;

    let title = `${ord.order_number}`;
    if (items.length > 0) {
      title += ` • ${items.slice(0, 2).map((i) => `${i.quantity}x ${i.name}`).join(", ")}${items.length > 2 ? ` +${items.length - 2} more` : ""}`;
    }

    unifiedBills.push({
      id: ord.id,
      billNumber: ord.order_number,
      source,
      sourceLabel,
      category,
      categoryLabel,
      title,
      description: ord.notes || undefined,
      guestName: guestName || "Walk-in Guest",
      guestPhone: guestObj?.phone || null,
      guestEmail: guestObj?.email || null,
      roomNumber,
      tableNumber,
      outletName: restObj?.name || "Hotel Restaurant & POS Terminal",
      cashierOrStaff: profileObj?.full_name || (isQr ? "Guest Self-Order (QR Portal)" : "POS Terminal Staff"),
      items,
      itemCount: items.reduce((acc, i) => acc + i.quantity, 0) || 1,
      subtotal: Number(ord.subtotal || 0),
      taxAmount: Number(ord.tax_amount || 0),
      discountAmount: Number(ord.discount_amount || 0),
      serviceChargeAmount: Number(ord.service_charge_amount || 0),
      totalAmount: Number(ord.total_amount || 0),
      currency: "INR",
      paymentStatus,
      paymentMethod,
      createdAt: ord.created_at,
      paidAt: ord.completed_at || (paymentStatus === "PAID" ? ord.created_at : null),
      orderId: ord.id,
      stayId: ord.stay_id || null,
      notes: ord.notes || null,
      rawStatus: ord.status,
    });
  }

  // 2. Process non-order Folio charges
  for (const chg of (chargesRes.data || [])) {
    // Skip if charge was sourced from an order already processed above
    if (chg.source_type === "RESTAURANT_ORDER" && chg.source_id && processedOrderIds.has(chg.source_id)) {
      continue;
    }

    const isStayTariff = chg.charge_type === "ROOM" || chg.source_type === "STAY";
    const isService = chg.source_type === "GUEST_SERVICE_REQUEST";

    const source: UnifiedBillSource = isStayTariff ? "ROOM_STAY" : isService ? "QR_SERVICE" : "FOLIO_CHARGE";
    const sourceLabel = isStayTariff ? "Room Stay Tariff" : isService ? "Guest Service Charge" : "Folio Incidental Charge";

    const desc = (chg.description || "").toLowerCase();
    let category: UnifiedBillCategory = "SERVICES";
    if (isStayTariff) category = "ROOM_TARIFF";
    else if (desc.includes("spa") || desc.includes("massage") || desc.includes("wellness")) category = "SPA_WELLNESS";
    else if (desc.includes("laundry") || desc.includes("dry") || desc.includes("press")) category = "LAUNDRY";
    else if (desc.includes("cab") || desc.includes("taxi") || desc.includes("transport") || desc.includes("airport")) category = "TRANSPORT";
    else if (desc.includes("food") || desc.includes("dining") || desc.includes("snack") || desc.includes("minibar") || desc.includes("beverage")) category = "FOOD_BEVERAGE";

    const categoryLabel =
      category === "ROOM_TARIFF" ? "Room Accommodation" :
      category === "SPA_WELLNESS" ? "Spa & Wellness" :
      category === "LAUNDRY" ? "Laundry & Press" :
      category === "TRANSPORT" ? "Transport & Cab" :
      category === "FOOD_BEVERAGE" ? "Dining & Refreshment" : "Hotel Service";

    const folio = chg.guest_folios as any;
    const guest = folio?.guests as any;
    const stay = folio?.stays as any;
    const guestName = guest ? `${guest.first_name || ""} ${guest.last_name || ""}`.trim() : "In-House Guest";
    const roomNumber = stay?.room?.room_number || null;

    const isVoid = Boolean(chg.voided_at);
    const paymentStatus: UnifiedBillPaymentStatus = isVoid ? "VOID" : (folio?.status === "SETTLED" ? "PAID" : "ROOM_CHARGED");

    const billNumber = folio?.folio_number
      ? `${folio.folio_number}-${chg.id.slice(0, 4).toUpperCase()}`
      : `CHG-${chg.id.slice(0, 8).toUpperCase()}`;

    const item: UnifiedBillItem = {
      id: chg.id,
      name: chg.description || "Hotel Room Incidental Charge",
      quantity: Number(chg.quantity || 1),
      unitPrice: Number(chg.unit_price || chg.total_amount || 0),
      totalPrice: Number(chg.total_amount || 0),
    };

    unifiedBills.push({
      id: chg.id,
      billNumber,
      source,
      sourceLabel,
      category,
      categoryLabel,
      title: chg.description || "Room Incidental Charge",
      description: `Posted to Guest Folio: ${folio?.folio_number || "Active Room"}`,
      guestName: guestName || "In-House Guest",
      guestPhone: guest?.phone || null,
      guestEmail: guest?.email || null,
      roomNumber,
      outletName: "Front Desk & Concierge",
      cashierOrStaff: "Hotel Front Desk",
      items: [item],
      itemCount: item.quantity,
      subtotal: Number(chg.subtotal || chg.total_amount || 0),
      taxAmount: Number(chg.tax_amount || 0),
      discountAmount: Number(chg.discount_amount || 0),
      totalAmount: Number(chg.total_amount || 0),
      currency: "INR",
      paymentStatus,
      paymentMethod: "ROOM_CHARGE",
      createdAt: chg.posted_at || chg.charge_date || new Date().toISOString(),
      paidAt: paymentStatus === "PAID" ? chg.posted_at : null,
      folioId: chg.folio_id || null,
      stayId: chg.stay_id || null,
      notes: chg.description,
      rawStatus: isVoid ? "VOID" : folio?.status,
    });
  }

  // 3. Process Tax Invoices
  for (const inv of (invoicesRes.data || [])) {
    const isPaid = inv.invoice_status === "PAID";
    const isVoid = inv.invoice_status === "VOID";
    const paymentStatus: UnifiedBillPaymentStatus = isVoid ? "VOID" : isPaid ? "PAID" : "PENDING";

    unifiedBills.push({
      id: inv.id,
      billNumber: inv.invoice_number,
      source: "TAX_INVOICE",
      sourceLabel: "Tax Invoice",
      category: "GENERAL",
      categoryLabel: "Official Tax Invoice",
      title: `Tax Invoice #${inv.invoice_number}`,
      description: `Issued to ${inv.billing_name || "Guest"}`,
      guestName: inv.billing_name || "Guest",
      guestEmail: inv.billing_email || null,
      outletName: "Hotel Finance & Accounts",
      cashierOrStaff: "Finance Department",
      items: [
        {
          name: `Finalized Tax Invoice - ${inv.invoice_number}`,
          quantity: 1,
          unitPrice: Number(inv.subtotal || inv.total_amount),
          totalPrice: Number(inv.total_amount),
        },
      ],
      itemCount: 1,
      subtotal: Number(inv.subtotal || 0),
      taxAmount: Number(inv.tax_amount || 0),
      discountAmount: 0,
      totalAmount: Number(inv.total_amount || 0),
      currency: "INR",
      paymentStatus,
      paymentMethod: isPaid ? "COMPLETED_SETTLEMENT" : "UNPAID_INVOICE",
      createdAt: inv.created_at || `${inv.invoice_date}T00:00:00.000Z`,
      paidAt: isPaid ? inv.created_at : null,
      invoiceId: inv.id,
      folioId: inv.folio_id || null,
      rawStatus: inv.invoice_status,
    });
  }

  // Sort unified bills chronologically descending
  unifiedBills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return unifiedBills;
}

/**
 * Calculate extended KPIs across all bill sources
 */
export async function getUnifiedBillingKPIs(
  propertyId: string,
  unifiedBills: UnifiedBill[]
): Promise<UnifiedBillingKPIs> {
  const baseKpis = await getBillingKPIs(propertyId);

  let totalBilledAmount = 0;
  let posSalesTotal = 0;
  let posOrdersCount = 0;
  let qrOrdersTotal = 0;
  let qrOrdersCount = 0;
  let folioChargesTotal = 0;
  let folioChargesCount = 0;
  let invoicesTotal = 0;
  let invoicesCount = 0;

  for (const b of unifiedBills) {
    if (b.paymentStatus !== "VOID") {
      totalBilledAmount += b.totalAmount;
    }

    if (b.source === "POS_ORDER") {
      posOrdersCount++;
      if (b.paymentStatus !== "VOID") posSalesTotal += b.totalAmount;
    } else if (b.source === "QR_ORDER" || b.source === "QR_SERVICE") {
      qrOrdersCount++;
      if (b.paymentStatus !== "VOID") qrOrdersTotal += b.totalAmount;
    } else if (b.source === "FOLIO_CHARGE" || b.source === "ROOM_STAY") {
      folioChargesCount++;
      if (b.paymentStatus !== "VOID") folioChargesTotal += b.totalAmount;
    } else if (b.source === "TAX_INVOICE") {
      invoicesCount++;
      if (b.paymentStatus !== "VOID") invoicesTotal += b.totalAmount;
    }
  }

  return {
    ...baseKpis,
    totalBilledAmount,
    posSalesTotal,
    posOrdersCount,
    qrOrdersTotal,
    qrOrdersCount,
    folioChargesTotal,
    folioChargesCount,
    invoicesTotal,
    invoicesCount,
  };
}

