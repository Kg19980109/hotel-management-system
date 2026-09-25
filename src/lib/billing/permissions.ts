// ============================================================
// STAYHUB BILLING PERMISSIONS (Phase 16)
// ============================================================

export type BillingPermission =
  | "BILLING_VIEW"
  | "BILLING_MANAGE"
  | "FOLIO_VIEW"
  | "FOLIO_MANAGE"
  | "FOLIO_POST_CHARGE"
  | "FOLIO_VOID_CHARGE"
  | "FOLIO_RECORD_PAYMENT"
  | "FOLIO_REFUND"
  | "INVOICE_VIEW"
  | "INVOICE_CREATE"
  | "INVOICE_VOID"
  | "DISCOUNT_APPLY"
  | "CHECKOUT_WITH_BALANCE_OVERRIDE";

export const ROLE_BILLING_PERMISSIONS: Record<string, BillingPermission[]> = {
  SUPER_ADMIN: [
    "BILLING_VIEW",
    "BILLING_MANAGE",
    "FOLIO_VIEW",
    "FOLIO_MANAGE",
    "FOLIO_POST_CHARGE",
    "FOLIO_VOID_CHARGE",
    "FOLIO_RECORD_PAYMENT",
    "FOLIO_REFUND",
    "INVOICE_VIEW",
    "INVOICE_CREATE",
    "INVOICE_VOID",
    "DISCOUNT_APPLY",
    "CHECKOUT_WITH_BALANCE_OVERRIDE",
  ],
  HOTEL_OWNER: [
    "BILLING_VIEW",
    "BILLING_MANAGE",
    "FOLIO_VIEW",
    "FOLIO_MANAGE",
    "FOLIO_POST_CHARGE",
    "FOLIO_VOID_CHARGE",
    "FOLIO_RECORD_PAYMENT",
    "FOLIO_REFUND",
    "INVOICE_VIEW",
    "INVOICE_CREATE",
    "INVOICE_VOID",
    "DISCOUNT_APPLY",
    "CHECKOUT_WITH_BALANCE_OVERRIDE",
  ],
  GENERAL_MANAGER: [
    "BILLING_VIEW",
    "BILLING_MANAGE",
    "FOLIO_VIEW",
    "FOLIO_MANAGE",
    "FOLIO_POST_CHARGE",
    "FOLIO_VOID_CHARGE",
    "FOLIO_RECORD_PAYMENT",
    "FOLIO_REFUND",
    "INVOICE_VIEW",
    "INVOICE_CREATE",
    "INVOICE_VOID",
    "DISCOUNT_APPLY",
    "CHECKOUT_WITH_BALANCE_OVERRIDE",
  ],
  ACCOUNTANT: [
    "BILLING_VIEW",
    "BILLING_MANAGE",
    "FOLIO_VIEW",
    "FOLIO_MANAGE",
    "FOLIO_POST_CHARGE",
    "FOLIO_VOID_CHARGE",
    "FOLIO_RECORD_PAYMENT",
    "FOLIO_REFUND",
    "INVOICE_VIEW",
    "INVOICE_CREATE",
    "INVOICE_VOID",
    "DISCOUNT_APPLY",
  ],
  FRONT_DESK: [
    "BILLING_VIEW",
    "FOLIO_VIEW",
    "FOLIO_POST_CHARGE",
    "FOLIO_RECORD_PAYMENT",
    "INVOICE_VIEW",
    "INVOICE_CREATE",
    "CHECKOUT_WITH_BALANCE_OVERRIDE",
  ],
  RECEPTIONIST: [
    "BILLING_VIEW",
    "FOLIO_VIEW",
    "FOLIO_POST_CHARGE",
    "FOLIO_RECORD_PAYMENT",
    "INVOICE_VIEW",
    "INVOICE_CREATE",
  ],
  HOUSEKEEPING: [],
  MAINTENANCE: [],
  RESTAURANT_STAFF: [],
  KITCHEN_STAFF: [],
};

export function hasBillingPermission(
  roleCode?: string | null,
  permission?: BillingPermission
): boolean {
  if (!roleCode || !permission) return false;
  const permissions = ROLE_BILLING_PERMISSIONS[roleCode.toUpperCase()] || [];
  return permissions.includes(permission);
}
