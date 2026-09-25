// ============================================================
// STAYHUB TAX & FINANCIAL CALCULATION UTILITIES (Phase 16)
// ============================================================

export interface TaxComponent {
  name: string;
  rate: number; // e.g. 0.06 for 6% CGST
  amount: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  totalTax: number;
  taxBreakdown: TaxComponent[];
  totalAmount: number;
}

/**
 * Standard Hotel & Restaurant Tax Rates
 * Default: 12% (6% CGST + 6% SGST) for accommodation/services
 * Food & Beverage: 5% (2.5% CGST + 2.5% SGST)
 */
export const DEFAULT_TAX_RATES = {
  ROOM: 0.12,
  RESTAURANT: 0.05,
  ROOM_SERVICE: 0.05,
  SERVICE: 0.12,
  OTHER: 0.12,
};

/**
 * Calculate deterministic tax and line totals without floating point precision issues
 */
export function calculateFinancialTotals(params: {
  quantity: number;
  unitPrice: number;
  discountType?: "PERCENTAGE" | "FIXED";
  discountValue?: number;
  taxRate?: number;
}): TaxCalculationResult {
  const quantity = Math.max(0, params.quantity || 1);
  const unitPrice = Math.max(0, params.unitPrice || 0);
  const subtotal = Math.round(quantity * unitPrice * 100) / 100;

  let discountAmount = 0;
  if (params.discountValue && params.discountValue > 0) {
    if (params.discountType === "PERCENTAGE") {
      discountAmount = Math.round(subtotal * (params.discountValue / 100) * 100) / 100;
    } else {
      discountAmount = Math.round(params.discountValue * 100) / 100;
    }
    discountAmount = Math.min(subtotal, discountAmount);
  }

  const taxableAmount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  const taxRate = params.taxRate !== undefined ? params.taxRate : DEFAULT_TAX_RATES.ROOM;

  // Split into CGST and SGST for standard Indian GST reporting
  const halfTaxRate = taxRate / 2;
  const cgst = Math.round(taxableAmount * halfTaxRate * 100) / 100;
  const sgst = Math.round(taxableAmount * halfTaxRate * 100) / 100;
  const totalTax = Math.round((cgst + sgst) * 100) / 100;

  const totalAmount = Math.round((taxableAmount + totalTax) * 100) / 100;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    totalTax,
    taxBreakdown: [
      { name: "CGST", rate: halfTaxRate, amount: cgst },
      { name: "SGST", rate: halfTaxRate, amount: sgst },
    ],
    totalAmount,
  };
}

/**
 * Format currency with locale precision
 */
export function formatCurrency(amount: number, currency: string = "INR"): string {
  return `${currency} ${amount.toFixed(2)}`;
}
