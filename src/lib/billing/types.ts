// ============================================================
// STAYHUB BILLING & FOLIO TYPES (Phase 16)
// ============================================================

export type FolioStatus = "OPEN" | "SETTLED" | "CLOSED" | "VOID";

export type ChargeType =
  | "ROOM"
  | "RESTAURANT"
  | "ROOM_SERVICE"
  | "SERVICE"
  | "TAX"
  | "DISCOUNT"
  | "ADJUSTMENT"
  | "OTHER";

export type ChargeSourceType =
  | "STAY"
  | "RESTAURANT_ORDER"
  | "GUEST_SERVICE_REQUEST"
  | "MANUAL"
  | "OTHER";

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "UPI"
  | "BANK_TRANSFER"
  | "ONLINE"
  | "WALLET"
  | "OTHER";

export type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "VOIDED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID";

export interface GuestFolio {
  id: string;
  property_id: string;
  stay_id: string;
  guest_id: string;
  reservation_id: string;
  folio_number: string;
  status: FolioStatus;
  currency: string;
  opened_at: string;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  guest?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  };
  stay?: {
    id: string;
    check_in_date: string;
    expected_check_out_date: string;
    actual_check_out_at?: string | null;
    status: string;
    room?: {
      id: string;
      room_number: string;
      room_type?: { name: string } | null;
    };
  };
}

export interface FolioCharge {
  id: string;
  property_id: string;
  folio_id: string;
  stay_id: string;
  guest_id: string;
  charge_type: ChargeType;
  source_type: ChargeSourceType;
  source_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  charge_date: string;
  posted_at: string;
  voided_at?: string | null;
  void_reason?: string | null;
  created_by?: string | null;
}

export interface FolioPayment {
  id: string;
  property_id: string;
  folio_id: string;
  stay_id: string;
  guest_id: string;
  payment_reference: string;
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paid_at: string;
  received_by?: string | null;
  notes?: string | null;
}

export interface FolioRefund {
  id: string;
  property_id: string;
  folio_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  refunded_at: string;
  processed_by?: string | null;
}

export interface Invoice {
  id: string;
  property_id: string;
  folio_id: string;
  stay_id: string;
  guest_id: string;
  invoice_number: string;
  invoice_status: InvoiceStatus;
  invoice_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  billing_name: string;
  billing_email?: string | null;
  billing_address?: string | null;
  issued_at: string;
  voided_at?: string | null;
  void_reason?: string | null;
  items?: InvoiceItem[];
  guest?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  };
  stay?: {
    id: string;
    room?: {
      room_number: string;
    };
  };
}

export interface InvoiceItem {
  id: string;
  property_id: string;
  invoice_id: string;
  folio_charge_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
}

export interface FolioEvent {
  id: string;
  property_id: string;
  folio_id: string;
  event_type: string;
  actor_type: "STAFF" | "SYSTEM" | "GUEST";
  actor_profile_id?: string | null;
  event_data: Record<string, unknown>;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface FolioBalance {
  folio_id: string;
  property_id: string;
  currency: string;
  status: FolioStatus;
  charges_subtotal: number;
  discounts_total: number;
  taxes_total: number;
  gross_charges: number;
  payments_total: number;
  refunds_total: number;
  net_payments: number;
  balance_due: number;
}

export interface BillingKPIs {
  todayRevenue: number;
  outstandingBalance: number;
  openFoliosCount: number;
  settledFoliosCount: number;
  todayPaymentsCount: number;
  todayRefundsTotal: number;
}

export interface GuestPortalFolioContext {
  has_folio: boolean;
  folio_number?: string;
  status?: FolioStatus;
  currency: string;
  charges_subtotal: number;
  taxes_total: number;
  gross_charges: number;
  net_payments: number;
  balance_due: number;
  charges: {
    id: string;
    charge_type: ChargeType;
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    charge_date: string;
    posted_at: string;
  }[];
  payments: {
    id: string;
    payment_reference: string;
    payment_method: PaymentMethod;
    amount: number;
    currency: string;
    status: PaymentStatus;
    paid_at: string;
  }[];
}
